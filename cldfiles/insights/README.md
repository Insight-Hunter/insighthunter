# insighthunter-insights

The AI advisory layer — `insights.insighthunter.app`. Reads a user's
bookkeeping data and generates plain-language flags: margin drift, spending
concentration, notable trends. Requires Standard tier or above (or the
Insights Pro add-on on Standard).

## Entitlement gating

Unlike bookkeeping (included at every tier), this module checks
`GET {AUTH_API_URL}/entitlements` on every request:

- **Startup, no add-on** → `403 upgrade_required`
- **Standard** → `basic` depth: current period only, up to 3 observations
- **Pro, or Standard + `insights_pro` add-on** → `full` depth: current period
  plus 3 trailing months for trend comparison, up to 5 observations

## How it talks to bookkeeping

This worker has no direct access to a user's bookkeeping data — it forwards
the same session token it verified to `insighthunter-bookkeeping`'s
`GET /summary` endpoint (server-to-server, same pattern as
insighthunter-dashboard calling insighthunter-payments). No shared database,
no cross-DO access — each module stays isolated and talks to the others only
through their public APIs, using the user's own credential.

## Setup

```bash
npm install
npx wrangler dev
```

## Deploy

```bash
npx wrangler deploy
```

## Example requests

Generate fresh insights (pulls current bookkeeping data, runs AI analysis,
stores results):

```bash
curl -X POST https://insights.insighthunter.app/generate \
  -H "Authorization: Bearer <session_token>"
```

Response:

```json
{
  "generated": 3,
  "insights": [
    {
      "id": "…",
      "title": "Software spend up sharply",
      "body": "Software & Subscriptions is 34% higher than last month — worth a quick audit of active licenses.",
      "severity": "watch",
      "category": "Software & Subscriptions",
      "created_at": 1755500000000
    }
  ]
}
```

List past insights:

```bash
curl https://insights.insighthunter.app/insights?limit=10 \
  -H "Authorization: Bearer <session_token>"
```

## Known follow-ups

- No automatic/scheduled generation yet — `/generate` is called on demand
  (e.g., a dashboard button, or a future Cron Trigger for a monthly digest).
  A scheduled version is a small addition once the dashboard has a natural
  "generate my monthly insights" moment.
- AI output is not validated against the source numbers beyond basic JSON
  shape checking — the prompt instructs the model not to invent figures, but
  nothing currently cross-checks generated text against the summary data.
  Worth adding a lightweight numeric sanity check before this is customer-facing.
- No caching/dedup — calling `/generate` repeatedly in the same period will
  produce and store similar insights each time. Add a "already generated for
  this period" check once usage patterns are clearer.
