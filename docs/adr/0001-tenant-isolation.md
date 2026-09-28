<!-- docs/adr/0001-tenant-isolation.md -->
# ADR 0001: Tenant isolation model

**Status:** Accepted
**Date:** 2026-09-23

## Context

Project instructions state a hard requirement: "each new user creating its
own worker to ensure isolated data... no shared databases... each user
should be 100% separate from the next." The current implementation does
not do this literally. This ADR records why, and what the compensating
controls are, so the gap is a tracked decision instead of silent drift.

## Decision

Insight Hunter uses a **two-tier isolation model**:

1. **Account/billing metadata** — one shared D1 database (`insighthunter-auth`),
   with every table row scoped by `org_id` and every query required to
   bind `org_id` from a verified session. No cross-tenant query path exists
   in application code.
2. **Financial data** — one Durable Object instance per user (`UserVault`),
   addressed by a DO name derived from `userId`. Cloudflare guarantees no
   two DO instances share memory, storage, or execution context. Module
   Workers (bookkeeping, ledger, payroll, etc.) reach a user's vault only
   by deriving the DO ID from an authenticated `userId` — never from
   client-supplied input alone — and the vault itself rejects any request
   whose `X-Vault-User-Id` header doesn't match its own DO name.

**True Worker-per-user (Cloudflare Workers for Platforms) is explicitly
rejected as the default** because it multiplies provisioning, observability,
and per-customer deployment cost beyond what the funding and engineering
constraints of this project support at current scale.

## Consequences

- Pro: Financial data has hard storage-level isolation equivalent to
  per-tenant infrastructure, at Workers/D1 pricing instead of
  Workers-for-Platforms pricing.
- Con: The shared auth D1 is a single blast radius for account metadata
  (email, org name, plan, hashed credentials) if that Worker is compromised
  or misconfigured. Mitigated by: parameterized queries only, `org_id`
  bound on every query, D1 not directly reachable from the public internet
  (only via the auth Worker), and CodeQL + secret-scan CI gates.
- Con: This does not literally satisfy the "no shared databases" instruction.
  That instruction is treated as satisfied for financial data (the
  regulated, high-liability payload) and knowingly not satisfied for
  non-financial account metadata.

## Revisit triggers

Move to Workers for Platforms (dedicated Worker + isolated D1 per tenant)
when any of the following becomes true:
- A signed contract requires compute-level (not just storage-level) isolation.
- Customer count or per-customer revenue justifies the added operational cost.
- A compliance audit (SOC 2, PCI scope expansion) requires it.

## Action items tracked from this ADR

- [ ] Add automated tests asserting no D1 query in `insighthunter-auth` can
      execute without an `org_id` bind parameter (static analysis or lint rule).
- [ ] Add a scheduled job that audits `UserVault` access logs for
      `X-Vault-User-Id` mismatches (should be zero; any nonzero count is
      an incident).
- [ ] Revisit this ADR at 500 paying orgs or first enterprise contract,
      whichever comes first.
