# Bookkeeping Product and Technical Architecture

## 1. Product positioning

A continuously reviewable bookkeeping workspace for business owners and their
finance teams. It brings transaction intake, double-entry records,
reconciliation, receivables, payables, documents, reporting, and period close
into one auditable workflow. Automated categorization is advisory; only an
authorized person can post or lock accounting records.

## 2. Application structure

```text
apps/insighthunter-bookkeeping/
  src/
    index.ts                   Hono API, auth boundary, business operations
    pages/                      Astro server-rendered workspace routes
      index.astro
      [section].astro
      api/[...path].ts          Routes /api requests into the API Worker
    layouts/AppLayout.astro     Accessible navigation and application shell
    scripts/app.ts              Typed browser interactions and screen rendering
    queues/import-processing.ts Replay-safe CSV intake consumer
    services/
      bank-statement-normalizer.ts
      csv-parser.ts
      entitlements.ts
      tenant-boundary.ts
  migrations/                   Ordered D1 migrations; source of schema truth
  astro.config.mjs
  wrangler.toml                 Worker, D1, R2, Queue, and KV bindings
```

## 3. Route map

| Screen | Route | Main actions |
|---|---|---|
| Overview | `/overview` | Cash, sync state, review queue, close tasks, exceptions, month totals |
| Transactions | `/transactions` | Search/list, manual entry, CSV import, review |
| Journal | `/journal` | Draft balanced entries and post as an authorized reviewer |
| Reconcile | `/reconcile` | Open statement periods, match in-period account activity, inspect differences |
| Invoices | `/invoices` | Create drafts, mark sent/viewed, void with reviewer approval |
| Bills | `/bills` | Intake bills, submit for approval, approve or void |
| Reports | `/reports` | Run supported financial reports for a date range |
| Close | `/close` | Create period checklist, complete tasks, lock/reopen with reason |
| Documents | `/documents` | Upload and retrieve private supporting files |
| Exceptions | `/exceptions` | Prioritized exception queue |
| Settings | `/settings` | Chart of accounts and categories |

## 4. Component architecture

- `AppLayout.astro` provides semantic landmarks, a keyboard-accessible skip
  link, responsive primary navigation, and page headings.
- `[section].astro` resolves the supported workspace route and renders the
  shared layout.
- `app.ts` progressively loads screen data from same-origin authenticated API
  routes, renders user-supplied values as text, and reports failed operations
  visibly.
- `src/index.ts` owns authentication, tenant context, validation, role checks,
  database writes, and audit events. Financial operations do not rely on
  client-side authorization.
- Queue processing is separated from synchronous Worker requests. Imports
  remain staged until an authenticated user reviews and commits them to the
  transaction queue.

## 5. Data model

Tenant lineage is represented by `client_id` (the bookkeeping tenant) and
`entity_id` (the legal business entity). The verified authentication token
supplies the organization and actor; request headers cannot select a tenant.

Core records include:

- Tenant and entity: `bookkeeping_clients`, `bookkeeping_entities`.
- Roles: `bookkeeping_team_assignments` plus verified organization roles.
- Chart of accounts and categories: `bookkeeping_accounts`,
  `bookkeeping_categories`, and `bookkeeping_categorization_rules`.
- Intake and canonical activity: `bookkeeping_imports`,
  `bookkeeping_import_batches`, `bookkeeping_staged_transactions`, and
  `bookkeeping_transactions`.
- Double-entry ledger: `bookkeeping_journal_entries`,
  `bookkeeping_journal_lines`, and `bookkeeping_accounting_periods`.
- Receivables, payables, and payments: `bookkeeping_invoices`,
  `bookkeeping_bills`, and `bookkeeping_payments`.
- Files and lineage: `bookkeeping_documents` and
  `bookkeeping_document_links`; the file body is stored privately in R2.
- Reconciliation and close: `bookkeeping_reconciliation_sessions`,
  `bookkeeping_reconciliation_matches`, `bookkeeping_close_periods`,
  `bookkeeping_close_tasks`, and task dependency records.
- Collaboration and controls: `bookkeeping_comments`,
  `bookkeeping_exceptions`, `bookkeeping_ai_suggestions`, and the append-only
  `bookkeeping_audit_log`.

Financial amounts are stored as integer minor units. Posted journal entries
must have equal, non-zero debit and credit totals. Posted lines and audit
events cannot be updated or deleted through the database schema. Corrections
are represented by new records rather than rewriting posted history.

## 6. Cloudflare services architecture

- **Astro SSR and Workers:** serve authenticated operational screens and the
  same-origin API.
- **D1:** system of record for tenant-scoped ledger, workflow, reconciliation,
  document metadata, and audit data.
