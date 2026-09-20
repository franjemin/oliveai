# oliveai

Olive v1 workspace.

## Francesca ASAP — mobile Core on localhost

Install and start **from `apps/mobile`** (npm). Do not install at the repo root — `pnpm-workspace.yaml` has no root `package.json`.

After pull:

```bash
cd apps/mobile
npm install
cp .env.example .env
npx expo start --web --port 8081 -c
```

If `expo-linear-gradient` fails to resolve: `cd apps/mobile && npx expo install expo-linear-gradient` then restart with `-c`.

Open **http://localhost:8081** (mocks; no API process).

Magic-link inbox is **on Backend PR #1**: `GET /v1/inbox/:token` — not missing. FE route `/inbox/:token`.

Full packet: [`apps/mobile/README.md`](apps/mobile/README.md) · PR https://github.com/franjemin/oliveai/pull/2
