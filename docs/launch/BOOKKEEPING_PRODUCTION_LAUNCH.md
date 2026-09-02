# Insight Hunter Bookkeeping — Production Launch Specification

## Product promise
Insight Hunter Bookkeeping provides small businesses with secure financial workspaces, AI-assisted transaction organization, accountant-ready books, cash visibility, and optional managed bookkeeping. A period is not presented as closed until source accounts are reconciled, material exceptions are resolved or documented, and an authorized closer records the action.

## Plans
| Plan | Price | Included | Service boundary |
| --- | ---: | --- | --- |
| Startup | $0/month | One business, CSV import, starter chart of accounts, limited AI suggestions, transaction review, core P&L snapshot | No bank feeds, managed bookkeeping, payroll, or tax filing |
| Standard | $79/month | Bank/card sync, receipt capture, AI categorization, reconciliation workspace, reports, cash forecast, anomaly alerts, accountant access | Customer retains responsibility for review and close |
| Pro Books | From $299/month | Standard plus bookkeeper-led categorization, reconciliations, monthly close package, questions workflow, close-status timeline, quarterly financial review | Scope is limited by the executed order form |
| Cleanup | Scoped prepaid | Historical import, cleanup, opening-balance review, COA normalization, reconciliation, conversion report | Scope is agreed before work begins |

Payroll, tax filing, tax or legal advice, bill payment, collections, invoicing, inventory accounting, sales-tax filing, 1099 filing, and fractional CFO work are separate services unless included in a signed order form.

## Customer journey
1. Customer selects a plan on `https://insighthunter.app`.
2. Authentication and registration occur at `https://auth.insighthunter.app`.
3. Startup provisions immediately; paid plans use Stripe-hosted Checkout. Insight Hunter never handles raw card data.
4. A verified Stripe webhook projects the authoritative tenant entitlement. A checkout return page never grants access.
5. An idempotent workflow provisions the isolated tenant workspace.
6. The customer completes onboarding, connects/imports accounts, and sees verified onboarding, reconciliation, and close states.

## Tenant isolation
Tenant financial data is isolated by Worker route, authorization context, D1 database, R2 object namespace, queue message, cache key, report/export, audit query, and error response. The control plane stores only opaque tenant ID, route, provisioning state, Stripe references, and entitlement state; it does not store financial transactions, ledger data, bank data, receipts, workpapers, or reports.

## Bookkeeping controls
- Imports use source-specific idempotency keys and duplicate detection.
- Posted entries are balanced double-entry journals. Corrections use reversals and replacement entries, not destructive edits.
- Reconciliation records statement period, balances, cleared/outstanding items, preparer, reviewer, and timestamp.
- Closing locks the period. Reopening requires role, reason, timestamp, and audit event.
- Financial package includes P&L, balance sheet, cash-flow statement, trial balance, general ledger, account detail, and exception report.

## Launch gates
- Verified email plus MFA/passkeys, secure sessions, rate limits, CSRF controls, explicit CORS, CSP, HSTS, and bot controls.
- Signed, idempotent Stripe webhooks and server-side entitlement enforcement.
- Automated cross-tenant access-denial tests.
- Immutable audit logs, journal-balance tests, import-idempotency tests, reconciliation tests, and period-lock tests.
- No secrets, payment data, bank tokens, or financial payloads in logs, analytics, URLs, browser storage, or errors.
- Alerts for provisioning failures, auth anomalies, failed webhooks/imports/reports, queue dead letters, tenant-boundary violations, and entitlement mismatches.

## Marketing claim rule
Use only verifiable claims: AI-assisted bookkeeping, isolated financial workspaces, cash-flow visibility, financial reporting, human bookkeeping on Pro Books, and clear monthly-close status. Do not claim tax filing, payroll processing, licensed CPA review, SOC 2, real-time bank sync, insurance coverage, or guaranteed close times until capability and operations are verified.
