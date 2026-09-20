# Privacy / security ticket map (this PR)

Wave A + `OLIVE-SEC-*` live **inside the demo Core loop**, not as new services. Honest status after the **audio retention reverse** (no 24h auto-delete).

Status: **covered** | **partial** | **gap** | **deferred**

## Build-now (Wed dry-run: consent gate, sign, CASL send stub must stay solid)

| SEC-ID | OLI-* | Where in `apps/api` | Status | Honest notes |
| --- | --- | --- | --- | --- |
| **OLIVE-SEC-001** | OLI-6, OLI-9 | `services/consent.ts`; `GET /v1/visits/:id/recording-gate`; `POST .../consent` | **partial** | Server gate + visit-scoped `audio_capture` + `disclosure_script_id`. **FE owns consent sheet UX.** No SDM / multi-party / channel enums. |
| **OLIVE-SEC-002** | OLI-6 | `consents` + `GET /v1/visits/:id/consents` | **partial** | Evidence = type, granted, script id, `granted_at`, actor, visit. **No** `verbal_attested`, dedicated refuse-outcome enum, or append-only/WORM evidence log. Deny = `granted: false` + gate `reason`. |
| **OLIVE-SEC-004** | OLI-5 | `PATCH /v1/visits/:id/note` | **partial** | Draft-only mutate (403 after sign). Notes stay draft across visits; **sign deferred to EOD**. Visit `/complete` does not block. FE can badge from `status === "draft"`. |
| **OLIVE-SEC-005** | OLI-8 | `POST .../note/sign` → `notes.snapshot` | **partial** | Immutable snapshot on sign. Finish-day lists unsigned drafts; follow-up send still gated. **Post-sign correction trail = gap**. |
| **OLIVE-SEC-006** | OLI-11 | ingest + worker (no purge job) | **covered** | **Product lock: no auto-delete.** Audio default **keep** (clinic-controlled, same class as notes). `delete_after` unused. Storage cost later. |
| **OLIVE-SEC-008** | (encryption baseline) | `lib/encryption.ts`, TLS/SSL config, MinIO SSE-S3 | **covered** | TLS in transit; AES-256-GCM audio objects; `DATABASE_SSL` in production. |
| **OLIVE-SEC-009** | OLI-12 | `clinic_id` / `tenantId`; roles `dentist` \| `staff` \| `admin` | **partial** | Tenant + RBAC. **MFA + break-glass = Wave B / deferred.** |
| **OLIVE-SEC-010** | OLI-13 | `audit_events` on PHI touch | **partial** | Write-side audit on ingest/generate/sign/send/delete/consent. **No admin audit query API; no WORM.** |
| **OLIVE-SEC-012** | OLI-15 | `POST /v1/follow-ups/:id/send` | **covered** | Body = secure in-app. CASL on **notify SMS only** (no PHI in SMS). Stub vendor. |
| **OLIVE-SEC-013** | OLI-16 | `clinics.sms_identity`; `messaging_opt_outs` | **covered** | Clinic identity + STOP on notify SMS only. |
| **OLIVE-SEC-015** | OLI-19 | `flags.phiTrainingAllowed=false` | **covered** | Training off. Per-clinician **style heuristic** from edits only (not global PHI training). |
| **OLIVE-SEC-017** | OLI-20 | `clinics.phipa_agreement_*` + [`docs/data-map.md`](data-map.md) | **partial** | Nullable PHIPA fields (non-blocking). Thin data-map stub only — not Legal contract prose. |
| **OLIVE-SEC-007** | (clinic delete) | `DELETE /v1/visits/:id/audio`; `POST /v1/clinic/audio/delete` | **partial** | Clinic-initiated / EoC audio delete only (admin for clinic-wide). **Litigation hold / longer-retain override / backup purge job = gap deferred.** Backup copies: operator must purge within the org backup window (placeholder — not automated). |

## After Core loop (deferred)

| SEC-ID | Status | Notes |
| --- | --- | --- |
| **OLIVE-SEC-003** | **deferred** | After Core loop (not in demo week). |
| **OLIVE-SEC-007** hold / backup automation | **deferred** | See partial clinic-delete above; hold + backup-window automation later. |
| **OLIVE-SEC-011** | **deferred** | After Core loop. |
| **OLIVE-SEC-014** | **deferred** | After Core loop. KMS/CMEK + no-PHI-in-logs polish is also **OLI-14 / Wave B**. |
| **OLIVE-SEC-016** | **deferred** | After Core loop. |

## Wave B (do not block demo)

| ID | Status |
| --- | --- |
| OLI-14 / SEC-014 hardening | KMS/CMEK, log polish |
| OLI-12 MFA | Not in demo |
| OLI-20 PHIPA go-live gate | Fields exist; do not block local |

See `apps/api/docs/hipaa-invariants.md` and `contracts/openapi.yaml`.
