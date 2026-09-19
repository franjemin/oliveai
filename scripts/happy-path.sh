#!/usr/bin/env bash
set -euo pipefail

BASE="${BASE:-http://localhost:3000}"
VISIT="${VISIT:-00000000-0000-4000-8000-000000000005}"
SCRIPT_ID="${SCRIPT_ID:-audio-disclosure-v1}"

echo "== login"
TOKEN="$(curl -sS -X POST "$BASE/v1/auth/login" \
  -H 'content-type: application/json' \
  -d '{"email":"od@demo.olive.local","password":"demo"}' | tee /dev/stderr | python3 -c 'import json,sys; print(json.load(sys.stdin)["token"])')"

auth=(-H "authorization: Bearer $TOKEN" -H 'content-type: application/json')

echo
echo "== session bootstrap"
curl -sS "$BASE/v1/session" -H "authorization: Bearer $TOKEN" | python3 -m json.tool

echo
echo "== recording-gate (expect denied)"
curl -sS "$BASE/v1/visits/$VISIT/recording-gate" -H "authorization: Bearer $TOKEN" | python3 -m json.tool

echo
echo "== grant visit-scoped audio_capture consent"
curl -sS -X POST "$BASE/v1/visits/$VISIT/consent" "${auth[@]}" \
  -d "{\"type\":\"audio_capture\",\"granted\":true,\"disclosureScriptId\":\"$SCRIPT_ID\"}" | python3 -m json.tool

echo
echo "== recording-gate (expect allowed)"
curl -sS "$BASE/v1/visits/$VISIT/recording-gate" -H "authorization: Bearer $TOKEN" | python3 -m json.tool

echo
echo "== ingest audio"
curl -sS -X POST "$BASE/v1/visits/$VISIT/audio" "${auth[@]}" \
  -d '{"bytesBase64":"b2xpdmUtZGVtby1hdWRpbw=="}' | python3 -m json.tool

echo
echo "== process transcript job"
curl -sS -X POST "$BASE/v1/dev/process-jobs" -H "authorization: Bearer $TOKEN" | python3 -m json.tool

echo
echo "== transcript stream (cursor replay)"
curl -sS "$BASE/v1/visits/$VISIT/transcript/stream?cursor=0" -H "authorization: Bearer $TOKEN"

echo
echo "== draft + sign note"
curl -sS -X PATCH "$BASE/v1/visits/$VISIT/note" "${auth[@]}" \
  -d '{"body":"Post-op: conservative follow-up. Sensitivity improving."}' | python3 -m json.tool
curl -sS -X POST "$BASE/v1/visits/$VISIT/note/sign" -H "authorization: Bearer $TOKEN" | python3 -m json.tool

echo
echo "== follow-up send"
FU="$(curl -sS -X POST "$BASE/v1/visits/$VISIT/follow-ups" "${auth[@]}" \
  -d '{"body":"Thanks for coming in. Call us if chewing stays sore.","messageClass":"clinical_transactional"}' \
  | python3 -c 'import json,sys; print(json.load(sys.stdin)["id"])')"
curl -sS -X POST "$BASE/v1/follow-ups/$FU/send" -H "authorization: Bearer $TOKEN" | python3 -m json.tool

echo
echo "== follow-up skip (second draft)"
FU2="$(curl -sS -X POST "$BASE/v1/visits/$VISIT/follow-ups" "${auth[@]}" \
  -d '{"body":"Optional reminder we will skip"}' \
  | python3 -c 'import json,sys; print(json.load(sys.stdin)["id"])')"
curl -sS -X POST "$BASE/v1/follow-ups/$FU2/skip" "${auth[@]}" \
  -d '{"reason":"patient prefers phone"}' | python3 -m json.tool

echo
echo "== end visit (sets audio delete_after = ended_at + 24h)"
curl -sS -X POST "$BASE/v1/visits/$VISIT/end" -H "authorization: Bearer $TOKEN" | python3 -m json.tool

echo
echo "== day finish + day patients"
DATE="$(date -u +%F)"
curl -sS -X POST "$BASE/v1/days/finish" "${auth[@]}" -d "{\"date\":\"$DATE\"}" | python3 -m json.tool
curl -sS "$BASE/v1/days/$DATE/patients" -H "authorization: Bearer $TOKEN" | python3 -m json.tool

echo
echo "happy path complete"