- **R2:** private storage for source imports and supporting documents; clients
  retrieve files only through an authenticated Worker response.
- **Queues:** asynchronous bank-file parsing with retry and dead-letter
  configuration.
- **KV:** short-lived import status cache only; it is not financial authority.
- **Workers AI:** optional category suggestion support. Suggestions include an
  explanation and require a human decision; AI never posts an entry.
- **Observability:** Worker observability is enabled. Logs contain safe error
  names and workflow identifiers, not document contents or financial payloads.

The D1 deployment uses logical tenant isolation: every query and mutation is
scoped to the authenticated tenant, and tenant-owned records include tenant
lineage. Separate per-tenant Worker provisioning is not currently required.

## 7. D1 schema and integrity controls

`migrations/0001_bookkeeping_foundation.sql` establishes tenant, import,
document, reconciliation, close, team, and audit foundations.
`migrations/0002_bookkeeping_operations.sql` adds entities, accounts,
period locks, journal records, canonical transactions, category suggestions,
reconciliation sessions, invoice/bill/payment records, comments, exceptions,
indexes, and financial integrity triggers.

Important database controls:

1. Journal lines must belong to the same tenant/entity as both the account and
   journal entry.
2. A journal entry cannot be posted unless debit and credit totals are equal
   and non-zero.
3. Entries dated in a locked accounting period cannot be posted.
4. Posted journal lines and audit events are immutable.
5. Close periods cannot be locked while checklist tasks remain incomplete.

## 8. Durable Objects and Workflows

The current app uses D1 for durable workflow state and Queues for import
processing. A Durable Object is not needed for the present request/response
flows; it should be introduced only if per-tenant coordination or serialized
bank-feed reconciliation is required.

The durable month-end sequence is persisted in close-period, task,
dependency, certification, and audit records. A Cloudflare Workflow can be
added for long-running close-package generation and multi-step data-source
sync after those external operations are configured.

## 9. R2 document strategy

Objects use opaque keys under `private/{clientId}/{entityId}/{documentId}`.
Upload validates size and supported MIME type, computes a SHA-256 digest, and
stores uploader, category, entity, and linkage metadata in D1. No public
object URL is returned. Retrieval first checks tenant ownership, then streams
the object with `private, no-store` and `nosniff` headers.

Retention policy, legal hold, malware scanning, OCR extraction, and signed
temporary links are planned extensions; they are not represented as complete
in this release.

## 10. Queue job map

| Job | Input | Behavior | Replay control |
|---|---|---|---|
| CSV import | Import ID, R2 key, organization ID | Parse, normalize, fingerprint, stage, report duplicate/warning counts | Stable import/batch ID and unique tenant fingerprint |
| Import review/commit | Authenticated user action | Convert approved staging rows to pending canonical transactions | Staging status and canonical unique fingerprint |
| Report package | Planned | Generate CSV/PDF workpapers in R2 | Idempotency key per entity/report/period |
| OCR and anomaly scan | Planned | Extract document fields and create ranked exceptions | Source document digest and job ID |

Queue consumers must only acknowledge terminally processed messages. Retryable
storage/database errors use queue retry; invalid input is persisted as a
failed import with a non-sensitive reason.

## 11. Permissions matrix

| Action | Owner/Admin | Bookkeeper/Member | Reviewer/CFO | Viewer |
|---|---:|---:|---:|---:|
| View tenant records | Yes | Yes | Yes | Yes |
| Create transactions, accounts, imports, documents | Yes | Yes | Yes | No |
| Create balanced journal drafts | Yes | Yes | Yes | No |
| Post journal entries | Yes | No | Yes | No |
| Approve bills | Yes | No | Yes | No |
| Complete close tasks | Yes | Yes | Yes | No |
| Lock/reopen a period | Yes | No | No* | No |
| Reopen with reason | Yes | No | No | No |

`*` Review certification and accounting-period locking are distinct controls;
the current route requires owner/admin to lock or reopen. Team membership is
validated against the tenant assignment table. Every mutation still validates
ownership at the database boundary.

## 12. API contracts

All `/api/*` endpoints require a verified bearer token or session cookie.
JSON requests use typed, bounded validation; financial amounts use integer
minor units.

