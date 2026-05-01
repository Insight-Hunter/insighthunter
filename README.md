# InsightHunter — AI-Powered Auto-CFO SaaS

> Multi-tenant, edge-native business finance platform built entirely on Cloudflare.

## What It Is

InsightHunter gives small businesses an always-on AI CFO. It combines double-entry bookkeeping, payroll processing, business formation, a virtual PBX, and an AI assistant that understands your actual financial data — all running on Cloudflare's global edge.

## Architecture

```
insighthunter-main (Pages + Astro/Svelte)
        │
        ▼  /api/* proxy
insighthunter-dispatch  ←── rate limiting, auth verification, WFP routing
        │
        ├── insighthunter-auth       JWT issuance, sessions, user/org management
        ├── insighthunter-bookkeeping  Double-entry CoA, transactions, reports
        ├── insighthunter-bizforma   Formation, EIN, compliance, Durable Objects
        ├── insighthunter-pbx        Extensions, IVR, voicemail, Twilio webhooks
        ├── insighthunter-payroll    Employees, runs, pay stubs, Queue processing
        └── insighthunter-ai         Workers AI + Vectorize RAG, streaming chat
```

Enterprise orgs get isolated via **Workers for Platforms** — their own dedicated Worker runtime provisioned on demand.

## Quick Start

### 1. Prerequisites

- Cloudflare account with Workers Paid plan
- Node.js 20+
- `wrangler` authenticated: `npx wrangler login`

### 2. Provision Resources (once)

```bash
bash scripts/provision.sh
```

Copy all IDs printed by the command into the corresponding `wrangler.jsonc` files.

### 3. Set Secrets

```bash
bash scripts/secrets.sh
# Then manually:
cd apps/insighthunter-pbx      && npx wrangler secret put TWILIO_AUTH_TOKEN
cd apps/insighthunter-dispatch && npx wrangler secret put CF_API_TOKEN
```

### 4. Deploy

```bash
bash scripts/deploy.sh
```

## Monorepo Structure

```
insighthunter/
  packages/
    @ih/types/          Shared TypeScript interfaces
    @ih/tier-config/    Tier limits, pricing, feature flags
    @ih/auth-client/    JWT sign/verify (Web Crypto only)
  apps/
    insighthunter-auth/         Central auth worker
    insighthunter-dispatch/     WFP dispatch + rate limiting
    insighthunter-bookkeeping/  Double-entry bookkeeping API
    insighthunter-bizforma/     Business formation + compliance
    insighthunter-pbx/          Virtual PBX (Twilio)
    insighthunter-payroll/      Payroll engine + Queues
    insighthunter-ai/           AI CFO (Workers AI + Vectorize)
    insighthunter-main/         Astro + Svelte frontend
  workers-for-platforms/
    tenant-base-worker/         Enterprise tenant Worker template
  scripts/
    provision.sh    One-time Cloudflare resource creation
    deploy.sh       Ordered production deploy
    migrate.sh      Run all D1 schema migrations
    secrets.sh      Set JWT_SECRET across all workers
    seed-tenant.sh  Seed Chart of Accounts for a new org
```

## Tier System

| Feature | Free | Lite | Standard | Pro | Enterprise |
|---|---|---|---|---|---|
| Price | $0 | $29 | $79 | $199 | $999 |
| Transactions/mo | 50 | ∞ | ∞ | ∞ | ∞ |
| AI queries/day | 0 | 10 | 50 | 200 | ∞ |
| Payroll employees | 0 | 0 | 10 | 50 | ∞ |
| PBX extensions | 0 | 0 | 5 | 25 | ∞ |
| Custom Worker | ✗ | ✗ | ✗ | ✗ | ✓ |
| White-label | ✗ | ✗ | ✗ | ✓ | ✓ |
| SLA | — | — | 48h | 24h | 4h |

## Auth Flow

1. User registers/logs in via `insighthunter-auth` → receives JWT access token + refresh token
2. Frontend stores token in `localStorage` and sends as `Authorization: Bearer <token>`
3. `insighthunter-main` Pages function proxies all `/api/*` to `insighthunter-dispatch`
4. Dispatch verifies token by calling `AUTH_WORKER POST /auth/verify` with `X-Internal-Secret`
5. Dispatch injects `X-IH-User` header (JSON AuthUser) into every forwarded request
6. Sub-workers **trust** the `X-IH-User` header — they never re-verify the JWT

## Key Design Decisions

- **Single JWT_SECRET** shared across all workers for inter-service trust via `X-Internal-Secret`
- **Org isolation** enforced at D1 query level — every query has `WHERE org_id = ?`
- **Fire-and-forget Analytics** — `writeDataPoint` is never awaited
- **Report caching** in KV with 5-minute TTL, busted on every POSTED transaction
- **Queue-based payroll** — calculation is synchronous, pay stub generation is async via Queue

## Development

```bash
# Install all workspace deps
npm install

# Run a single worker in dev mode
cd apps/insighthunter-auth && npx wrangler dev

# Type check all packages
npm run typecheck
```

## Cloudflare Services Used

| Service | Purpose |
|---|---|
| D1 | Relational data per worker |
| KV | Sessions, rate limits, report cache, usage counters |
| R2 | Receipts, documents, voicemail, pay stubs |
| Queues | Async payroll processing |
| Workers AI | LLM inference + embeddings |
| Vectorize | RAG vector search for financial docs |
| Durable Objects | Formation state machine, compliance alarms, call sessions |
| Workers for Platforms | Isolated enterprise tenant runtimes |
| Analytics Engine | Event tracking across all workers |
| Pages | Astro/Svelte frontend hosting |

# Insight Hunter

## Structure
```
public/   → Cloudflare Pages  (static HTML/CSS/JS)
apps/     → Cloudflare Workers (API services)
docs/     → Documentation
```

## Quick Start
```bash
# Deploy pages
# Push to main — GitHub Actions handles it

# Run a worker locally
cd apps/insighthunter-auth
npm install
npm run dev
```
