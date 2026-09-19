# Olive mobile (v1 Core)

Expo + Expo Router + TypeScript app for the chairside Core loop. **This package owns `apps/mobile/` only.** Backend lives at repo root on [`cursor/olive-v1-core-backend-a0fd`](https://github.com/franjemin/oliveai/pull/1) — do not edit `apps/api/` (it does not exist on that PR).

Demo-thin for the clinic week of **Sep 22**. Progressive disclosure: landings have one clear action; power (full diarized transcript) is on demand.

Hi-fi PNGs / brand kit (`/workspace/olive-v1/hifi`, `/workspace/olive-brand/locked`) were not mounted in the scaffold environment. Tokens follow the locked brief: **solid olive waveform bars** (no chartreuse gradient), **softened mist washes**.

## Run

```bash
cd apps/mobile
npm install
npx expo start
```

Web (useful on CI / desktop):

```bash
npx expo start --web
```

iOS / Android: scan the QR code with Expo Go, or `npm run ios` / `npm run android`.

Default login is implicit: **Dr. Maya Chen · Harbourfront Dental** (`od@demo.olive.local` / `demo` when swapping to the live API).

## Screens

| Route | What |
| --- | --- |
| Today | Day roster, start/continue visit, Finish day → swipe |
| Consent | Always shown per visit. Refuse is first-class. Versioned disclosure `audio-disclosure-v1` is visible and stored. |
| Live | Timer + End visit + View transcript. **Not** the full feed. |
| Transcript sheet (03b) | Full diarized clinician/patient feed. Audio TTL copy is audio-only. |
| Note / Sign | Persistent **AI-assisted draft** badge. Sign enabled only when `status=draft`. Signed notes are read-only. |
| Swipe | Send SMS / Skip. Clinic SMS identity + STOP/consent fail-closed copy. |
| Follow-ups tab | Same queue as Finish day. |
| Chats / Patients | Tab shells only. |

## Core loop (mocks)

1. Today → Alex Rivera (in chair) → Consent.
2. **Accept** → recording-gate must return `allowed` or the mic stays closed → Live.
3. **View transcript** opens the 03b sheet. **End visit** → Note.
4. Review / edit draft → **Sign** (disabled after signed).
5. **Finish day** or Note → Swipe. Alex sends. Sam fails CASL (no messaging consent). Jordan fails STOP.
6. Reset demo from Today.

**Refuse** on Consent: gate stays closed, no transcript, visit continues as a **manual draft**. Care is not blocked.

## Wave A P0s (baked into UX)

- **OLI-9 Consent** — per-visit sheet, Refuse first-class, versioned disclosure id stored, `GET /v1/visits/:id/recording-gate` called, **fail-closed before mic**.
- **OLI-5 Draft/Sign** — `AI-assisted draft` badge while unsigned; Sign only if `status=draft`; signed notes cannot be patched (`note_signed_immutable`).
- **OLI-16 SMS identity** — preview shows `Sent on behalf of {Clinic}. Reply STOP to opt out.`; mock send returns `stop_fail_closed` / `missing_messaging_consent`.

## Mock map → API

Mocks implement the locked `/v1` shapes from Backend `docs/api.md`. Demo IDs match seed:

| Resource | ID |
| --- | --- |
| Clinic | `00000000-0000-4000-8000-000000000001` |
| OD · Dr. Maya Chen | `00000000-0000-4000-8000-000000000002` |
| Alex Rivera (messaging consent) | `00000000-0000-4000-8000-000000000003` |
| Sam Park (no messaging consent) | `00000000-0000-4000-8000-000000000004` |
| Alex visit (in progress) | `00000000-0000-4000-8000-000000000005` |
| Jordan Hale (STOP on file, mock-only extra) | `00000000-0000-4000-8000-000000000006` |

| Client method | API |
| --- | --- |
| `recordingGate` | `GET /v1/visits/:id/recording-gate` |
| `recordVisitConsent` | `POST /v1/visits/:id/consent` |
| `endVisit` | `POST /v1/visits/:id/end` (`audio.delete_after = ended_at + 24h`) |
| `getTranscript` | `GET /v1/visits/:id/transcript` |
| `getNote` / `patchNote` / `signNote` | `GET/PATCH /v1/visits/:id/note`, `POST …/note/sign` |
| `sendFollowUp` / `skipFollowUp` | `POST /v1/follow-ups/:id/send` · `/skip` |
| `finishDay` | `POST /v1/days/finish` |
| `dayPatients` | `GET /v1/days/:date/patients` |

Day-row extras (`time`, `reason`, `recording`) are FE conveniences until the day-feed payload is fully locked.

## API swap

```bash
# apps/mobile/.env
EXPO_PUBLIC_USE_MOCKS=false
EXPO_PUBLIC_API_BASE=http://localhost:3000
```

See `.env.example`. HTTP client is `src/api/http.ts`. Keep mocks on for the Sep 22 walkthrough.

## Deferred (not in this PR)

Chats / Patients beyond tab shells · Aftercare / Claims Guard · OD / PMS chrome · MFA / settings jungles (Wave B) · real microphone capture (gate is enforced; capture is simulated until a BAA vendor) · Quebec Law 25.

## Workspace

Root `pnpm-workspace.yaml` includes `apps/*`. Backend PR #1 keeps the API at repository root with npm — this file does not rewrite that package.
