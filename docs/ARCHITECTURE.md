# Insight Hunter — Platform Architecture

Insight Hunter is a Cloudflare-first monorepo delivering small-business
bookkeeping, formation, payroll, reporting, advisory, and communications
as independently deployable Workers. Marketing traffic, identity, billing,
and financial workloads are deliberately separated so a marketing-site
incident can never touch customer financial data.

## Public entry points (source of truth — verify against each app's
`wrangler.toml` routes before editing)

| Hostname | Application | Responsibility |
| --- | --- | --- |
| `insighthunter.app`, `www.insighthunter.app` | `apps/insighthunter-marketing` | Astro SSR marketing, pricing, blog, docs, signup/login hand-off |
| `auth.insighthunter.app` | `apps/insighthunter-auth` | Registration, login, sessions, rate limiting, per-user `UserVault` provisioning |
| `app.insighthunter.app` | `apps/insighthunter-dashboard` | Entitled application launcher and dashboard APIs |
| `payments.insighthunter.app` | `apps/insighthunter-payments` | Stripe Checkout, billing portal, webhooks |
| `payroll.insighthunter.app` | `apps/insighthunter-payroll` | Employee records, payroll runs, tax-provider integration |
| `bizforma.insighthunter.app` | `apps/insighthunter-bizforma` | Business formation wizard, compliance calendar, AI advisor |
| `pbx.insighthunter.app` | `apps/insighthunter-pbx` | Twilio-backed voice, voicemail, SMS |
| `scout.insighthunter.app` | `apps/insighthunter-scout` | Lead/deal CRM |

> `apps/insighthunter-main` is **decommissioned**. It must not be redeployed
> or referenced. Do not resurrect its routes — see its `wrangler.toml`
> header comment. All marketing responsibility now lives in
> `apps/insighthunter-marketing`.

## Product modules (routed through `app.insighthunter.app`, entitlement-gated)

| Module | App | Status |
| --- | --- | --- |
| Bookkeeping | `insighthunter-bookkeeping` | Live — transactions, reconciliation, imports |
| Ledger | `insighthunter-ledger` | Live — chart of accounts, journals |
| Invoicing | `insighthunter-invoicing` | Live — invoices, clients, payments |
| Bills (AP) | `insighthunter-bills` | Live — vendors, bill payments |
| Reports | `insighthunter-report` | Live — P&L, balance sheet, cash flow, exports |
| Insights | `insighthunter-insights` | Live — AI advisory (Workers AI + Vectorize) |
| BizForma | `insighthunter-bizforma` | Live — formation, compliance reminders |
| Payroll | `insighthunter-payroll` | Live — see tax-provider ADR before selling to real customers |
| PBX | `insighthunter-pbx` | In development — see PBX section below |
| Scout (CRM) | `insighthunter-scout` | In development — see Scout section below |
| Notifications | `insighthunter-notifications` | Skeleton — email/SMS/webhook fan-out |
| Whitelabel | `insighthunter-whitelabel` | Skeleton — partner branding |
| Dispatch | `insighthunter-dispatch` | Live — internal event routing |
| FinOps | `insighthunter-finops` | Live — internal cost/usage monitoring |
| Advisor | `insighthunter-advisor` | Live — advisory logic backing Insights |
| Platform | `insighthunter-platform` | Skeleton — internal admin console |
| Tenant | `insighthunter-tenant` | Live — org metadata, provisioning state machine |

## Account tiers (must match `apps/insighthunter-payments/src/catalog.ts` —
that file is the source of truth for pricing logic; this table is
descriptive only)

| Tier | Price | Includes |
| --- | --- | --- |
| Startup | Free | 1 bank connection, 25 AI-categorized transactions/mo, basic dashboard, community support |
| Standard | $49/mo | Unlimited bookkeeping, financial reports, BizForma compliance reminders, basic AI insights, email support |
| Pro | $149/mo | Everything in Standard, full AI advisory/forecasting, priority support, eligible for Payroll and PBX add-ons |

Add-ons (Pro-eligible, billed separately): Payroll, PBX, Insights Pro,
BizForma Compliance. Any add-on advertised on the marketing site MUST have
a corresponding entry in `catalog.ts`'s `ModuleAddon` type and a deployed
backend — see "Marketing/backend parity" below.

## Data ownership and tenant isolation — explicit decision, not drift

See `docs/adr/0001-tenant-isolation.md`. Summary: account/billing metadata
lives in a **shared D1 database** owned by `insighthunter-auth`; financial
records live in a **Durable Object per user** (`UserVault`) or a module's
own user-scoped storage. This is a conscious deviation from "no shared
database" — read the ADR before changing it.

## Marketing/backend parity rule

No module or add-on may be listed on `insighthunter-marketing` pricing or
feature pages unless its backend app exists, is deployed, and passes
`/health`. Enforced by `pnpm verify:platform` — extend that script whenever
a new sellable feature is added to `src/data/pricing.ts` or `catalog.ts`.

## Request flow

1. Marketing site shows Startup/Standard/Pro + add-ons, sends visitor to `/signup`.
2. Auth validates input, creates account + org metadata row in D1, allocates
   a `UserVault` Durable Object ID, issues a signed session cookie.
3. Paid selections POST to `payments.insighthunter.app`, which creates a
   Stripe Checkout Session using `catalog.ts` entries.
4. A verified Stripe webhook updates subscription status and module
   entitlements in the auth D1.
5. Dashboard reads entitlements via the Auth service binding and renders
   only the modules the org has purchased.
6. Each module Worker independently verifies `X-User-Id` / `X-Org-Id` /
   `X-User-Role` headers (forwarded by the dashboard/auth layer) before
   touching any data — modules never trust unauthenticated input.

## CI/CD

`.github/workflows/ci.yml` runs lint, typecheck, and test on every PR.
`deploy.yml` deploys on merge to `main`. `codeql.yml` and `secret-scan.yml`
run security scans. Coverage gaps are tracked in
`docs/testing-gap-register.md` — payments, payroll, auth, and bizforma are
priority-one because they touch money or identity.
