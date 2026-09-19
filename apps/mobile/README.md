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

Login against the API: `od@demo.olive.local` / `demo`. Continue Alex visit `00000000-0000-4000-8000-000000000005`.

Magic-link patient inbox is **mock-only** (no Backend route yet). Secure thread uses `GET/POST /v1/patients/:id/chat` when live.

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

**Mon dry-runable on mocks now.** API-backed walk depends on Backend PR #1 being up locally; no FE contract gap blocks Live / Sign / Swipe **on mocks**. Live API: magic-link inbox is missing on Backend (demo uses mock inbox); notify SMS vendor is stubbed on both sides.

## Product locks

- **Retention:** no 24h audio delete. Audio is kept with the clinic record (clinic-controlled). Encryption/audit unchanged.
- **Messaging:** swipe card ≠ SMS body of record. Notify text is a short stub with clinic identity + STOP. Secure thread is the record.

## Screens

| Route | What |
| --- | --- |
| Today | Day roster, start/continue, Finish day |
| Consent | Per-visit. **Start recording** + Refuse. Disclosure id stored (not a Today chip). |
| Consent denied | `visit/[id]/denied` — **Continue without recording** (`01-consent-denied`) |
| Live | Timer, **Pause**, **End visit**, View transcript (not the full feed) |
| Bad audio | Top banner on Live — **Fix mic** · **Continue anyway** (`02-bad-audio`) |
| Transcript sheet (03b) | Diarized feed. Clinic-controlled audio retention copy. |
| Note / Sign | AI-assisted draft badge; Sign only if `draft`; confirm (`04-sign-confirm`); then **Review follow-ups** |
| Swipe | Secure-message card (editable) · **Send** / Skip · CASL on notify |
| Empty swipe | **All caught up** · **Back to Today** (`03-empty-swipe`) |
| Follow-ups | Same queue |
| Chats | Secure threads after Send (not full chat chrome) |
| Patients | Tab shell |
| `/thread/:patientId` | Clinic secure thread |
| `/inbox/:token` | Patient magic-link inbox (mock) |

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

`POST /v1/follow-ups/:id/send` is the send stub. FE treats `followUp.body` as **secure message** and attaches a notify stub + inbox token in mocks.

## Contract gaps (do not block Live / Sign / Swipe on mocks)

| Gap | Blocks demo? |
| --- | --- |
| Magic-link inbox not in OpenAPI | No — mock `/inbox/:token` |
| Notify SMS vendor stubbed on BE | No — FE stubs notify text |
| Day-feed row extras (`time`, `reason`, `recording`) not fully locked | No |
| Backend `docs` may still mention audio `delete_after` 24h | No — FE copy follows product lock |
| SDM / verbal_attested depth, MFA, post-sign correction trail, admin audit UI | OK partial for demo week |

## Deferred

Patients chrome · Aftercare / Claims · OD/PMS · MFA/settings · real mic · Quebec Law 25 · full chat product.

`npm run test:invariants` — gate / sign / CASL notify rejects.
