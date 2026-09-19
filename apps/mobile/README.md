# Olive mobile (v1 Core)

Expo + Expo Router + TypeScript under **`apps/mobile/` only**. Do not edit `apps/api/`.

**PR:** https://github.com/franjemin/oliveai/pull/2  
**Branch:** `cursor/olive-v1-core-mobile-56b9`  
**Base:** `main` (does not rewrite Backend PR #1)

Copy in this app is **draft pending counsel**. Edge CTAs are from `olive-v1/hifi/edges/` filenames (PNGs were not mounted). Tokens: solid olive bars, softened mist. Demo simplicity cuts on primary surfaces — no PHIPA chips / no “record of truth.”

## Ready-to-run packet (Tech Lead)

### 1. Identity

| | |
| --- | --- |
| PR | https://github.com/franjemin/oliveai/pull/2 |
| Branch | `cursor/olive-v1-core-mobile-56b9` |
| Demo login | `od@demo.olive.local` / `demo` |
| Seeded visit | `00000000-0000-4000-8000-000000000005` (Alex Rivera, in progress) |
| Clinic | Harbourfront Dental |

### 2. Local run (mocks — default)

```bash
cd apps/mobile
npm install
npx expo start
# web
npx expo start --web
```

### 2b. Point at Backend PR #1 API

Backend SoT on `cursor/olive-v1-core-backend-a0fd`: `contracts/openapi.yaml`, `contracts/api.md`, API under `apps/api/`.

```bash
# from oliveai after checking out / running Backend PR #1
# apps/api typically: docker compose up, migrate, seed, start (see that PR)

cd apps/mobile
cp .env.example .env
# .env
# EXPO_PUBLIC_USE_MOCKS=false
# EXPO_PUBLIC_API_BASE=http://localhost:3000
npx expo start
```

App boot calls `POST /v1/auth/login` with `od@demo.olive.local` / `demo` and pins Core walkthrough visit `00000000-0000-4000-8000-000000000005` (Alex Rivera) on Today.

Magic-link inbox uses `GET /v1/inbox/:token`. Secure thread uses `GET/POST /v1/patients/:id/chat` when live. Notify SMS vendor remains stubbed on both sides.

### Core walkthrough (seeded)

Same spine as Backend `apps/api/scripts/happy-path.sh`. No demo-blockers from stubbed SMS / BAA transcription / OD / PMS / chat polish / PHIPA / MFA.

1. Boot → demo login (`od@demo.olive.local` / `demo`)
2. Today → **Continue Alex Rivera** → visit `…0005`
3. Consent → **Start recording** (gate fail-closed) → Live
4. Live polls `GET /v1/visits/:id/transcript` (mocks attach segments; live POSTs stub audio + `POST /v1/dev/process-jobs`)
5. **End visit** → Note (AI-draft badge) → **Sign note**
6. If BE has no follow-up yet, FE `POST /v1/visits/:id/follow-ups` then Swipe **Send** (secure + notify stub)
7. **Finish day** uses the loaded day date (today on live seed; `2026-09-19` on mocks)

### 3. Wed dry-run checklist

| # | Step | Status |
| --- | --- | --- |
| 1 | Core loop on demo login | **wired** (mocks; API swap via env) |
| 2 | Zero “audio deleted within 24h” / hard-delete claims in UI/README | **wired** (clinic-controlled retention) |
| 3 | No PHIPA chips / “record of truth” on primary surfaces | **wired** |
| 4 | Today → Consent Agree/Deny + recording-gate | **wired** (CTA: Start recording / Refuse) |
| 5 | Live Pause/End + 03b transcript sheet | **wired** (capture simulated after gate) |
| 6 | Note Sign + post-Sign follow-ups bridge | **wired** |
| 7 | Swipe **Send** stub / Skip / CASL fail-closed | **wired** (Send = secure message; notify SMS **stub**) |
| 8 | Product-approved packet: clinic-controlled retention; demo simplicity cuts on primary | **wired** |
| — | Edge states (consent denied, bad-audio banner, empty swipe, sign confirm) | **wired** |

**Send stub meaning:** card preview is **secure message content**. Primary CTA is **Send** (not “Send SMS”). Microcopy: “We’ll text them a link to open it securely.” CASL/STOP fail-closed runs on the **notify** send. After Send: secure thread + patient magic-link inbox.

### 4. Dry-run ETA

**Mon dry-runable on mocks now.** API-backed walk depends on Backend PR #1 being up locally. Client types + HTTP unwrap OpenAPI envelopes (`patients`, `followUps`, nested day feed, inbox, send). Notify SMS vendor and BAA transcription stay stubbed.

## Product locks

- **Retention:** no 24h audio delete. Audio is kept with the clinic record (clinic-controlled). Encryption/audit unchanged.
- **Messaging:** swipe card ≠ SMS body of record. Notify text is a short stub with clinic identity + STOP. Secure thread is the record.

## Screens

| Route | Hero CTA | Happy path |
| --- | --- | --- |
| Today | Tap the next patient | Roster only. Finish day is ghost. Reset = long-press Today. |
| Consent | **Start recording** | Lead + Why we ask. Refuse is a text link (OLI-9). |
| Consent denied | **Continue without recording** | Edge only |
| Live | **End visit** | Timer + waveform. Transcript is 03b sheet. Bad-audio only via `?edge=bad-audio`. |
| Note | **Sign note** | One badge. Confirm is Sign / Cancel. |
| Swipe | **Send** | Card + microcopy. Skip is a text link. |
| Empty swipe | **Back to Today** | Edge only |
| Follow-ups | Same queue |
| Chats | Secure threads after Send (not full chat chrome) |
| Patients | Tab shell |
| `/thread/:patientId` | Clinic secure thread |
| `/inbox/:token` | Patient magic-link inbox (`GET /v1/inbox/:token`) |

## Wave A P0s

- **OLI-9** — consent + Refuse; versioned disclosure; recording-gate fail-closed before mic.
- **OLI-5** — AI draft badge; Sign only when `draft`; signed notes immutable.
- **OLI-16** — notify stub identifies clinic + STOP; CASL/STOP fail-closed on notify send (not on the secure-message card).

## Mock map

| Resource | ID |
| --- | --- |
| Clinic | `00000000-0000-4000-8000-000000000001` |
| OD | `00000000-0000-4000-8000-000000000002` |
| Alex (messaging consent) | `00000000-0000-4000-8000-000000000003` |
| Sam (no messaging consent) | `00000000-0000-4000-8000-000000000004` |
| Alex visit | `00000000-0000-4000-8000-000000000005` |
| Jordan (STOP, mock extra) | `00000000-0000-4000-8000-000000000006` |

`POST /v1/follow-ups/:id/send` publishes the secure message (`channel: secure`) and returns `inboxPath` + `notifySms` stub. FE treats `followUp.body` as **secure message**.

Snapshot of PR #1 contracts: [`contracts/`](contracts/) (Backend remains SoT — do not edit `apps/api/`).

## Contract mismatches (not demo-blockers)

| Mismatch | FE handling |
| --- | --- |
| Day-feed date: OpenAPI examples use `2026-09-19`; BE seed `startedAt` is **today** | FE tries today then `2026-09-19`, and always overlays visit `…0005` |
| BE does not auto-create a follow-up on visit end (`happy-path` POSTs one) | After Sign, FE creates a draft if the list is empty |
| No `GET /v1/follow-ups` or `GET /v1/chats` | Compose from day visits / patients+chat |
| Day-feed extras (`time`, `reason`, `recording`) | FE view model only |
| `Note.aiAssisted` missing on contract | OLI-5 badge derives from body / declined recording |
| `Clinic.email` on BE seed, not on OpenAPI Clinic | Optional extra; ignored |
| Consent evidence extras (`grantedAt`, actor) vs slim OpenAPI Consent | Optional FE fields |
| Jordan Hale STOP patient | Mock-only extra (BE seed is Alex + Sam) |
| Notify SMS vendor / BAA transcription / OD 501 / PMS / chat polish / PHIPA / MFA | Stubbed on BE — do not block FE |

## Deferred

Patients chrome · Aftercare / Claims · OD/PMS · MFA/settings · real mic · Quebec Law 25 · full chat product.

`npm run test:invariants` — gate / sign / CASL notify rejects.
