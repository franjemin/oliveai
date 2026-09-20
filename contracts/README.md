# Olive Core API contracts

Backend (`apps/api`) is the **source of truth**. Frontend consumes these files; do not invent parallel route names.

| File | Use |
| --- | --- |
| [`openapi.yaml`](openapi.yaml) | OpenAPI 3.1 for codegen / MSW / Orval |
| [`api.md`](api.md) | Human-readable FE notes (empty/error shapes, SSE cursor, demo IDs) |

Base URL (local): `http://localhost:3000`  
Auth: `Authorization: Bearer <token>` from `POST /v1/auth/login`.
