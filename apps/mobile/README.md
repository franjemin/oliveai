# Olive mobile (v1 Core)

Expo + Expo Router + TypeScript under **`apps/mobile/` only**. Do not edit `apps/api/`.

**PR:** https://github.com/franjemin/oliveai/pull/2  
**Branch:** `cursor/olive-v1-core-mobile-56b9`  
**Base:** `main` (does not rewrite Backend PR #1)

Copy in this app is **draft pending counsel** — do not treat UX strings as legal-approved.

**Visual pass (hi-fi 01–05b):** cream paper `#FFFEFA` / `#F7F5F0`, sage→olive CTA `#7A9E7E → #6B8F71`, charcoal `#2C2B28`. Nunito (brand) + Inter (UI). Glass cards, floating pill tabs, slide-to-end Live, Sign-first Note, Secure message Send + voice toast. No PHIPA chips. No 24h wipe copy.

## Ready-to-run packet (Tech Lead)

### 1. PR + branch

| | |
| --- | --- |
| PR | https://github.com/franjemin/oliveai/pull/2 |
| Branch | `cursor/olive-v1-core-mobile-56b9` |
| Base | `main` (does not rewrite Backend PR #1) |
| Demo login | `od@demo.olive.local` / `demo` |
| Seeded visit | `00000000-0000-4000-8000-000000000005` (Alex Rivera) |
| Clinic | Harbourfront Dental |

### 2. Local run (`apps/mobile/` only)

**Mocks (default — Francesca / Mon dry-run):**

```bash
cd apps/mobile
npm install
# .env.example defaults:
#   EXPO_PUBLIC_USE_MOCKS=true
#   EXPO_PUBLIC_API_BASE=http://localhost:3000
npx expo start --web --port 8081
# open http://localhost:8081
```

Boot auto-logs in as `od@demo.olive.local` / `demo` and pins visit `00000000-0000-4000-8000-000000000005` on Today.

**Point at Backend PR #1 API:**

```bash
# Terminal A — run Backend PR #1 first (see that PR; do not edit apps/api/ from this branch)
# typical: checkout cursor/olive-v1-core-backend-a0fd → docker compose / migrate / seed / start on :3000

cd apps/mobile
cp .env.example .env
```

`.env`:

```
EXPO_PUBLIC_USE_MOCKS=false
EXPO_PUBLIC_API_BASE=http://localhost:3000
```

```bash
npx expo start --web --port 8081
# still http://localhost:8081
# login still od@demo.olive.local / demo ; visit still …0005
```

App boot: `POST /v1/auth/login` → day feed → overlay visit `…0005`. Magic-link inbox: `GET /v1/inbox/:token`. Notify SMS vendor stays stubbed on both sides.

### 3. Wed dry-run checklist (`wired` / `mock` / `missing`)

| Step | Status |
| --- | --- |
| Today (NEXT UP → Start → visit `…0005`) | **wired** |
| Consent Agree (**Start recording**) / Deny (**Not recording this visit**) + recording-gate | **wired** |
| Live Pause / End (**Slide to end visit**) | **wired** (mic capture is **mock**) |
| Note Sign (draft-only; signed immutable) | **wired** |
| post-Sign follow-ups bridge (04b → Review follow-ups) | **wired** |
| Swipe Send stub / Skip / CASL fail-closed | **wired** (notify SMS body is **mock**/stub) |
| Edge states (consent denied, bad-audio, empty swipe) | **wired** |
| Bluedot P0 on primary (one hero CTA, no PHIPA chips, no “record of truth”, clinic-controlled retention / no 24h wipe) | **wired** |

Nothing on this spine is **missing**. Real microphone, live SMS vendor, OD write-back, MFA, SDM/verbal_attested depth remain **mock** / out of demo week.

**Send stub:** card = secure message. CTA **Send** (not Send SMS). Microcopy: “We’ll text them a link to open it securely.” CASL/STOP fail-closed runs on the **notify** send.

### 4. Dry-run ETA

**Dry-runable on mocks now (0 hours).** Expo web Core loop was walked on this branch.

- **Mon clinic dry-run:** use mocks + `http://localhost:8081`. Not slipping.
- **API-backed walk:** hours after Backend PR #1 is up locally — not a FE blocker; no contract gap blocks Live / Sign / Swipe (FE POSTs a follow-up after Sign if BE has none).
- **Wed demo:** on track on the mock path. SMS vendor / real mic stay **mock**.

## Product locks (Bluedot P0)

- **Bluedot P0:** one hero CTA per screen; cream/sage/charcoal; glass cards; progressive disclosure. No PHIPA chips / no “record of truth” on primary.
- **Retention:** clinic-controlled on primary surfaces. Do not claim 24h audio deletion.
- **Messaging:** swipe card ≠ SMS body of record. Notify text is a short stub with clinic identity + STOP. Secure thread is the record.

## Screens

| Route | Hero CTA | Happy path |
| --- | --- | --- |
| Today | **Start** on NEXT UP card | Olive mark + wordmark. LATER rows. Reset = long-press Today. |
| Consent | **Start recording** | Bottom sheet. **Why we ask** + agree line. Refuse = **Not recording this visit**. |
| Consent denied | **Continue without recording** | Edge only |
| Live | **Slide to end visit** | Large **Pause**. **View transcript** pill. |
| Note | **Sign note** | Preview on land. **Edit full note**. After Sign: **Review follow-ups**. |
| Follow-ups / Swipe | Swipe right **Send** / left **Skip** | Secure message chip. Stamp-on-card. Outline buttons are a11y only. Voice toast on edit. |
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
