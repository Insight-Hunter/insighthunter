# Bookkeeping Production End-to-End Acceptance

Production launch requires recorded passing results in staging and production smoke tests.

## Authentication and registration
- Startup user registers, verifies email, receives tenant provisioning, and enters onboarding without a card.
- Paid user registers, verifies email, completes Stripe-hosted Checkout, and receives access only after a verified webhook activates entitlement.
- Invalid, expired, reused, or cross-origin session artifacts are rejected.
- Password reset and verification tokens are single-use, expiration-bound, rate-limited, and avoid account-enumeration disclosure.

## Billing and access
- Duplicate `checkout.session.completed` events create no duplicate tenant, entitlement, customer link, or provisioning job.
- Forged webhook signatures create no entitlement change.
- Upgrades and downgrades change API access only after verified projection.
- Payment failure preserves records and follows documented remediation behavior.
- Cancellation blocks paid actions after paid-through period while preserving permitted read-only/export capability.
- Client-controlled plan, tenant ID, feature flag, or subscription values do not grant access.

## Tenant security
- Provisioning is idempotent and failed partial workspaces cannot accept imports.
- Tenant A cannot retrieve, modify, enumerate, export, or infer Tenant B transactions, journals, accounts, receipts, reconciliations, reports, tasks, audits, cache data, object keys, or queue messages.
- Tenant mismatch returns a non-disclosing response and produces a security audit event.

## Financial integrity
- Each posted journal balances debits and credits.
- Duplicate source import cannot create duplicate transaction or journal entry.
- Posted entries are immutable; corrections are linked reversals and replacements.
- Reconciliation requires statement period, balances, cleared/outstanding totals, preparer, and timestamp.
- A closed period rejects changes unless an authorized reopen operation logs reason, actor, and time.
- Reports agree to ledger totals for the selected tenant and period.

## Operations
- Every Pro Books customer has an owner, bookkeeping month, close status, customer-question status, and escalation path.
- Dashboard cannot label a month closed with unreconciled included accounts or undocumented material exceptions.
- Alerts exist for provisioning, webhook, import, report, queue, tenant-boundary, and entitlement failures.
- Logs are reviewed for secrets, raw payment data, bank tokens, sessions, receipts, and financial payloads.

## Decision
Enable Startup after authentication, tenant isolation, financial integrity, and security gates pass. Enable Standard only after paid billing and all self-service gates pass. Enable Pro Books only after all gates pass, service capacity is approved, customer terms are published, and escalation ownership is staffed.
