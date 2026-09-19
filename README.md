# oliveai

Olive v1 Core — Canada-first dental AI scribe.

## Layout

The repo was **backend-only** (initial README commit). The API therefore lives at the **repository root** so compose, migrate, seed, and the curl happy path have no monorepo hop.

When Frontend lands, put it in `apps/web` (or `frontend/`) and leave this root `package.json` as the API. Contracts are `/v1/*` regardless of later moving the API to `apps/api`.

| Path | Role |
| --- | --- |
| `src/` | Fastify API, worker, Drizzle schema, vendors |
| `drizzle/0000_init.sql` | Working migration |
| `docs/api.md` | FE contracts |
| `docs/hipaa-invariants.md` | PHIPA / CASL / retention locks |
| `docker-compose.yml` | Postgres 16 + MinIO (ca-central-1) |
| `scripts/happy-path.sh` | visit → consent → audio → transcript → note sign → follow-up send/skip |

## Stack

TypeScript, Node 20+, Fastify, Postgres, Drizzle, Zod, Vitest. Object store: MinIO in compose, encrypted local filesystem fallback for tests/offline. TranscriptionVendor is a **stub until BAA**. MessagingVendor and PmsAdapter are fakes.

## Run locally

```bash
cp .env.example .env
docker compose up -d
npm install
npm run db:migrate
npm run db:seed
npm start          # API :3000
# other terminal
npm run worker     # or: npm run worker:once
```

Demo login: `od@demo.olive.local` / `demo`  
Seeded visit: `00000000-0000-4000-8000-000000000005` (Alex Rivera @ Harbourfront Dental).  
Clinic PHIPA columns exist and are **null** on purpose (do not block scaffold).

### Curl happy path

With API running (worker optional — the script uses `POST /v1/dev/process-jobs`):

```bash
chmod +x scripts/happy-path.sh
./scripts/happy-path.sh
```

That covers: login/session → recording-gate deny → visit-scoped consent → gate allow → audio ingest → transcript job → SSE stream → draft note → **explicit** sign → CASL follow-up send → skip → visit end (audio TTL) → day finish / day patients.

## Tests

```bash
npm test
```

Invariant coverage: no audio without consent; signed notes immutable; SMS without messaging consent fails; promotional fail-closed; no send from unsigned notes; audio delete does not cascade notes/transcripts; flags (including training) default off.

## Product locks (do not regress)

- Audio `delete_after = visit.ended_at + 24h`; notes + transcripts ~10y; never cascade-delete with audio
- Visit-scoped `audio_capture` + versioned disclosure/script id
- CASL-first messaging, clinic identity on SMS, STOP fail-closed
- Draft-until-sign; never auto-sign or send from unsigned notes
- Training flag off; express patient consent required later (not contract-only)
- Canada-first residency via config; Quebec Law 25 out of v1
- OD write-back stub returns 501 / flagged
