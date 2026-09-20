# Olive mobile (v1 Core)

Expo + Expo Router + TypeScript under **`apps/mobile/` only**. Do not edit `apps/api/`.

**PR:** https://github.com/franjemin/oliveai/pull/2  
**Branch:** `cursor/olive-v1-core-mobile-56b9`  
**Base:** `main` (does not rewrite Backend PR #1)

Copy in this app is **draft pending counsel** — do not treat UX strings as legal-approved.

**Design freeze SoT (EOD-sign hi-fi, all wired on Expo web):**
1. Live: patient name + reason, huge timer, **massive circular Pause** with olive pulse rings (no bottom Pause twin). One-line PATIENT snippet. **View full transcript**. One charcoal **Slide to end visit**. End destination = **Today** (not Note). No second End modal.
2. **Draft saved** charcoal toast: check + `{name} · sign at end of day`.
3. **Finish day** on Today when drafts pending (END OF DAY card + UNSIGNED DRAFTS when the day is empty). → **Notes to sign** queue → one note at a time → last sign **“All signed. Review follow-ups?”** → Follow-ups. Optional early sign: **“Note signed. Review follow-ups?”**
4. Follow-ups: stamp-on-card Catch Up — swipe right = olive **✈ Send** pill (top-left); left = stone **Skip** (top-right). Outline Skip/Send + “or tap” a11y only.
5. Consent: no PHIPA/CA·ON chips; **Why we ask** only; **Start recording** + “I confirmed the patient agrees.”
6. Sign: “You’re signing this as the clinical record.” No “Olive record of truth” / no 24h wipe. No mid-day sign gate.

Tokens: cream `#FFFEFA`/`#F7F5F0`, sage `#7A9E7E`, olive `#6B8F71`, charcoal `#2C2B28`, glass blur ~28, radius 24–28, Nunito+Inter, no teal.

## Francesca ASAP — localhost mocks (no API)

**Preferred stable URL:** **http://localhost:8081** via static export (production React; no Performance Tracks).

React 19.2 DEV `performance.measure` for Components ⚛ structured-clones fiber props into the user-timing buffer. The clone **succeeds**, so try/catch on `DataCloneError` cannot help — Chrome/Safari retain tens of MB and OOM. We strip `detail` (keep timing) before React mounts, and cap the timeline. Production export never emits those measures.

**Preferred — static export (demo-stable):**

```bash
cd apps/mobile
rm -rf node_modules && npm ci
cp .env.example .env   # first run only
npm run web:static
npx --yes serve dist -l 8081
```

`web:static` is `expo export -p web`. Serve `dist` with `npx serve dist -l 8081`. Mocks still boot (`EXPO_PUBLIC_USE_MOCKS` defaults true) with auto demo login; no API.

**Interim — Metro in production mode:**

```bash
cd apps/mobile && npx expo start --web --port 8081 --no-dev -c
```

**Dev (patched, still Metro):** `npx expo start --web --port 8081 -c`

npm inside `apps/mobile` only. Do not run `pnpm` / `npm install` at the repo root.

`.env.example` is `EXPO_PUBLIC_USE_MOCKS=true`. Demo login is automatic (`od@demo.olive.local` / `demo`). Seeded visit `00000000-0000-4000-8000-000000000005` is pinned on Today.

**Core loop:** Today **Start** → Consent **Start recording** → Live (massive Pause + pulse, huge timer, patient, one-line snippet) charcoal **Slide to end visit** → charcoal **Draft saved** toast (`{name} · sign at end of day`) → Today. No forced Sign. Unsigned drafts pile up. **Finish day** → **Notes to sign** queue → **Review & sign** one at a time → last sign **“All signed. Review follow-ups?”** → Follow-ups **Send**. Sign is **not** required to leave Live. Mid-day sign is optional/light — not a gate. Follow-ups are created on **sign**, not on visit end. Wired to PR #1: `POST /v1/visits/:id/complete`, Finish-day `unsignedDrafts` + `followUpRelease: after_sign`, day patients `unsignedDraft`, send 403 until signed.

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

**Wed must-work (#4–#7, all wired):** Consent agree/deny + gate · Live pause/end (draft saved → Today) · Note sign at **end of day** via Finish day · Swipe send stub/skip/CASL fail-closed. Mid-day sign is not a gate.

**OK mock/partial for demo week:** SDM / `verbal_attested` depth · MFA · post-sign correction trail · backup purge · admin audit UI · data-map beyond PHIPA fields.

Nothing on the Wed hard-fail list is **missing**.

### 3. Contract gaps that block Live / Sign / Swipe

**None.** Live, Sign, and Swipe have `/v1` routes on Backend PR #1. Non-blocking workarounds only:

| Gap | Blocks Live / Sign / Swipe? | FE handling |
| --- | --- | --- |
| BE does not auto-create a follow-up on visit end | **No** | `POST /v1/visits/:id/complete` (alias `/end`) leaves a **draft** note. Follow-ups are created **on Sign**. Finish day returns `unsignedDrafts` + `followUpRelease: "after_sign"`. Send 403 `unsigned_note` until signed. Day patients expose `unsignedDraft`. |
| Day-feed date (`2026-09-19` examples vs seed **today**) | **No** | FE tries today + `2026-09-19` and overlays visit `…0005` |
| No `GET /v1/follow-ups` | **No** | Compose pending from day visits |
| Notify SMS vendor / BAA transcription | **No** | Stub on both sides; Send still returns secure + `inboxPath` |
| Magic-link inbox | **No — on Backend PR #1** | `GET /v1/inbox/:token` stub. FE `/inbox/:token` + Send `inboxPath` |

### 4. Mon dry-run target

**Not slipping.** Mock path is dry-runable **now**. API-backed walk is hours after PR #1 is up locally — not a FE blocker.

## Product locks (demo simplicity cuts)

- **Demo simplicity cuts** (Core simplicity bar): one hero CTA per screen; cream/sage/charcoal; glass cards; progressive disclosure. No PHIPA chips / no “record of truth” on primary.
- **Retention:** clinic-controlled on primary surfaces. Do not claim 24h audio deletion.
- **Messaging (05 / 05b carve-out):** stamp-on-card Catch Up (not iOS background reveal). Swipe right = olive **✈ Send** stamp top-left; left = stone **Skip** top-right. ~35% threshold, stamp opacity scales with drag, tilt + fly-off, next card peeks. Outline Skip/Send + “or tap” a11y only. Chip **Secure message**. Microcopy: “We’ll text them a link to open it securely.” 05b toast on edit-save only.
- **End-of-day sign:** Sign notes at **end of day**, not after every visit. Live exit saves a draft and returns to Today (one charcoal slide; no second End modal; no mid-day sign gate). **Finish day** → Notes to sign queue → one-at-a-time Sign → **All signed. Review follow-ups?** → swipe. Optional early sign uses **Note signed. Review follow-ups?** Do not enqueue swipe follow-ups until a note is signed.
- **Voice learning:** on follow-up edit-save **and** note edit/sign, fire `{ source, before, after, resourceId }` to mocks and the HTTP log. Follow-up also `POST /v1/follow-ups/:id/edits` `{ before, after }` (OpenAPI `FollowUpEdit`). Session `style` is a local heuristic (`editCount` / `preferShorter` / `greeting`) — not PHI training and not a batch-apply / queue rewrite.

## Screens

| Route | Hero CTA | Happy path |
| --- | --- | --- |
| Today | **Start** on NEXT UP card | Olive mark + wordmark. LATER remaining visits. Charcoal **Draft saved** toast after Live. When visits are done: chip **Visits done · N drafts waiting**, END OF DAY **Finish day** card, UNSIGNED DRAFTS with Draft pills. Reset = long-press Today. |
| Consent | **Start recording** | Bottom sheet. **Why we ask** + agree line. Refuse = **Not recording this visit**. |
| Consent denied | **Continue without recording** | Edge only — back to Today (draft saved). Note stays reachable from Today if they want to write. |
| Live | **Slide to end visit** (charcoal, one only) | Patient name + reason. Huge timer. Massive circular **Pause** + olive pulse. Listening. One-line PATIENT snippet. **View full transcript**. End persist draft → Today. Sign is not required to leave. |
| Notes to sign `/notes-to-sign` | **Review & sign** | Finish-day queue. Preview card. “One note at a time · then follow-ups.” |
| Note | **Sign note** | Day stack: ← Notes to sign, **1 of n**, EOD queue chip, **Skip for now · back to queue**. Opening a note from Today is optional review. **Save draft** → Today. Confirm sheet (clinic-controlled audio, no 24h). |
| Post-sign `/visit/:id/signed` | **Review follow-ups** | Last EOD sign: **All signed. Review follow-ups?** + Day-end batch complete. Early sign: **Note signed. Review follow-ups?** |
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
