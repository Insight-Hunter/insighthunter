# InsightHunter — Cloudflare Deployment Guide

## Architecture
```
Browser
  │
  ▼
Cloudflare Pages  (insighthunter.app)
  insighthunter-main   ← Astro marketing + auth shell
  functions/api/[[path]].ts
        │  Service Binding: DISPATCH_WORKER
        ▼
  insighthunter-dispatch  ← Central API Gateway Worker
        │  CORS · Rate Limiting · JWT Auth · Routing
        ├──► insighthunter-auth
        ├──► insighthunter-bookkeeping
        ├──► insighthunter-payroll
        ├──► insighthunter-bizforma
        ├──► insighthunter-scout
        ├──► insighthunter-pbx
        └──► insighthunter-report
```

## Cloudflare Dashboard — Pages Setup

### dash.cloudflare.com → Pages → Create a project → Connect to Git

| Field                     | Value                                     |
|---------------------------|-------------------------------------------|
| Project name              | `insighthunter-main`                      |
| Production branch         | `main`                                    |
| Build command             | `npm run build`                           |
| Build output directory    | `dist`                                    |
| Root directory (monorepo) | `insighthunter-main`                      |
| Node.js version           | `20`                                      |

### Environment Variables (Settings → Environment variables)

| Variable           | Value                                    | Environment      |
|--------------------|------------------------------------------|------------------|
| `PUBLIC_APP_URL`   | `https://insighthunter.app`              | Production       |
| `DISPATCH_URL`     | `https://dispatch.insighthunter.app`     | Production       |
| `AUTH_URL`         | `https://auth.insighthunter.app`         | Production       |
| `JWT_SECRET`       | *(generate: openssl rand -hex 32)*       | Production + Dev |

### Service Bindings (Settings → Functions → Service bindings)

| Variable name     | Service                     |
|-------------------|-----------------------------|
| `DISPATCH_WORKER` | `insighthunter-dispatch`    |

### KV Namespace Bindings (Settings → Functions → KV namespace bindings)

| Variable name | KV namespace     |
|---------------|------------------|
| `SESSIONS`    | `ih-sessions`    |

---

## One-time CLI setup

```bash
# 1. Create KV namespaces
wrangler kv namespace create ih-sessions
wrangler kv namespace create ih-rate-limit

# 2. Create D1 database for dispatch
wrangler d1 create insighthunter-dispatch

# 3. Set dispatch secrets
wrangler secret put JWT_SECRET --name insighthunter-dispatch

# 4. Deploy dispatch worker
cd insighthunter-dispatch && npm install && wrangler deploy

# 5. Build & deploy Pages (or push to git — Pages auto-builds)
cd insighthunter-main && npm install && npm run build
wrangler pages deploy dist --project-name insighthunter-main
```

## Local development

```bash
# Terminal 1
cd insighthunter-dispatch && wrangler dev --port 8787

# Terminal 2
cd insighthunter-main && npm run dev
```

## Header contract (dispatch → sub-workers)

| Header             | Value                         |
|--------------------|-------------------------------|
| `X-IH-User`        | userId (UUID)                 |
| `X-IH-Org`         | orgId (tenant UUID)           |
| `X-IH-Email`       | user email                    |
| `X-IH-Tier`        | `lite` / `standard` / `pro`  |
| `X-IH-Request-ID`  | unique request UUID           |
| `X-IH-Dispatch-At` | ISO timestamp                 |
