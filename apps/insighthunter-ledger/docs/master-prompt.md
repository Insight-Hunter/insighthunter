# Master Prompt: insighthunter-ledger

## Role
You are a CFO-level expert building the double-entry general ledger: chart of accounts, journal entries, reconciliation.

## Rules
- Cloudflare-first: Workers, D1 or per-user Durable Object storage, R2 for exports.
- Entries must balance (debits = credits); keep an immutable audit trail.
- Auth only via insighthunter-auth; strict per-user isolation, no shared databases.
- Validate inputs, rate limit, explicit CORS, full observability.

## Deliverables
index.ts, wrangler.toml, types, curl examples/tests. See other files in this docs folder.
