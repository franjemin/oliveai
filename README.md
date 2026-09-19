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

### Encryption (Wave A baseline vs Wave B)

| Now (this PR) | Later (OLI-14) |
| --- | --- |
| **TLS in transit** — set `TLS_CERT_PATH` + `TLS_KEY_PATH`, or terminate TLS in front of the API | KMS/CMEK key management |
| **Audio/objects at rest** — AES-256-GCM envelope before MinIO/local `.data/objects` | CMEK rotation / HSM |
| **Postgres at rest** — `DATABASE_SSL=true` in shared/prod; compose volume must live on an encrypted disk outside local demo | no-PHI-in-logs verification polish |

Local `docker compose` is HTTP + unencrypted developer volumes on purpose. Do not point it at real PHI.

Demo login: `od@demo.olive.local` / `demo`  
Seeded visit: `00000000-0000-4000-8000-000000000005`

Contracts for FE mocks: [`contracts/openapi.yaml`](contracts/openapi.yaml). Invariants: [`apps/api/docs/hipaa-invariants.md`](apps/api/docs/hipaa-invariants.md). Full ticket notes: [`docs/privacy-tickets.md`](docs/privacy-tickets.md).

### Privacy tickets (Wave A in this PR — not new services)

| ID | In demo Core |
| --- | --- |
| OLI-6 | Consent evidence — `GET /v1/visits/:id/consents` |
| OLI-9 | Server-side refuse — `GET /v1/visits/:id/recording-gate` (FE owns sheet UX) |
| OLI-5 | Sign gate + draft-only `PATCH` |
| OLI-8 | Immutable `notes.snapshot` on sign |
| OLI-11 | Audio hard-delete `ended_at+24h`; notes/transcripts ~10y |
| OLI-15 / OLI-16 | CASL send gate + clinic SMS identity + STOP (stub send) |
| OLI-19 | `phiTrainingAllowed` default false |
| OLI-12 | `tenantId` + roles `dentist` \| `staff` \| `admin` — **no MFA** |
| OLI-13 | `audit_events` on PHI touch |

Wave B (do not block demo): OLI-14 KMS/CMEK later; OLI-12 MFA later; OLI-20 PHIPA fields nullable on clinic.
