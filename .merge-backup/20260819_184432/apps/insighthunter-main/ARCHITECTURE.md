# Insight Hunter — Platform Architecture

## Repo layout (monorepo)

```
insighthunter/
  apps/
    insighthunter-main/       Astro marketing site (insighthunter.app)
                               - tier marketing (Startup/free, Standard, Pro)
                               - signup → hands off to auth
    insighthunter-auth/       Worker + D1 + Durable Objects (auth.insighthunter.app)
                               - registration, login, sessions
                               - provisions per-user isolated storage
    insighthunter-dashboard/  Worker + Static Assets (app.insighthunter.app)
                               - post-login personalized dashboard
    insighthunter-bookkeeping/  Worker + D1 (per-user) — module, tiered
    insighthunter-bizforma/     Worker + D1/R2 — formation + compliance docs
    insighthunter-payroll/      Worker + Queues — likely proxies a white-label
                                 payroll provider (Check, Gusto Embedded, Deel)
                                 rather than running payroll compliance in-house
    insighthunter-reports/      Worker + D1 + R2 — financial reporting/exports
    insighthunter-insights/     Worker + Workers AI + Vectorize — advisory/AI
    insighthunter-pbx/          Worker — thin integration layer over Twilio/
                                 Telnyx (voice, SMS, voicemail, auto-messages)
  packages/
    shared-types/              Shared TS types (User, Tier, Entitlement, etc.)
    shared-auth/                verifyJWT(), CORS helpers, rate-limit helpers
```

## Core isolation model (per your requirement: "no shared databases, 100% separate")

True 1-worker-per-user is only available via **Cloudflare Workers for Platforms**
(dynamic dispatch namespaces) — this is a paid add-on and adds real operational
complexity (namespace management, per-user deploys). Given "prioritize adoption
within funding/engineering/compute constraints," the pragmatic default is:

- **One Durable Object instance per user, per module** — not one shared
  generic vault. Each module (bookkeeping, reports, etc.) defines its own DO
  class with its own SQL schema (Cloudflare's SQLite-backed DO storage), and
  derives the instance id deterministically from the user's id via
  `env.MODULE_DO.idFromName(userId)` — no id needs to be generated or
  stored anywhere. Only the module worker that verified the session can
  address that instance. (Originally planned as one generic `UserVault`
  DO shared across modules — refined once bookkeeping was built, since a
  generic key-value blob is a worse fit than each module owning proper SQL
  tables for its own data. `UserVault` remains in insighthunter-auth for any
  future module that genuinely just needs unstructured KV.)
- **Central D1 in insighthunter-auth** holds *only* auth metadata (user id,
  email hash, password hash, tier, entitlements) — never financial data.
- **Upgrade path:** if/when compute isolation (not just storage isolation)
  becomes a compliance requirement, migrate to Workers for Platforms — the
  DO-per-user-per-module boundary makes that migration additive, not a rewrite.

This is the one deviation from the prompt's literal "own worker per user" —
flagged here rather than silently built, since it affects architecture and cost.

## Auth flow

1. `insighthunter.app` → signup/tier selection → redirects to
   `auth.insighthunter.app/register`
2. Auth worker creates the D1 user row + provisions their `UserVault` Durable
   Object, hashes password (PBKDF2/scrypt via Web Crypto, no plaintext ever
   stored), issues a session token (stored in KV, short TTL + refresh).
3. Redirect to `app.insighthunter.app/dashboard` with session cookie
   (`HttpOnly`, `Secure`, `SameSite=Strict`).
4. Dashboard + module workers validate the session by calling
   `auth.insighthunter.app/session/verify` (or shared JWT verification if you
   move to signed JWTs — see note in code).

## Payments

Built in `insighthunter-payments` (Stripe, not the x402 template — see that
app's README for why: x402 is pay-per-request crypto metering, not a fit for
recurring monthly subscriptions with proration/invoicing/dunning). Handles:

- `GET /catalog` — account tiers + module add-ons, consumed by the marketing site
- `POST /checkout` — Stripe Checkout session for a tier or add-on
- `POST /portal` — Stripe billing portal (self-service cancel/upgrade)
- `POST /webhook` — reconciles Stripe subscription events into the same D1
  `users`/`entitlements` tables insighthunter-auth owns

Entitlements resolved at purchase time land in the D1 `entitlements` table in
insighthunter-auth (shared DB binding), which every module worker checks
before serving tier-gated features. x402 remains a viable secondary rail
later for pure usage-based/agentic metering, not the subscription backbone.

## Build order (recommended)

1. **insighthunter-auth** ✅ built
2. **insighthunter-payments** ✅ built (Stripe checkout, portal, webhook → entitlements)
3. **insighthunter-main** ✅ built (Astro marketing, pricing, signup/login forms)
4. **insighthunter-dashboard** ✅ built (cookie exchange, entitlement-gated
   module tiles, billing portal link, logout — closes the `?token=`
   follow-up from insighthunter-main)
5. **insighthunter-bookkeeping** ✅ built — first real module. Sets the
   per-module isolation pattern every remaining module should copy: its own
   Durable Object class with its own SQL schema, instance id derived via
   `idFromName(userId)`, session verified against auth on every request.
   (Refines the original "one generic UserVault for everything" plan — see
   that app's README for why.)
6. **insighthunter-insights** ✅ built — standard+ gated. Forwards the
   user's own session token to insighthunter-bookkeeping's `/summary`
   (server-to-server, same credential, no shared DB) and runs Workers AI
   over it. Basic depth on Standard, full trend-comparison depth on Pro or
   the Insights Pro add-on.
7. **insighthunter-reports** ✅ built — standard+ gated. P&L and CSV export
   are real; Cash Flow is currently a P&L alias and Balance Sheet returns
   `501` with an explanation rather than fabricated numbers — both need a
   Bookkeeping data-model addition (accrual timing, asset/liability
   accounts) before they can be real. See that app's README.
8. **insighthunter-bizforma** ✅ built — standard+ gated (or its own
   add-on). Important scope note: this is a compliance **tracker**, not a
   filing service — it does not submit anything to any state or federal
   agency. Real formation filing needs a partner integration (Middesk,
   Northwest Registered Agent API, or similar) or a licensed in-house team.
   Marketing copy should reflect "track" not "file" until that partner
   integration exists — see that app's README.
9. insighthunter-payroll, insighthunter-pbx — same pattern: own DO class,
   own schema, `idFromName(userId)`, verify session via auth, check
   `/entitlements` for pro+ tier or an active add-on. Both are likely thin
   integration layers over a white-label partner (payroll: Check/Gusto
   Embedded/Deel; PBX: Twilio/Telnyx) rather than in-house compliance/telco
   infrastructure — a partner selection decision, not just an engineering one.
6. insighthunter-reports, insighthunter-insights, insighthunter-bizforma,
   insighthunter-payroll, insighthunter-pbx (same pattern each time)

Each module Worker will share the same skeleton: verify session → check
entitlement for the module/tier → route to the user's DO → respond. Once
auth + payments are solid, each subsequent module is a small, fast build.
