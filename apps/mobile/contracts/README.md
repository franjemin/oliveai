# Olive Core API contracts (FE snapshot)

**Source of truth is Backend PR #1** (`apps/api` + `contracts/` on
`cursor/olive-v1-core-backend-a0fd`). This folder is a snapshot so the mobile
client can type and map against OpenAPI without editing `apps/api/`.

| File | Use |
| --- | --- |
| [`openapi.yaml`](openapi.yaml) | OpenAPI 3.1 — client types + HTTP paths |
| [`api.md`](api.md) | Human-readable notes (empty/error shapes, SSE, demo IDs) |

Refreshed from Backend PR #1 (`cursor/olive-v1-core-backend-a0fd` @ `07e321b`).  
`DayPatients.unsignedDraft` / `followUpRelease: after_sign` and `POST /v1/days/finish` `{ unsignedDrafts, followUpRelease }` match the PR #1 `days.ts` payload (complete visit without sign; send 403 `unsigned_note` until signed). When that contract moves, copy `contracts/openapi.yaml` + `contracts/api.md` here again and update `apps/mobile/src/api/`. Do not invent parallel route names.

Local base: `http://localhost:3000`  
Auth: `Authorization: Bearer` from `POST /v1/auth/login`.
