# insighthunter-payments

Handles subscription checkout, billing portal, and Stripe webhooks for both
**account tiers** (Startup/Standard/Pro) and **module add-ons** (Payroll,
PBX, Insights Pro, BizForma Compliance). Writes entitlement state into the
same D1 database `insighthunter-auth` owns — this worker never touches a
user's actual financial data (that's isolated in their `UserVault` Durable
Object, which this worker has no binding to).

## Why Stripe instead of the x402 template

The prompt's default payment reference (`x402-proxy-template`) implements
the x402 protocol — HTTP 402 "Payment Required" for **pay-per-request crypto
micropayments**. It has no concept of a recurring monthly subscription,
proration, invoicing, dunning (retrying failed cards), or tax handling —
all of which a CFO-facing SaaS product needs for its core tier billing.
Stripe is the right primary rail for that. x402 remains a good fit *later*
for pure usage-based scenarios (e.g., metering an external agent's calls
into the Insights API) — it's not excluded, just not the base of the
subscription model.

## Setup

1. Create Products + recurring monthly Prices in the Stripe Dashboard for:
   Standard, Pro, Payroll, PBX, Insights Pro, BizForma Compliance.
2. Put each Price ID into `wrangler.toml` under the matching `STRIPE_PRICE_*` var.
3. Set secrets:
   ```bash
   npx wrangler secret put STRIPE_SECRET_KEY
   npx wrangler secret put STRIPE_WEBHOOK_SECRET
   ```
4. Run the schema migration against the **same D1 database** as
   `insighthunter-auth`:
   ```bash
   npx wrangler d1 execute insighthunter-auth-db --file=./schema.migration.sql
   ```
5. In Stripe Dashboard → Developers → Webhooks, add an endpoint pointing to
   `https://payments.insighthunter.app/webhook` subscribed to:
   `checkout.session.completed`, `customer.subscription.updated`,
   `customer.subscription.deleted`. Copy its signing secret into
   `STRIPE_WEBHOOK_SECRET`.

## Local dev

```bash
npx wrangler dev
# In another terminal, forward Stripe events to your local worker:
stripe listen --forward-to localhost:8787/webhook
```

## Example requests

Get the pricing catalog (used by the marketing site to render tier cards):

```bash
curl https://payments.insighthunter.app/catalog
```

Start a checkout for upgrading to Pro (requires a valid session token from
insighthunter-auth):

```bash
curl -X POST https://payments.insighthunter.app/checkout \
  -H "Authorization: Bearer <session_token>" \
  -H "Content-Type: application/json" \
  -d '{"type":"account_tier","value":"pro"}'
```

Response:

```json
{ "checkoutUrl": "https://checkout.stripe.com/c/pay/cs_test_..." }
```

Add the Payroll module add-on:

```bash
curl -X POST https://payments.insighthunter.app/checkout \
  -H "Authorization: Bearer <session_token>" \
  -H "Content-Type: application/json" \
  -d '{"type":"module_addon","value":"payroll"}'
```

Open the self-service billing portal (cancel/change plan/update card):

```bash
curl -X POST https://payments.insighthunter.app/portal \
  -H "Authorization: Bearer <session_token>"
```

## How this fits the rest of the platform

- **insighthunter-main** (Astro marketing site) calls `GET /catalog` to
  render tier/add-on pricing, and on "Subscribe" click, calls `POST
  /checkout` (after the user is logged in via insighthunter-auth) and
  redirects the browser to the returned `checkoutUrl`.
- **insighthunter-auth** remains the single source of truth for
  `users.tier` and `entitlements` — this worker only writes to those tables
  in response to verified Stripe webhook events. Every module worker
  (bookkeeping, reports, etc.) keeps checking entitlements via auth/D1 as
  already planned, with no changes needed on their end.
- Free tier (Startup) never touches this worker — no Stripe customer is
  created until a user's first paid checkout.

## Known follow-ups

- Per-employee metered pricing for Payroll (currently flat base price) —
  needs a Stripe metered/graduated price and usage reporting once payroll
  headcount tracking exists.
- Proration display / upgrade-preview endpoint (nice-to-have for UX before
  charging).
- Dunning emails are handled by Stripe by default (Smart Retries) — confirm
  Stripe's default retry schedule and failed-payment emails match your
  brand voice, or customize via Stripe's email settings.
