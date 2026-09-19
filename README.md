# oliveai

Olive v1 monorepo (Canada-first dental AI scribe).

## Tree

```
apps/api/          Backend only — Fastify API, worker, Drizzle schema, vendors
apps/web|mobile/   Frontend (do not land here from this PR)
contracts/         Core API contracts (OpenAPI + notes). Backend is source of truth.
docker-compose.yml Postgres 16 + MinIO (ca-central-1)
```

## Run the API

```bash
docker compose up -d
cd apps/api
cp .env.example .env
npm install
npm run db:migrate
npm run db:seed
npm start                # :3000
# other terminal
npm run worker           # or npm run worker:once
./scripts/happy-path.sh  # visit → consent → audio → transcript → note sign → send/skip
npm test
```

### Encryption — Wave A baseline (this PR, not deferred) vs Wave B (OLI-14)

| Wave A baseline in this PR | Wave B (OLI-14) — later |
| --- | --- |
| **TLS in transit** — `TLS_CERT_PATH` + `TLS_KEY_PATH`, or a TLS terminator in front of the API | KMS/CMEK key management |
| **Audio/objects at rest** — AES-256-GCM envelope before put (**no plaintext audio on disk**). MinIO bucket SSE-S3 in compose (local key) | CMEK rotation / HSM |
| **Postgres at rest** — `DATABASE_SSL` defaults **on** in `production`; compose/data volumes must sit on encrypted disks outside local demo | no-PHI-in-logs verification polish |

Stub SMS + stub transcription stay in demo mode (no real carrier / no BAA vendor).

Local `docker compose` is HTTP + developer volumes on purpose. Do not point it at real PHI.

Demo login: `od@demo.olive.local` / `demo`  
Seeded visit: `00000000-0000-4000-8000-000000000005`

Contracts for FE mocks: [`contracts/openapi.yaml`](contracts/openapi.yaml). Invariants: [`apps/api/docs/hipaa-invariants.md`](apps/api/docs/hipaa-invariants.md). Full ticket notes: [`docs/privacy-tickets.md`](docs/privacy-tickets.md).

**Audio retention (product lock):** default **keep**. No 24h auto-delete. Clinic-initiated delete only (`DELETE /v1/visits/:id/audio` or admin `POST /v1/clinic/audio/delete`).

Privacy / SEC map (OLI-* + **OLIVE-SEC-***): [`docs/privacy-tickets.md`](docs/privacy-tickets.md). Data-map stub: [`docs/data-map.md`](docs/data-map.md).

| SEC / OLI | Demo Core |
| --- | --- |
| SEC-001/002 · OLI-6/9 | Consent gate + evidence (FE owns sheet; SDM/verbal partial) |
| SEC-004/005 · OLI-5/8 | Draft-only mutate + immutable sign (no correction trail) |
| SEC-006 · OLI-11 | **Keep audio** — no auto-purge |
| SEC-007 | Clinic/EoC delete path (partial; no hold/backup job) |
| SEC-008 | TLS + at-rest encryption baseline |
| SEC-009 · OLI-12 | Tenant + roles — no MFA |
| SEC-010 · OLI-13 | Audit writes — no query API/WORM |
| SEC-012/013 · OLI-15/16 | CASL + SMS ID + STOP (stub send) |
| SEC-015 · OLI-19 | Training flag off |
| SEC-017 · OLI-20 | Nullable PHIPA + data-map stub |

Deferred after Core: SEC-003, 011, 014, 016 (and hold/backup automation).
