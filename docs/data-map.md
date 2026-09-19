# Olive v1 Core — data map stub (SEC-017)

Support for Legal / PHIPA inventory. **Not contract prose.** Canada-first residency via config (`ca-central-1`). Quebec Law 25 out of v1.

| Entity | Purpose | Retention | Region | Encryption |
| --- | --- | --- | --- | --- |
| `clinics` | Tenant; SMS identity; nullable PHIPA ack | Keep while contracted | `residency_region` | DB volume + TLS |
| `users` / `sessions` | Auth / RBAC (`dentist` \| `staff` \| `admin`) | Session 12h; user while employed | clinic | password hash; TLS |
| `patients` | Chart identity | Clinic-controlled / ~10y class | clinic | DB + TLS |
| `visits` | Encounter | Clinic-controlled | clinic | DB + TLS |
| `consents` | Recording / messaging / training evidence | Keep with visit/patient | clinic | DB + TLS |
| `audio_assets` | Visit audio | **Default keep** (clinic-controlled). Delete only clinic-initiated / EoC. No 24h auto-TTL. | object store `OBJECT_STORE_REGION` | AES-256-GCM + MinIO SSE-S3 |
| `transcripts` / `transcript_segments` | Diarized text | ~10y class (`retention_until`); never cascade with audio | clinic | DB + TLS |
| `notes` | Draft / signed snapshot | ~10y class; signed snapshot immutable | clinic | DB + TLS |
| `follow_ups` / edits | Secure in-app message + notify SMS metadata | Clinic-controlled | clinic | DB + TLS; SMS is no-PHI notify only |
| `audit_events` | PHI touch log | Long keep (query/WORM later) | clinic | DB + TLS |
| `messaging_opt_outs` | STOP | Until superseded | clinic | DB + TLS |

Backup copies of objects/DB: operator purge window is a **placeholder** (not automated in Core). Litigation hold = not implemented.
