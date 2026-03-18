### 1. Clone & Install

```bash
git clone https://github.com/Insight-Hunter/insighthunter.git
cd insighthunter
npm install
```

### 2. Authenticate with Cloudflare

```bash
# Option A — browser login (local machine)
wrangler login

# Option B — API token (cloud IDE, CI/CD)
export CLOUDFLARE_API_TOKEN=your_api_token
# Get token: dash.cloudflare.com → My Profile → API Tokens → Edit Cloudflare Workers
```

### 3. Create Cloud Resources (run once)

```bash
bash bootstrap.sh
```

This creates your D1 database, KV namespaces, R2 buckets, Queues, and Vectorize index. Copy the printed IDs into `wrangler.toml`.

### 4. Set Secrets

```bash
wrangler secret put JWT_SECRET
wrangler secret put TWILIO_ACCOUNT_SID   # for PBX
wrangler secret put TWILIO_AUTH_TOKEN    # for PBX
```

### 5. Run Migrations

```bash
bash migrate.sh local       # test locally
bash migrate.sh production  # apply to Cloudflare D1
```

### 6. Local Development

```bash
wrangler dev --local --persist
# → http://localhost:8787
```

### 7. Deploy to Production

```bash
wrangler deploy
# → https://insighthunter.YOUR_SUBDOMAIN.workers.dev
```

---

## Connecting Frontend to Backend

All HTML pages in `public/` connect to the backend via the shared `api.js` client using **relative URLs** — no hardcoded domain, no CORS required.

```html
<!-- Add to every dashboard HTML page -->
<script src="/js/api.js"></script>
<script src="/auth/guard.js"></script>
```

```js
// Anywhere in your page scripts
const summary = await api.summary('2026-01-01', '2026-03-31')
const insight = await api.quickInsight()
const txns    = await api.transactions({ limit: '25', type: 'expense' })
```

All API calls automatically:
- Send session cookies (`credentials: 'include'`)
- Redirect to `/auth/login.html` on 401
- Return parsed JSON or throw a typed error

---

## Environment Variables

Set in `wrangler.toml` (non-sensitive) or via `wrangler secret put` (sensitive):

| Variable | Where | Description |
|---|---|---|
| `JWT_SECRET` | Secret | Signs and verifies session tokens |
| `ALLOWED_ORIGINS` | `wrangler.toml` | CORS origin whitelist |
| `SESSION_TTL_SECONDS` | `wrangler.toml` | Session expiry (default: 86400) |
| `AI_MODEL` | `wrangler.toml` | Workers AI model for chat |
| `TWILIO_ACCOUNT_SID` | Secret | PBX — Twilio account |
| `TWILIO_AUTH_TOKEN` | Secret | PBX — Twilio auth |
| `TWILIO_SIGNING_KEY` | Secret | PBX — webhook signature validation |
| `STRIPE_SECRET_KEY` | Secret | Payment processing (Pro upgrades) |

---

## CI/CD

Automatic deployment on push to `main` via GitHub Actions.

Add one secret to your GitHub repo:

```
GitHub → Settings → Secrets → Actions
Name:  CF_API_TOKEN
Value: (Cloudflare API token with Workers + Pages edit permissions)
```

The workflow deploys the Worker automatically on every push to `main`.

---
