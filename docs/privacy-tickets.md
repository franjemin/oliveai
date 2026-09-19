# Canada privacy ticket map (Wave A in this PR)

Wave A is implemented **inside the demo Core loop** (invariants + fields), not as new services. Wave B is stub/fields only.

| Ticket | Wave | Where | Notes |
| --- | --- | --- | --- |
| **OLI-6** consent evidence | A | `consents` row + `GET /v1/visits/:id/consents` | Stores type, granted, `disclosure_script_id`, `granted_at`, actor, visit_id |
| **OLI-9** refuse path | A | `GET /v1/visits/:id/recording-gate` + ingest 403 | Server-side only; FE owns sheet UX |
| **OLI-5** sign gate + draft-only mutate | A | `PATCH /v1/visits/:id/note` | 403 `note_signed_immutable` after sign |
| **OLI-8** immutable signed snapshot | A | `notes.snapshot` on `POST .../note/sign` | Never auto-sign |
| **OLI-11** audio 24h / notes+transcripts long TTL | A | `audio.delete_after = ended_at+24h`; `retention_until` ~10y | Worker deletes audio object only; no cascade |
| **OLI-15** CASL send gate | A | `POST /v1/follow-ups/:id/send` | Per `message_class`; promotional fail-closed; send is **stub** (fake vendor) |
| **OLI-16** clinic SMS identity + STOP | A | `clinics.sms_identity`; `messaging_opt_outs` | Fail-closed on missing identity or STOP |
| **OLI-19** training off by default | A | `flags.phiTrainingAllowed=false` | Express disclosure required to grant `training` consent |
| **OLI-12** tenant + roles | A (no MFA) | `clinic_id` is tenant; API also returns `tenantId` | Roles: `dentist` \| `staff` \| `admin`. **MFA = Wave B — skipped** |
| **OLI-13** AuditEvent on PHI touch | A | `audit_events` | ingest / generate / sign / send / delete / consent |
| **Encryption baseline** | A | TLS + at-rest | API: `TLS_CERT_PATH`/`TLS_KEY_PATH` (or terminator). Audio objects: AES-256-GCM before MinIO/local store. Postgres: `DATABASE_SSL` + encrypted volume in non-local (documented in compose). |
| **OLI-14** KMS/CMEK + log polish | B | later | No KMS/CMEK in demo; no-PHI-in-logs verification polish deferred |
| **OLI-12 MFA** | B | — | Not in demo |
| **OLI-20** PHIPA agreement | B | `clinics.phipa_agreement_*` nullable | Non-blocking for local/demo |

See also `apps/api/docs/hipaa-invariants.md` and `contracts/openapi.yaml`.
