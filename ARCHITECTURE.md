InsightHunter — Architecture Document

> **Version:** 1.0 | **Updated:** June 2026 | **Repo:** [github.com/Insight-Hunter/insighthunter](https://github.com/Insight-Hunter/insighthunter)

---

## Executive Summary

InsightHunter is a **multi-tenant, edge-native SaaS platform** that delivers CFO-grade financial intelligence to small and mid-size businesses. The system is a Turborepo/pnpm monorepo of **20+ Cloudflare Workers microservices**, a primary Astro/Svelte/React frontend, and a suite of Cloudflare-managed data stores (D1, R2, KV, Queues, Durable Objects).

All compute runs at Cloudflare's edge — zero cold-start servers, no VMs, no containers.

---

## System Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         CLOUDFLARE EDGE NETWORK                             │
│                                                                             │
│  ┌──────────────────┐     ┌────────────────────────────────────────────┐   │
│  │  insighthunter-  │     │           MICROSERVICE WORKERS              │   │
│  │  main (Astro)    │────▶│  auth · ledger · finops · advisor · report │   │
│  │  Marketing +     │     │  bookkeeping · payroll · bizforma · scout  │   │
│  │  Dashboard SPA   │     │  notifications · compliance · dispatch     │   │
│  └──────────────────┘     │  cron · pbx · whitelabel · platform        │   │
│          │                └──────────────────┬─────────────────────────┘   │
│          │ JWT (RS256)                        │                             │
│          ▼                                   ▼                             │
│  ┌──────────────────┐     ┌──────────────────────────────────────────────┐ │
│  │  insighthunter-  │     │               DATA LAYER                     │ │
│  │  auth (Hono)     │     │  D1 (SQL) · R2 (Objects) · KV · Queues      │ │
│  │  JWT issuance    │     │  Durable Objects (Workflows/WebSockets)      │ │
│  └──────────────────┘     └──────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Monorepo Layout

```
/
├── apps/                         # All deployable services
│   ├── insighthunter-main/       # Astro frontend (marketing + dashboard)
│   ├── insighthunter-auth/       # Auth service (Hono + JWT)
│   ├── insighthunter-advisor/    # AI financial advisor (Workers AI)
│   ├── insighthunter-ledger/     # Double-entry ledger engine
│   ├── insighthunter-finops/     # Financial operations (expenses, approvals)
│   ├── insighthunter-bookkeeping/# Bookkeeping + reconciliation
│   ├── insighthunter-payroll/    # Payroll engine
│   ├── insighthunter-bizforma/   # Business formation & compliance
│   ├── insighthunter-report/     # PDF report generation
│   ├── insighthunter-reports/    # Report storage/retrieval
│   ├── insighthunter-scout/      # Data scraping & market intelligence
│   ├── insighthunter-notifications/ # Notification queue consumer
│   ├── insighthunter-compliance/ # Regulatory compliance service
│   ├── insighthunter-cron/       # Scheduled job orchestrator
│   ├── insighthunter-dispatch/   # Event routing / fan-out
│   ├── insighthunter-pbx/        # Cloud phone (PBX)
│   ├── insighthunter-whitelabel/ # Partner white-label service
│   ├── insighthunter-pro-services/ # CF Domain registration, hosting, web services
│   ├── insighthunter-roadmap/    # Internal roadmap tracker
│   ├── ih-platform-worker/       # Core tenant management worker
│   └── ih-tenant-template/       # Bootstrap template for new tenants
├── packages/                     # Shared libraries (UI, types, utils)
├── shared/                       # Cross-worker middleware (auth, validators)
│   └── middleware/
│       └── session-validator.ts  # JWT validation for all workers
├── scripts/                      # CI/CD and deployment automation
├── docs/                         # Documentation (this dir)
├── turbo.json                    # Turborepo pipeline
└── pnpm-workspace.yaml           # Workspace package registry
```

---

## Technology Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| **Frontend** | Astro, Svelte, React | Island architecture SPA/SSR |
| **API Framework** | Hono | Lightweight Workers-native HTTP router |
| **Edge Compute** | Cloudflare Workers | All backend logic |
| **Relational DB** | Cloudflare D1 (SQLite) | Structured financial data |
| **Object Storage** | Cloudflare R2 | Documents, reports, receipts |
| **Key-Value** | Cloudflare KV | Config, sessions, feature flags |
| **Async Messaging** | Cloudflare Queues | Decoupled event processing |
| **Stateful Workflows** | Durable Objects | Multi-step approvals, WebSockets |
| **AI Inference** | Cloudflare Workers AI | LLM-powered financial advisor |
| **Build System** | Turborepo + pnpm | Monorepo task orchestration |
| **Language** | TypeScript (ES Modules) | All workers + packages |

---

## Service Catalog

| Service | Worker Name | Primary DB | Key Queues |
|---------|------------|-----------|-----------|
| Auth | `insighthunter-auth` | KV (sessions) | — |
| Ledger | `insighthunter-ledger` | `ih-ledger` (D1) | `ih-ledger-rules`, `ih-ledger-sync` |
| FinOps | `insighthunter-finops` | `ih-finops` (D1) | `ih-finops-approvals`, `ih-finops-receipts`, `ih-finops-pdf`, `ih-finops-reminders` |
| Advisor | `insighthunter-advisor` | `ih-advisor` (D1) | — |
| Bookkeeping | `insighthunter-bookkeeping` | `ih-ledger` (D1) | `ih-ledger-sync` |
| Payroll | `insighthunter-payroll` | `ih-finops` (D1) | `ih-finops-approvals` |
| Reports | `insighthunter-report` | R2 (`ih-documents`) | `ih-finops-pdf` |
| Notifications | `insighthunter-notifications` | — | `ih-notifications`, `ih-notifications-dlq` |
| Scout | `insighthunter-scout` | — | — |
| Platform | `ih-platform-worker` | All | — |

---

## D1 Database Schema Overview

### `ih-advisor` — AI Advisor
- `conversations` — Chat sessions per org
- `messages` — Turn-by-turn history
- `insights` — Generated financial insights
- `alerts` — Anomaly/threshold alerts

### `ih-ledger` — Double-Entry Ledger
- `accounts` — Chart of accounts (`org_id`, `type`, `code`, `name`)
- `journal_entries` — Immutable financial events (`org_id`, `date`, `debit_account_id`, `credit_account_id`, `amount_cents`, `currency`)
- `transaction_rules` — Auto-categorization rules
- `reconciliation_sessions` — Bank reconciliation state

### `ih-finops` — Financial Operations
- `expenses` — Expense reports (`org_id`, `submitted_by`, `amount_cents`, `status`)
- `approvals` — Approval workflow state
- `receipts` — R2 document references
- `budgets` — Budget envelopes per org

### `ih-vault-meta` — Secrets Metadata
- `vault_entries` — Encrypted key references (never raw secrets in DB)

---

## Cloudflare Queue Architecture

```
[User Action] ─▶ [Worker Produces Message] ─▶ [Queue] ─▶ [Consumer Worker]

ih-notifications       → insighthunter-notifications (email/webhook dispatch)
ih-notifications-dlq   → Dead-letter queue for notification failures
ih-ledger-rules        → Rule engine for auto-categorization
ih-ledger-sync         → Async sync to bookkeeping
ih-finops-approvals    → Multi-step approval workflows
ih-finops-receipts     → OCR + receipt attachment processing
ih-finops-pdf          → PDF report generation pipeline
ih-finops-reminders    → Scheduled reminders for pending approvals
```

---

## Security Architecture

- **JWT Authentication:** All workers validate RS256 JWTs issued by `auth.insighthunter.app` via `shared/middleware/session-validator.ts`
- **JWT Payload:** `{ sub: userId, orgId, email, role, plan, firmId? }`
- **Tenant Isolation:** Every D1 query is scoped by `org_id` — no cross-tenant data leakage
- **Encryption at Rest:** Sensitive values (bank account numbers, vault keys) encrypted via `crypto.subtle` inside the Worker before storage
- **Secrets:** All API keys/secrets injected via `wrangler secret put` — never hardcoded
- **Role-Based Access:** `role` from JWT payload enforced per endpoint

---

## Data Flow — Expense Submission Example

```
1. User submits expense in insighthunter-main (Astro SPA)
2. POST /api/expenses → insighthunter-finops Worker
3. Worker validates JWT (session-validator.ts)
4. Worker writes expense row to ih-finops D1 (scoped by org_id)
5. Worker enqueues message to ih-finops-approvals Queue
6. Approval workflow Durable Object activates, notifies approver
7. Approver approves → Worker enqueues to ih-notifications
8. insighthunter-notifications consumes → sends email via Resend API
9. Worker enqueues to ih-finops-pdf
10. insighthunter-report generates PDF → stores in R2 ih-documents
```

---

## Architectural Principles

1. **Tenant Scoping First** — `org_id` on every query, no exceptions
2. **Edge-Only Compute** — no origin servers; all logic in Workers
3. **Async by Default** — high-volume ops go through Queues
4. **Stateful via Durable Objects** — approvals, WebSockets, long-running workflows
5. **Encrypt Sensitive Data** — `crypto.subtle` in-Worker before D1 storage
6. **Centralized Notifications** — single `ih-notifications` queue for all outbound channels
7. **Shared Auth Middleware** — one `session-validator.ts` used by all workers

---

## Deployment Topology

All services deploy to Cloudflare's global edge network. The `scripts/deploy.sh` script orchestrates deployment order:

```
1. ih-platform-worker  (core platform, deploy first)
2. insighthunter-auth  (auth must be up before other services)
3. insighthunter-ledger, insighthunter-finops, insighthunter-advisor
4. insighthunter-bookkeeping, insighthunter-payroll, insighthunter-report
5. insighthunter-notifications, insighthunter-cron, insighthunter-dispatch
6. insighthunter-main  (frontend deploys last)
```
