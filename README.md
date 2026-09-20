# oliveai

Olive v1 workspace.

## Francesca ASAP — mobile Core on localhost

**Known-good path** (npm in `apps/mobile` only — do not install at the repo root):

```bash
cd apps/mobile && rm -rf node_modules && npm ci && npx expo start --web --port 8081 -c
```

First run: `cp .env.example .env` if `.env` is missing. Open **http://localhost:8081** (mocks; no API process).

**Core loop:** End visit (charcoal slide only) → charcoal **Draft saved** → Today. **Finish day** → Notes to sign → Sign → **All signed. Review follow-ups?** → Follow-ups. Sign is not required to leave Live.

Magic-link inbox is **on Backend PR #1**: `GET /v1/inbox/:token` — not missing. FE route `/inbox/:token`.

Full packet: [`apps/mobile/README.md`](apps/mobile/README.md) · PR https://github.com/franjemin/oliveai/pull/2
