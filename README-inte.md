t# InsightHunter — Mercury Integration Workers & Apps

Generated: April 2026  
Stack: Cloudflare Workers · Hono · D1 · R2 · Queues · Workflows · Workers AI · Browser Rendering

---

## New Apps & Workers

| App | Worker Name | URL | Purpose |
|-----|-------------|-----|---------|
| **insighthunter-advisor** | `ih-advisor-api` | advisor.insighthunter.app/api | Firm management, client switcher, alerts, tasks |
| | `ih-advisor-intelligence` | Cron (every 6h) | Health scoring + AI advisory insights |
| **insighthunter-ledger** | `ih-ledger-api` | ledger.insighthunter.app/api | Transactions, GL accounts, rules, close cycles |
| | `ih-ledger-rules` | Queue consumer | Auto-categorization engine (rules + AI) |
| | `ih-ledger-close` | Durable Workflow | Month-end close orchestration |
| | `ih-ledger-sync` | Queue consumer | QBO / Xero sync |
| **insighthunter-finops** | `ih-finops-api` | finops.insighthunter.app/api | Bills, vendors, reimbursements, AR invoices |
| | `ih-finops-approvals` | Durable Workflow | Multi-step bill approval chain |
| | `ih-finops-receipts` | Queue consumer | Receipt OCR + amount validation |
| | `ih-finops-pdf` | Queue consumer | Invoice PDF generation via Browser Rendering |
| | `ih-finops-reminders` | Cron + Queue | Due-date reminder alerts |
| **shared/notification-queue** | `ih-notification-queue` | Queue consumer | Central notification dispatcher (in-app, email, webhook) |
| **shared/document-vault** | `ih-document-vault` | vault.insighthunter.app | R2-backed document gateway with signed URLs |

---

## D1 Databases to Create

```bash
wrangler d1 create ih-advisor
wrangler d1 create ih-ledger
wrangler d1 create ih-finops
wrangler d1 create ih-vault-meta
wrangler d1 create ih-notifications
```

Update all `REPLACE_DB_ID_*` placeholders in `wrangler.jsonc` files with the returned IDs.

---

## Queues to Create

```bash
wrangler queues create ih-notifications
wrangler queues create ih-notifications-dlq
wrangler queues create ih-ledger-rules
wrangler queues create ih-ledger-sync
wrangler queues create ih-finops-approvals
wrangler queues create ih-finops-receipts
wrangler queues create ih-finops-pdf
wrangler queues create ih-finops-reminders
```

---

## R2 Buckets

```bash
wrangler r2 bucket create ih-documents
```

---

## Secrets to Set Per Worker

```bash
# Repeat for each worker name
wrangler secret put AUTH_SECRET         --name ih-advisor-api
wrangler secret put VAULT_ENCRYPTION_KEY --name ih-finops-api
wrangler secret put RESEND_API_KEY       --name ih-notification-queue
wrangler secret put WEBHOOK_SIGNING_SECRET --name ih-notification-queue
```

---

## Run Migrations

```bash
wrangler d1 execute ih-advisor  --file=apps/insighthunter-advisor/migrations/0001_initial.sql
wrangler d1 execute ih-ledger   --file=apps/insighthunter-ledger/migrations/0001_initial.sql
wrangler d1 execute ih-finops   --file=apps/insighthunter-finops/migrations/0001_initial.sql
```

---

## Deploy Order

1. `shared/workers/notification-queue` — must exist before any app sends notifications
2. `shared/workers/document-vault`
3. `apps/insighthunter-advisor`
4. `apps/insighthunter-ledger`
5. `apps/insighthunter-finops`

---

## Shared Auth

All workers validate sessions issued by `auth.insighthunter.app` using `shared/middleware/session-validator.ts`.  
JWT payload must include: `sub` (userId), `orgId`, `email`, `role`, `plan`.  
Optional: `firmId` — present when user belongs to an accounting firm.

---

## Key Design Rules

- Every D1 query is scoped by `org_id` as the universal tenant key
- Bank account numbers are encrypted at rest with AES-GCM via `crypto.subtle` inside the Worker
- High-volume imports go through Queues — never bulk-insert from an edge request
- Durable Workflows for multi-step state (close cycles, bill approvals) — never use KV for this
- `NOTIFICATIONS` queue is the single fan-out point for all alerts — no direct email calls from app workers
