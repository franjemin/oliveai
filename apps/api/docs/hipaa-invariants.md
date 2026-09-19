# Olive v1 Core — PHIPA / CASL / HIPAA-class invariants

These rules are enforced in schema + services, not only in docs. Quebec Law 25 is **out of v1** (no QC-specific claims or flows). Geo is Canada-first via config (`DATA_RESIDENCY_REGION=ca-central-1`); there is no schema fork for US/cross-border.

## 1. No audio without visit-scoped recording consent

- `audio_capture` consent **requires** `visit_id`.
- Granted capture **requires** a versioned `disclosure_script_id`.
- `GET /v1/visits/:id/recording-gate` is the FE gate: `{ allowed, reason? }`.
- `ingestAudio` refuses when the gate is closed. No `AudioAsset` row, no object.

## 2. Draft-until-sign; no send from unsigned notes

- Notes default to `draft`. There is no auto-sign / auto-finalize path.
- `PATCH` after `signed` → `note_signed_immutable`.
- Sign writes an immutable `snapshot` JSON.
- Follow-up send with a linked note requires `note.status === signed`.

## 3. CASL-first messaging (TCPA reserved)

Before SMS:

1. Resolve `message_class`: `clinical_transactional` | `promotional`.
2. Require an **active per-class** messaging consent + clinic `sms_identity`.
3. Honor STOP/unsubscribe — **fail-closed**.
4. Promotional without consent is **fail-closed** (`promotional_fail_closed`).
5. Clinical/transactional still requires a consent record + audit (v1 Core).
6. Audit send attempt and outcome.

Secure/in-app thread uses the same `MessagingVendor` interface.

## 4. Retention split (audio ≠ notes/transcripts)

- Audio: `delete_after = visit.ended_at + 24h`. Worker hard-deletes the object, sets `deleted_at`, audits. **Does not** delete notes or transcripts.
- Notes + transcripts: independent `retention_until` (~10y RCDSO-class, configurable). Separate sweep; never cascade with audio.

## 5. Audit PHI access / generate / sign / send / delete

`audit_events` is clinic-scoped. Covered actions include `audio.ingest`, `audio.delete`, `audio.retention_delete`, `transcript.generate`, `note.patch`, `note.sign`, `follow_up.send`, `follow_up.send_failed`, `consent.grant`, `pms.import`, `day.finish`.

## 6. No PHI training without express patient consent

- `phiTrainingAllowed` defaults **false**.
- Contract-only is not enough. Granting `training` consent requires a disclosure/script id (express).
- Aftercare / Claims Guard flags exist and default false — no product features in this scaffold.

## 7. Every row is clinic-scoped

All operational tables include `clinic_id` (the tenant; API also returns `tenantId`). Roles are `dentist` | `staff` | `admin`. MFA is Wave B.

## 8. Clinic PHIPA agent/ESP fields (nullable)

`clinics.phipa_agreement_version`, `phipa_agreement_acked_at`, `phipa_agreement_acked_by` are present and **nullable**. They must not block local scaffold. Partner / go-live can require them later.

## 9. Vendors

- `TranscriptionVendor` is a **stub** until a BAA-backed vendor is contracted. Audio is not sent off-box.
- `MessagingVendor` is a fake in-process sender.
- `PmsAdapter` imports locally; Open Dental write-back is stubbed **501 / flagged**.

## 10. Encryption

Audio objects are AES-256-GCM sealed (`ENCRYPTION_KEY`) before they hit the object store (local `.data/objects` or MinIO). Canada-first object-store region is config (`OBJECT_STORE_REGION`).
