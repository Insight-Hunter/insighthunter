# insighthunter-reports

Financial statements — `reports.insighthunter.app`. Requires Standard tier
or above. Pulls from `insighthunter-bookkeeping` (forwarding the user's own
session token, same pattern as insighthunter-insights) and formats it into
statements a lender, investor, or accountant would recognize.

## What's real vs. flagged

- **Profit & Loss** (`GET /profit-loss`) — fully implemented. Income and
  expenses grouped by category, from Bookkeeping's `/summary` endpoint.
- **CSV export** (`GET /export/csv`) — implemented, downloads the P&L as CSV.
- **Cash Flow** (`GET /cash-flow`) — currently an alias for P&L. Real cash
  flow (distinguishing operating/investing/financing activity, and accrual
  vs. cash timing) needs data Bookkeeping doesn't capture yet (payment dates
  vs. transaction dates, loan/investment activity). Flagged, not faked.
- **Balance Sheet** (`GET /balance-sheet`) — returns `501 not_available`
  with an explanation, deliberately, rather than synthetic numbers. A real
  balance sheet needs asset/liability/equity account types and opening
  balances, which is a Bookkeeping data-model addition, not a Reports-side
  fix. Worth scoping as a real feature once there's demand — small business
  lenders often want this in the first pass, so it may need to move up the
  list.

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

Profit & Loss for the current month:

```bash
curl https://reports.insighthunter.app/profit-loss \
  -H "Authorization: Bearer <session_token>"
```

Profit & Loss for a specific range (epoch ms):

```bash
curl "https://reports.insighthunter.app/profit-loss?from=1748736000000&to=1751328000000" \
  -H "Authorization: Bearer <session_token>"
```

Download as CSV:

```bash
curl -OJ "https://reports.insighthunter.app/export/csv?from=1748736000000&to=1751328000000" \
  -H "Authorization: Bearer <session_token>"
```

Past generated reports (every P&L call archives a snapshot):

```bash
curl "https://reports.insighthunter.app/snapshots?type=profit_loss&limit=10" \
  -H "Authorization: Bearer <session_token>"
```

## Known follow-ups

- PDF export (the more "send this to my lender" format than CSV) isn't
  built — natural next step, would use the platform's PDF generation
  capability once this module is wired into a document-producing flow.
- No period-over-period comparison view yet (e.g. "this month vs last") —
  straightforward to add by calling `/profit-loss` twice and diffing, either
  here or in the dashboard UI.
