# oliveai

Olive v1 workspace.

## Francesca ASAP — mobile Core on localhost

**Preferred stable URL:** **http://localhost:8081** from a production static export (avoids React 19 DEV `performance.measure` OOM / DataCloneError).

```bash
cd apps/mobile
rm -rf node_modules && npm ci
cp .env.example .env   # first run only
npm run web:static
npx --yes serve dist -l 8081
```

**Interim (Metro, production bundle):** `npx expo start --web --port 8081 --no-dev -c`

Do not install at the repo root.

**Core loop:** End visit (charcoal slide only) → charcoal **Draft saved** → Today. **Finish day** → Notes to sign → Sign → **All signed. Review follow-ups?** → Follow-ups. Sign is not required to leave Live.

Magic-link inbox is **on Backend PR #1**: `GET /v1/inbox/:token` — not missing. FE route `/inbox/:token`.

Full packet: [`apps/mobile/README.md`](apps/mobile/README.md) · PR https://github.com/franjemin/oliveai/pull/2
