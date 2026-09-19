# Olive v1 Core API

Frontend contracts for the Fastify API in `apps/api`. Machine-readable twin: [`openapi.yaml`](openapi.yaml) (backend is source of truth). Auth is `Authorization: Bearer <token>` unless noted.

Error shape: `{ "error": string, "message": string, "details"?: unknown }`.

## Auth / session / flags

### `POST /v1/auth/login`
```json
{ "email": "od@demo.olive.local", "password": "demo" }
```
Returns `{ token, expiresAt, user, clinic, flags }`.

### `GET /v1/session`
Bootstrap after login. Returns `{ user, clinic, flags, style? }`. `style` is a clinician draft heuristic (`preferShorter`, `greeting`, `editCount`) — not PHI training.

Clinic includes nullable PHIPA fields (`phipaAgreementVersion`, `phipaAgreementAckedAt`, `phipaAgreementAckedBy`). Missing values **do not** block local scaffold.

### `GET /v1/feature-flags`
```json
{
  "flags": {
    "aftercare": false,
    "claimsGuard": false,
    "phiTrainingAllowed": false,
    "odWriteback": false,
    "quebecLaw25": false
  }
}
```

### `GET /v1/clinic`

## Patients / profile / chat

- `GET /v1/patients`
- `GET /v1/patients/:id`
- `GET /v1/patients/:id/profile`
- `GET /v1/patients/:id/chat` → `{ thread, messages }`
- `POST /v1/patients/:id/chat` `{ body, visitId? }`
- `POST /v1/patients/:id/consents`

Consent body:
```json
{
  "type": "audio_capture | messaging | training",
  "granted": true,
  "visitId": "uuid (required for audio_capture)",
  "messageClass": "clinical_transactional | promotional",
  "disclosureScriptId": "audio-disclosure-v1"
}
```

## Visits / recording gate / audio / transcript / notes

- `POST /v1/visits` `{ patientId }`
- `GET /v1/visits/:id`
- `POST /v1/visits/:id/end` — completes the visit. Audio is **kept** (no auto-TTL).
- `POST /v1/clinic/audio/delete` `{ "confirm": "delete-clinic-audio" }` — admin / end-of-contract audio delete only (SEC-007). Does not cascade notes/transcripts.

### `GET /v1/visits/:id/consents`
OLI-6 consent evidence (disclosure script id, granted_at, actor, type).

### `GET /v1/visits/:id/recording-gate`
```json
{ "allowed": false, "reason": "missing_audio_capture_consent" }
```
or `{ "allowed": true, "disclosureScriptId": "audio-disclosure-v1" }`.

Refuse path is first-class: no `AudioAsset` if denied/missing. Gate requires visit-scoped `audio_capture` **and** a versioned disclosure/script id.

- `POST /v1/visits/:id/consent` — convenience; binds `patientId` from the visit
- `POST /v1/visits/:id/audio` — JSON `{ bytesBase64 }` or raw `audio/webm` / `application/octet-stream`
- `DELETE /v1/visits/:id/audio` — hard-deletes object + audit; **does not** cascade notes/transcripts
- `GET /v1/visits/:id/transcript` → `{ transcript, segments, job }`

### `GET /v1/visits/:id/transcript/stream?cursor=0`
SSE. Replay segments with `seq > cursor`.

| event | data |
| --- | --- |
| `segment` | `{ id, seq, speakerLabel, text, startMs, endMs }` (`id:` header = seq) |
| `status` | `{ jobStatus, cursor }` |
| `done` | `{ ok: true }` when the job is completed |

Speaker labels are stable per visit (`speaker_clinician`, `speaker_patient`).

- `GET /v1/visits/:id/note`
- `PATCH /v1/visits/:id/note` `{ body }` — draft only
- `POST /v1/visits/:id/note/sign` — freezes immutable `snapshot`; never auto-sign

## Follow-ups (separate from notes)

States: `draft | queued | sent | failed | skipped`.

- `GET /v1/visits/:id/follow-ups`
- `POST /v1/visits/:id/follow-ups` `{ body, messageClass? }`
- `PATCH /v1/follow-ups/:id` `{ body }`
- `POST /v1/follow-ups/:id/skip` `{ reason? }`
- `POST /v1/follow-ups/:id/edits` `{ before, after }` — stores an event; no ML in v1
- `POST /v1/follow-ups/:id/send` — publishes **secure in-app** body; queues **no-PHI notify SMS** stub + magic link
- `GET /v1/inbox/:token` — patient magic-link inbox stub (dry-run)

`body` is never the SMS payload. Channel of record = `secure`. CASL (consent, clinic identity, STOP) applies to **notify SMS only**.

## Day ops

FE is not source of truth.

### `POST /v1/days/finish`
```json
{ "date": "2026-09-19" }
```
Snapshots the pending follow-up queue for the clinic.

### `GET /v1/days/:date/patients`
Normalized local + imported feed.

Empty: `{ "date": "2026-09-19", "patients": [] }`

Error (503): `{ "error": "day_feed_unavailable", "message": "...", "date": "...", "patients": [] }`

## PMS

- `POST /v1/pms/import` `{ source?, patients?: [{ externalId, firstName, lastName, phone?, email?, dateOfBirth? }] }`
- `POST /v1/pms/open-dental/writeback` `{ visitId, noteId? }` → **501** `{ error: "od_writeback_stubbed", details: { flagged: true, flag: "odWriteback", enabled: false } }`

## Dev (non-production)

- `POST /v1/dev/process-jobs` — run queued transcription jobs once (same work as `npm run worker:once`)
- `GET /health`

## Demo IDs (after seed)

| Resource | ID |
| --- | --- |
| Clinic | `00000000-0000-4000-8000-000000000001` |
| OD user | `00000000-0000-4000-8000-000000000002` |
| Patient Alex Rivera | `00000000-0000-4000-8000-000000000003` |
| Patient Sam Park (no messaging consent) | `00000000-0000-4000-8000-000000000004` |
| Visit (Alex, in progress) | `00000000-0000-4000-8000-000000000005` |
