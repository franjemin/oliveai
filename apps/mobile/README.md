# Olive mobile (v1 Core)

Expo + Expo Router + TypeScript under **`apps/mobile/` only**. Do not edit `apps/api/`.

**PR:** https://github.com/franjemin/oliveai/pull/2  
**Branch:** `cursor/olive-v1-core-mobile-56b9`  
**Base:** `main` (does not rewrite Backend PR #1)

Copy in this app is **draft pending counsel** — do not treat UX strings as legal-approved.

**Design freeze SoT (must-fix, all wired on Expo web):**
1. Live End = charcoal **Slide to end visit** (not a sage Start twin) + glove-sized **Pause**. Transcript behind **View transcript** sheet only.
2. **04b** `/visit/:id/signed` — Note signed → **Review follow-ups** / **Back to Today**.
3. Follow-ups: stamp-on-card Catch Up — swipe right = olive **✓ Send** pill (top-left); left = stone **Skip** (top-right). Tilt + fly-off, next card peeks (not iOS reveal). Outline Skip/Send + “or tap” a11y only.
4. Consent: no PHIPA/CA·ON chips; **Why we ask** only; **Start recording** + “I confirmed the patient agrees.”
5. Sign: “You’re signing this as the clinical record.” No “Olive record of truth” / no 24h wipe.
6. Waveform = solid olive `#6B8F71` bars on soft mist — no gradient / chartreuse.

Tokens: cream `#FFFEFA`/`#F7F5F0`, sage `#7A9E7E`, olive `#6B8F71`, charcoal `#2C2B28`, glass blur ~28, radius 24–28, Nunito+Inter, no teal. 03b / 06 / edges not on disk — do not block.

## Francesca ASAP — localhost mocks (no API)

Expo web is the fastest Core loop. Confirmed booting at **http://localhost:8081**.

**Supported install path is `apps/mobile` with npm** — do not install from the repo root. Root `pnpm-workspace.yaml` has no root `package.json`; a root `pnpm install` / `npm install` will not put `expo-linear-gradient` on Metro’s resolve path.

After every pull:

```bash
cd apps/mobile
npm install
cp .env.example .env
npx expo start --web --port 8081 -c
```

If Metro still says it cannot resolve `expo-linear-gradient`:

```bash
cd apps/mobile
npx expo install expo-linear-gradient
npx expo start --web --port 8081 -c
```

Open: **http://localhost:8081**

`.env.example` is `EXPO_PUBLIC_USE_MOCKS=true`. Demo login is automatic (`od@demo.olive.local` / `demo`). Seeded visit `00000000-0000-4000-8000-000000000005` is pinned on Today.

**Core loop:** Today **Start** → Consent **Start recording** → Live charcoal **Slide to end visit** → Note **Sign note** → 04b **Review follow-ups** → Follow-ups **Send**.

**Magic-link inbox is on Backend PR #1** — `GET /v1/inbox/:token` (not missing). Send returns `inboxPath` + `magicLinkToken`; FE route is `/inbox/:token`.

**Product locks (PR #1 contracts, baked):**
1. **No 24h audio delete** — audio stays with the clinic record; retention is clinic-controlled.
2. **Send = secure message** — notify SMS is a separate stub. Send returns `secureMessageId` + `channelOfRecord: "secure"` + `inboxPath`. Open `GET /v1/inbox/:token`.
3. **Edits → clinician style** — `POST /v1/follow-ups/:id/edits` `{ before, after }` updates `clinician_style_profiles`. Drafts may use the session `style` heuristic. `phiTrainingAllowed` is **false**.

Long-press **Today** to reset the mock day.

## Ready-to-run packet (Tech Lead)

**PR:** https://github.com/franjemin/oliveai/pull/2  
**Branch:** `cursor/olive-v1-core-mobile-56b9`  
**Demo login:** `od@demo.olive.local` / `demo`  
**Seeded visit:** `00000000-0000-4000-8000-000000000005`

### 1. Exact local run — mocks first, then optional Backend PR #1

**Mocks (Francesca / Mon dry-run — use this):** see commands above. URL is **http://localhost:8081**.

**API-backed (optional):** bring up Backend PR #1 on `:3000` first (that PR’s runbook). Do **not** edit `apps/api/` from this branch.

```bash
cd apps/mobile
npm install
cp .env.example .env
```

Write `.env` exactly:

```
EXPO_PUBLIC_USE_MOCKS=false
EXPO_PUBLIC_API_BASE=http://localhost:3000
```

```bash
npx expo start --web --port 8081
```

Open **http://localhost:8081**. Boot: `POST /v1/auth/login` with `od@demo.olive.local` / `demo`, then pins visit `00000000-0000-4000-8000-000000000005` on Today.

### 2. Product-approved Wed hard pass/fail (`wired` | `mock` | `missing`)

| # | Hard pass/fail | Status |
| --- | --- | --- |
| 1 | Core loop works on demo login (`od@demo.olive.local` / `demo` → visit `…0005`) | **wired** |
| 2 | Zero “audio deleted within 24h” / hard-delete claims anywhere in UI / README | **wired** |
| 3 | No PHIPA chips / “record of truth” on primary surfaces | **wired** |
| 4 | Consent Agree/Deny + recording-gate | **wired** |
| 5 | Live Pause/End | **wired** (ambient mic bytes **mock**) |
| 6 | Note Sign | **wired** |
| 7 | post-Sign follow-ups bridge → Swipe Send stub / Skip / CASL fail-closed | **wired** (notify SMS vendor **mock**) |
| 8 | Product-approved dry-run checklist compliance: retention = clinic-controlled (no wipe claims); demo simplicity cuts primary copy (no PHIPA chips / no “record of truth” on primary) | **wired** |

Edge states (consent denied, bad-audio, empty swipe) are **wired** (supporting, not a numbered hard-fail).

**Wed must-work (#4–#7, all wired):** Consent agree/deny + gate · Live pause/end · Note sign + post-Sign bridge · Swipe send stub/skip/CASL fail-closed.

**OK mock/partial for demo week:** SDM / `verbal_attested` depth · MFA · post-sign correction trail · backup purge · admin audit UI · data-map beyond PHIPA fields.

Nothing on the Wed hard-fail list is **missing**.

### 3. Contract gaps that block Live / Sign / Swipe

**None.** Live, Sign, and Swipe have `/v1` routes on Backend PR #1. Non-blocking workarounds only:

| Gap | Blocks Live / Sign / Swipe? | FE handling |
| --- | --- | --- |
| BE does not auto-create a follow-up on visit end | **No** | After Sign, FE `POST /v1/visits/:id/follow-ups` if the list is empty |
| Day-feed date (`2026-09-19` examples vs seed **today**) | **No** | FE tries today + `2026-09-19` and overlays visit `…0005` |
| No `GET /v1/follow-ups` | **No** | Compose pending from day visits |
| Notify SMS vendor / BAA transcription | **No** | Stub on both sides; Send still returns secure + `inboxPath` |
| Magic-link inbox | **No — on Backend PR #1** | `GET /v1/inbox/:token` stub. FE `/inbox/:token` + Send `inboxPath` |

### 4. Mon dry-run target

**Not slipping.** Mock path is dry-runable **now**. API-backed walk is hours after PR #1 is up locally — not a FE blocker.

## Product locks (demo simplicity cuts)

- **Demo simplicity cuts** (Core simplicity bar): one hero CTA per screen; cream/sage/charcoal; glass cards; progressive disclosure. No PHIPA chips / no “record of truth” on primary.
- **Retention:** clinic-controlled on primary surfaces. Do not claim 24h audio deletion.
- **Messaging (05 / 05b carve-out):** stamp-on-card Catch Up (not iOS background reveal). Swipe right = olive **✓ Send** stamp top-left; left = stone **Skip** top-right. ~35% threshold, stamp opacity scales with drag, tilt + fly-off, next card peeks. Outline Skip/Send + “or tap” a11y only. Chip **Secure message**. Microcopy: “We’ll text them a link to open it securely.” 05b toast on edit-save only.
- **Voice learning:** on follow-up edit-save **and** note edit/sign, fire `{ source, before, after, resourceId }` to mocks and the HTTP log. Follow-up also `POST /v1/follow-ups/:id/edits` `{ before, after }` (OpenAPI `FollowUpEdit`). Session `style` is a local heuristic (`editCount` / `preferShorter` / `greeting`) — not PHI training and not a batch-apply / queue rewrite.

## Screens

| Route | Hero CTA | Happy path |
| --- | --- | --- |
| Today | **Start** on NEXT UP card | Olive mark + wordmark. LATER rows. Reset = long-press Today. |
| Consent | **Start recording** | Bottom sheet. **Why we ask** + agree line. Refuse = **Not recording this visit**. |
| Consent denied | **Continue without recording** | Edge only |
| Live | **Slide to end visit** (charcoal, not a sage Start twin) | Glove-sized **Pause**. **View transcript** pill. |
| Note | **Sign note** | Preview on land. **Edit full note**. Confirm sheet (wipe-scrub: clinic-controlled audio, no 24h). |
| Post-sign `/visit/:id/signed` | **Review follow-ups** | 04b bridge: check + “Note signed. Review follow-ups?” + **Back to Today**. |
| Follow-ups / Swipe | **Swipe right to Send** (left = Skip) | Gesture-first card stack. Peek of next. Outline Skip/Send are a11y (“or tap”) only. **SECURE MESSAGE** chip. Edit in the card. “We’ll text them a link to open it securely.” 05b toast on edit-save only. |
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

`POST /v1/follow-ups/:id/send` publishes the secure message (`channel: secure`) and returns `inboxPath` + `notifySms` stub. Patient open: **`GET /v1/inbox/:token`** on Backend PR #1 (wired, not missing). FE treats `followUp.body` as **secure message**.

Snapshot of PR #1 contracts: [`contracts/`](contracts/) (Backend remains SoT — do not edit `apps/api/`).

## Other contract mismatches (do not block Live / Sign / Swipe)

| Mismatch | FE handling |
| --- | --- |
| No `GET /v1/chats` | Compose from patients + per-patient chat |
| Day-feed extras (`time`, `reason`, `recording`) | FE view model only |
| `Note.aiAssisted` missing on contract | OLI-5 badge derives from body / declined recording |
| `Clinic.email` on BE seed, not on OpenAPI Clinic | Optional extra; ignored |
| Consent evidence extras (`grantedAt`, actor) vs slim OpenAPI Consent | Optional FE fields |
| Jordan Hale STOP patient | Mock-only extra (BE seed is Alex + Sam) |
| OD 501 / PMS / chat polish / PHIPA / MFA | Stubbed on BE — do not block FE |

## Deferred

Patients chrome · Aftercare / Claims · OD/PMS · MFA/settings · real mic · Quebec Law 25 · full chat product.

`npm run test:invariants` — gate / sign / CASL notify rejects / voice-learning before/after payloads.
