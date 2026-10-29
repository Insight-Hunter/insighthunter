# InsightHunter Bookkeeping

An auditable bookkeeping workspace for transaction intake, double-entry
accounting, reconciliation, invoices, bills, documents, reporting, and period
close. The Astro application runs on Cloudflare Workers; D1 is the financial
system of record, R2 stores private source files, and Queues process CSV
imports.

The implementation and remaining work are described in
[ARCHITECTURE.md](./ARCHITECTURE.md). Product acceptance criteria are in
[insight-bookkeeping-master-prompt.md](./insight-bookkeeping-master-prompt.md).

## Architecture and controls

- Astro SSR serves the workspace at `/overview`, `/transactions`,
  `/journal`, `/reconcile`, `/invoices`, `/bills`, `/reports`, `/close`,
  `/documents`, `/exceptions`, and `/settings`.
- Hono handles same-origin `/api/*` requests. It verifies the session against
  `AUTH_URL/api/auth/verify`, derives tenant identity only from verified
  claims, and scopes every bookkeeping operation to the tenant and entity.
- D1 stores tenant-scoped financial and workflow records. Migrations in
  `migrations/` are the schema source of truth.
- Journal drafts require balanced integer-minor-unit debits and credits.
  Posting is a separate reviewer-authorized action; database controls protect
  posted lines, enforce balance, and prevent posting into locked periods.
- CSV files are staged for review. Committing an import creates pending
  transactions; it does not post journal entries.
- R2 objects are private and are streamed only after an authenticated,
  tenant-scoped document lookup.
- Workers AI can suggest a category with an explanation. Suggestions never
  change a transaction or post an entry.

## Requirements

- Node.js supported by the repository and pnpm workspace.
- Cloudflare account/resources configured for the production bindings in
  `wrangler.toml` (D1, R2, Queues, KV, and Workers AI).
- A reachable auth service configured through `AUTH_URL`.

## Local development

From the repository root:

```bash
pnpm install
pnpm --dir apps/insighthunter-bookkeeping exec wrangler d1 migrations apply insighthunter-bookkeeping --local
pnpm --dir apps/insighthunter-bookkeeping dev
```

The API calls the configured auth service for every `/api/*` request. Set a
local `AUTH_URL` in a `.dev.vars` file if the production auth URL is not
appropriate for local development, and use a valid session accepted by that
auth service. Do not put secrets in `wrangler.toml` or commit `.dev.vars`.

## Validation and build

```bash
pnpm --dir apps/insighthunter-bookkeeping check
pnpm --dir apps/insighthunter-bookkeeping test
pnpm --dir apps/insighthunter-bookkeeping build
```

The build script runs Astro diagnostics, creates the Cloudflare Worker
artifact, and runs `wrangler deploy --dry-run`. Apply production D1 migrations
before deploying application code that depends on them.

## Production deployment

Provision the D1 database, R2 bucket, Queue and dead-letter Queue, and KV
namespace referenced in `wrangler.toml`. Confirm `AUTH_URL` and allowed
origins are appropriate for the target environment, then:

```bash
pnpm --dir apps/insighthunter-bookkeeping build
pnpm --dir apps/insighthunter-bookkeeping deploy
```

Apply unapplied production migrations using Wrangler's D1 migration command
for the configured database. Never use local development credentials or
production financial data in test fixtures.

## Current limitations

The app does not yet connect to live bank/card feeds. Reconciliation matching
calculates a book balance and remaining difference, but reviewer certification
and unmatch workflows remain. Period close still needs certification and
review controls. Invoice/bill line items and payment processing, report
exports and cash-flow reporting, OCR, malware scanning, upload/AI rate
limiting, foreign-currency conversion, and end-to-end tenant-isolation tests
are also follow-up work. The current transaction API explicitly supports USD
only so unconverted currencies are not silently combined in reports. See the
phased roadmap in
[ARCHITECTURE.md](./ARCHITECTURE.md); these capabilities should not be
represented as complete until implemented and validated.
