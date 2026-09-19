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

Contracts for FE mocks: [`contracts/openapi.yaml`](contracts/openapi.yaml). Invariants: [`apps/api/docs/hipaa-invariants.md`](apps/api/docs/hipaa-invariants.md). Privacy ticket map: [`docs/privacy-tickets.md`](docs/privacy-tickets.md) (OLI-5/6/8/9/11/12/13/15/16/19 Wave A).