| Endpoint | Contract summary |
|---|---|
| `GET /api/overview` | Aggregated cash, sync, categorization, reconciliation, close, exception, income, and expense state |
| `GET /api/accounts`, `POST /api/accounts` | List/create entity-scoped chart accounts |
| `GET /api/categories`, `POST /api/categories` | List/create categories |
| `GET /api/transactions`, `POST /api/transactions`, `PATCH /api/transactions/:id` | Filter/search, capture pending activity, categorize/review |
| `POST /api/ai-assistance/categorize` | Return an explainable suggestion; never changes a transaction |
| `GET/POST /api/journal-entries`, `POST /api/journal-entries/:id/post` | List entries, create balanced drafts, and explicitly post through an authorized reviewer |
| `POST /api/imports/upload`, `GET /api/imports/recent`, `GET /api/imports/:id`, `PATCH /api/imports/rows/:id`, `POST /api/imports/:id/commit` | Upload, list, review, and explicitly commit staged transactions |
| `GET/POST /api/reconcile/sessions`, `POST /api/reconcile/sessions/:id/matches` | Open periods and link same-account, in-period transactions with a recorded rationale |
| `GET/POST/PATCH /api/invoices` | Create/list invoices and move through draft, sent, viewed, or void states |
| `GET/POST/PATCH /api/bills` | Create/list bills and submit/approve/void with role checks |
| `GET/POST /api/documents`, `GET /api/documents/:id/content` | Store metadata and privately retrieve documents |
| `GET /api/reports/:type` | Return trial balance, general ledger, P&L, balance sheet, and AR/AP aging data |
| `GET/POST /api/close/periods`, `GET /api/close/periods/:id/tasks`, `PATCH /api/close/tasks/:id` | Create and progress an auditable checklist |
| `POST /api/close/periods/:id/lock`, `POST /api/close/periods/:id/reopen` | Lock only a complete period; require a reopen reason |
| `GET /api/exceptions` | Return open exception queue ordered by severity and materiality |

## 13. Key UI screen specifications

- **Overview:** compact, drillable operating metrics and next actions.
- **Transactions:** searchable queue, manual capture, and CSV import without
  implicit posting.
- **Reconciliation:** statement period, account, beginning/ending balances,
  match status, and reconciliation history.
- **Invoices/Bills:** customer/vendor, issue/due dates, amount, approval or
  delivery state, and aging context.
- **Reports:** period selection and typed report output.
- **Close:** period checklist, task owner/status, completion progress, and
  explicit lock/reopen action.
- **Documents:** private upload, category, size, and retrieval.
- **Settings:** entity chart of accounts and categorization list.

## 14. Reporting design

Reports are computed from posted journal lines, grouped by entity account.
Draft and pending journal entries do not affect financial statements. Every
summary result should eventually link to the posted journal lines and source
documents that explain it.

Implemented report types are trial balance, general ledger, profit and loss,
balance sheet, and AR/AP aging. Cash flow statement, vendor/customer analysis,
budget versus actual, trend/variance, CSV/PDF exports, and report-package
generation are follow-up work; do not present them as available until their
accounting rules and API tests exist.

## 15. Close workflow design

Opening a monthly period creates tasks for reconciliation, uncategorized
review, flux review, missing documents, and final certification. Task updates
recompute checklist completion and append audit history. The period lock is
blocked until all tasks are complete; database triggers enforce this even if
a caller bypasses the UI. Reopening is owner/admin-only and requires a reason
that is stored with the accounting period and audit event.

Automated low-risk reconciliation, configurable dollar/percentage flux
thresholds, multi-level e-certification, notifications/escalation, and
downloadable account packets remain planned close-automation enhancements.

Reconciliation sessions retain statement beginning/ending balances. Manual
matches are limited to transactions for the session account and date range;
the book balance is the beginning balance plus matched signed transaction
amounts, and the remaining difference is persisted after each match. Matching
is not reviewer certification; a final approval/unmatch workflow remains
planned. Invoice payment and bill payment statuses are intentionally not
editable until their corresponding payment records and balance controls are
implemented.

## 16. Phased implementation roadmap

1. **Foundation (implemented):** Astro shell, verified auth/tenant boundary,
   D1 model, balanced journal controls, audit immutability, R2 private files,
   queued CSV staging, and core operational screens.
2. **Workflow completion:** transaction-to-journal review/posting, full
   reconciliation balance calculation/reviewer approval, invoice/bill line
   items and payment records, and status-transition tests.
3. **Automation:** categorization rules, explainable anomaly/flux scans,
   reconciliation tolerances, close dependencies/certifications, and
   notification delivery.
4. **Data-source and document integrations:** bank/card feed adapters,
   statement matching, OCR extraction, malware scanning, retention, and
   source replay controls.
5. **Financial outputs and tax readiness:** cash flow, aging buckets,
   budgets/variance, currency conversion, CSV/PDF workpapers, vendor
   tax-readiness fields, and year-end export packages.
6. **Operational hardening:** migration CI, tenant-isolation tests across all
   routes, upload/AI rate limits, performance budgets, export load tests, and
   close-package retention monitoring.
