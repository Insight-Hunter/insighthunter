# insighthunter-bizforma

Business formation and compliance tracking — `bizforma.insighthunter.app`.
Requires Standard tier or above (or the BizForma Compliance add-on).

## Scope — read this before marketing copy gets written

**This module does not file anything with any state, the IRS, or a
registered agent.** It's a tracker: entity records (name, type, state,
formation date, status) and compliance deadlines (with automatic recurrence
— mark an annual filing "completed" and the next year's instance is created
automatically). That's genuinely useful on its own — most small business
owners lose track of annual report deadlines, not the filing mechanics —
but it's meaningfully less than "we form your LLC for you."

A real formation-filing feature needs one of:
- A formation-as-a-service API partner (e.g. Middesk, Northwest Registered
  Agent's API, Stripe Atlas-style providers) to actually submit state
  filings and act as registered agent.
- Or a licensed in-house team for the states you support, which is a very
  different (and heavily regulated) business than a Cloudflare Worker.

The marketing site's "form your LLC or corporation" phrasing on the
`/modules` page should either be softened to "track your formation and
compliance" or held until a real filing partner is integrated — flagging
this rather than quietly shipping a mismatch between what's marketed and
what's built.

## Data model

- **Entities** — one row per business entity the user has or is forming.
- **Compliance items** — deadlines tied to an entity (annual report,
  franchise tax, registered agent renewal, etc.), with optional recurrence.
  Completing a recurring item auto-schedules the next occurrence.

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

Create an entity:

```bash
curl -X POST https://bizforma.insighthunter.app/entities \
  -H "Authorization: Bearer <session_token>" \
  -H "Content-Type: application/json" \
  -d '{"legalName":"Acme Bakery LLC","entityType":"llc","state":"DE","status":"active"}'
```

Add a recurring compliance deadline:

```bash
curl -X POST https://bizforma.insighthunter.app/compliance \
  -H "Authorization: Bearer <session_token>" \
  -H "Content-Type: application/json" \
  -d '{"entityId":"<entity_id>","title":"Delaware Annual Report","dueDate":1767139200000,"recurrence":"annual"}'
```

Mark it complete (auto-schedules next year's):

```bash
curl -X PATCH https://bizforma.insighthunter.app/compliance/<item_id> \
  -H "Authorization: Bearer <session_token>" \
  -H "Content-Type: application/json" \
  -d '{"status":"completed"}'
```

Upcoming deadlines within 30 days:

```bash
curl "https://bizforma.insighthunter.app/compliance?withinDays=30" \
  -H "Authorization: Bearer <session_token>"
```

## Known follow-ups

- No email/SMS reminders yet — deadlines are pull-only (user has to check
  the dashboard). A Cron Trigger + Queue that checks upcoming deadlines
  daily and notifies via email (or the PBX module's SMS once that exists)
  is the natural next step.
- No document storage — registered agent documents, formation certificates,
  etc. aren't stored anywhere yet. Would use R2 for file storage plus a
  metadata row here pointing at the object key.
- No per-state deadline templates — the user (or the account team, for a
  concierge experience) enters compliance items manually right now. A
  library of "here's what Delaware LLCs typically owe and when" per state
  would remove that manual step but is real content/legal work to build
  correctly.
