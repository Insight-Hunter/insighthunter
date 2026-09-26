# insighthunter-bookkeeping

The first real module — `bookkeeping.insighthunter.app`. Accounts,
transactions, categories, and AI-assisted categorization, all stored per-user
in an isolated Durable Object.

## Isolation pattern (sets the template for every other module)

Rather than routing through `insighthunter-auth`'s generic `UserVault` DO,
this module defines its **own** per-user Durable Object — `BookkeepingLedger`
— with its own SQL schema (Cloudflare's SQLite-backed DO storage). The
instance id is derived deterministically from the user's id:

```ts
const ledgerId = env.LEDGER.idFromName(session.userId);
```

No id needs to be generated or stored anywhere — `idFromName` always maps
the same `userId` to the same DO instance, and only this worker (which
verified the session first) can address it. This is simpler than
auth's original `newUniqueId()` + stored-id approach, and it's the pattern
every subsequent module (reports, insights, bizforma, payroll, pbx) should
copy: own DO class, own schema, `idFromName(userId)`.

Every request first hits `GET {AUTH_API_URL}/session/verify` — via either an
`Authorization: Bearer` header (API/curl use) or the `ih_session` cookie
`insighthunter-dashboard` sets (browser use, works automatically since the
cookie's `Domain=.insighthunter.app` covers this subdomain). No entitlement
check beyond a valid session — bookkeeping is included at every tier,
Startup included.

## AI categorization

`POST /transactions` without a `categoryId` triggers a Workers AI call
(`@cf/meta/llama-3.1-8b-instruct`) that picks the best-fit category from the
user's category list, scoped to income or expense based on the transaction's
sign. The result is marked `ai_suggested: true` — the user can always
recategorize via `PATCH /transactions/:id`, which clears that flag.

## Setup

```bash
npm install
npx wrangler dev
```

No secrets or D1 needed — this worker only needs its Durable Object binding
(auto-provisioned) and the Workers AI binding (already enabled account-wide
on Cloudflare, no separate signup).

## Deploy

```bash
npx wrangler deploy
```

## Example requests

All examples assume a valid session token from `insighthunter-auth`.

Create an account:

```bash
curl -X POST https://bookkeeping.insighthunter.app/accounts \
  -H "Authorization: Bearer <session_token>" \
  -H "Content-Type: application/json" \
  -d '{"name":"Business Checking","type":"checking"}'
```

List categories (seeded automatically on first request):

```bash
curl https://bookkeeping.insighthunter.app/categories \
  -H "Authorization: Bearer <session_token>"
```

Add a transaction, letting AI categorize it:

```bash
curl -X POST https://bookkeeping.insighthunter.app/transactions \
  -H "Authorization: Bearer <session_token>" \
  -H "Content-Type: application/json" \
  -d '{"accountId":"<account_id>","amountCents":-4200,"description":"Adobe Creative Cloud subscription"}'
```

Response (category picked automatically):

```json
{
  "id": "…",
  "account_id": "…",
  "amount_cents": -4200,
  "description": "Adobe Creative Cloud subscription",
  "category_id": "…",
  "ai_suggested": 1,
  "created_at": 1755500000000
}
```

Recategorize a transaction:

```bash
curl -X PATCH https://bookkeeping.insighthunter.app/transactions/<tx_id> \
  -H "Authorization: Bearer <session_token>" \
  -H "Content-Type: application/json" \
  -d '{"categoryId":"<category_id>"}'
```

Monthly summary (feeds insighthunter-reports later):

```bash
curl https://bookkeeping.insighthunter.app/summary \
  -H "Authorization: Bearer <session_token>"
```

## Known follow-ups

- No real bank feed integration yet — transactions are entered manually or
  via this API. Plaid (or similar) is the natural next step for automatic
  bank feeds; that integration would post into the same `POST /transactions`
  endpoint, so the schema doesn't need to change, just the source.
- No pagination cursor on `GET /transactions` yet — `limit` only (capped at
  200). Add a cursor once real usage shows it's needed.
- Startup tier has no enforced transaction-count cap yet (marketing site
  lists "up to 25 AI-categorized transactions/mo" for Startup) — add a
  monthly count check in this worker before the AI-categorization branch
  once that limit needs to be real. Flagged, not silently built, since it's
  a product decision (hard cap vs. soft warning vs. graceful degrade to
  manual categorization after the limit).
