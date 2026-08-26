# Insight Hunter architecture

Insight Hunter is a Cloudflare-first monorepo for small-business bookkeeping,
reporting, operational finance, and advisory services. The public site and the
customer workspace are intentionally separate deployments so marketing traffic
cannot affect financial workloads.

## Public entry points

| Hostname | Application | Responsibility |
| --- | --- | --- |
| `insighthunter.app` | `apps/insighthunter-main` | Astro marketing, pricing, signup and login hand-off |
| `auth.insighthunter.app` | `apps/insighthunter-auth` | Identity, sessions, rate limiting, and user-vault provisioning |
| `app.insighthunter.app` | `apps/insighthunter-dashboard` | Entitled application launcher and dashboard APIs |
| `payments.insighthunter.app` | `apps/insighthunter-payments` | Stripe checkout, webhooks, and billing portal |

The product modules are `insighthunter-bookkeeping`, `insighthunter-bizforma`,
`insighthunter-payroll`, `insighthunter-report`, `insighthunter-insights`, and
`insighthunter-pbx`. Invoicing, bills, ledger, notifications, and platform
administration are supporting applications.

## Data ownership and isolation

The auth D1 database contains only account and billing metadata. Financial
records belong to a user-scoped Durable Object (the `UserVault`) or a module's
user-scoped storage namespace; module code must never query records without a
verified identity and entitlement. This gives every account a distinct
transactional SQLite store without provisioning and maintaining a Worker script
per account.

Cloudflare Workers for Platforms is the upgrade path if compute isolation—not
only data isolation—becomes a contractual requirement. It is not the default:
per-customer workers increase provisioning, observability, and deployment cost.

## Request flow

1. The marketing site shows the Startup, Standard, and Pro catalog and sends an
   owner to signup.
2. Auth validates the request, creates account metadata, allocates a unique
   `UserVault` Durable Object ID, and creates a signed, revocable session.
3. Paid selections go to the payments Worker, which creates Stripe Checkout.
4. A signed Stripe webhook updates the subscription and module entitlements.
5. The dashboard and every module verify a session and entitlement before they
   access user-owned data.

## Operational requirements

- Keep secrets in Cloudflare secrets or `.dev.vars`; never commit them.
- Use a unique D1/KV/DO binding for each deployed environment. Production IDs
  in a checked-in `wrangler.toml` must be replaced before a new account deploys.
- Deploy auth before payments, and payments before the dashboard/modules.
- Run `pnpm setup` after cloning and `pnpm verify:platform` before deployment.

## Payroll and communications boundaries

Payroll calculation, tax filing, and money movement require licensed providers.
The payroll application therefore acts as an entitlement, journal, and workflow
layer around a contracted embedded payroll provider; it must not present itself
as a tax filing service until that integration and compliance review are live.
Likewise PBX is an integration layer over a carrier such as Telnyx, with consent
and message-delivery controls owned by the carrier integration.
