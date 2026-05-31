# InsightHunter — Deployment Guide

## Architecture

```
Browser
   │
   ▼
Cloudflare Pages (insighthunter.app)
   insighthunter-main  ← Astro marketing + auth shell
   functions/api/[[path]].ts
         │  Service Binding
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

---

## 1. One-time infrastructure setup

```bash
# Create KV namespaces
wrangler kv namespace create SESSIONS
wrangler kv namespace create RATE_LIMIT

# Create D1 database for dispatch
wrangler d1 create insighthunter-dispatch

# Create Cloudflare Pages project
wrangler pages project create insighthunter-main
```

Replace all `REPLACE_WITH_*` placeholders in `wrangler.jsonc` files with the IDs printed above.

---

## 2. Set secrets

```bash
# For insighthunter-dispatch
wrangler secret put JWT_SECRET --name insighthunter-dispatch

# For insighthunter-main (Pages)
wrangler pages secret put JWT_SECRET --project-name insighthunter-main
```

---

## 3. Deploy dispatch worker first

```bash
cd insighthunter-dispatch
npm install
wrangler deploy
```

---

## 4. Deploy marketing site to Cloudflare Pages

```bash
cd insighthunter-main
npm install
npm run build         # astro build → outputs to ./dist
wrangler pages deploy dist --project-name insighthunter-main
```

Or connect your GitHub repo in the Cloudflare Pages dashboard:
- **Build command:** `npm run build`
- **Build output directory:** `dist`
- **Node version:** 20

---

## 5. Environment variables (Pages dashboard)

Set these under **Pages → Settings → Environment variables**:

| Variable         | Value                              |
|------------------|------------------------------------|
| `DISPATCH_URL`   | `https://dispatch.insighthunter.app` |
| `AUTH_URL`       | `https://auth.insighthunter.app`   |
| `PUBLIC_APP_URL` | `https://insighthunter.app`        |

---

## 6. Custom domains

In Cloudflare Pages dashboard:
- `insighthunter.app` → insighthunter-main Pages project
- `dispatch.insighthunter.app` → insighthunter-dispatch Worker route

---

## API contract (dispatch → sub-workers)

The dispatch worker injects these headers on every authenticated request.
Sub-workers **trust these headers** — they never re-verify JWTs.

| Header              | Value                        |
|---------------------|------------------------------|
| `X-IH-User`         | userId (UUID)                |
| `X-IH-Org`          | orgId (tenant UUID)          |
| `X-IH-Email`        | user email                   |
| `X-IH-Tier`         | `lite` \| `standard` \| `pro` |
| `X-IH-Request-ID`   | unique request UUID          |
| `X-IH-Dispatch-At`  | ISO timestamp                |

---

## Local development

```bash
# Terminal 1 — dispatch worker
cd insighthunter-dispatch
wrangler dev --port 8787

# Terminal 2 — marketing site (proxies /api/* to local dispatch)
cd insighthunter-main
npm run dev
```
