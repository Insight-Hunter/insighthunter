# Insight Hunter — Dashboard

`app.insighthunter.app`. The entitled application launcher and command center.

Every tab reads and writes real data by calling the actual module Worker that
owns it — via Cloudflare **service bindings**, not local demo data:

| Tab | Backed by |
| --- | --- |
| Overview (KPIs, cash flow, health score) | `insighthunter-insights` (`/api/summary`) |
| Invoices | `insighthunter-invoicing` (`/api/invoices`, `/api/clients`, `/api/payments`) |
| Bills | `insighthunter-bills` (`/api/bills`, `/api/vendors`, `/api/payments`) |
| Payroll (employees) | `insighthunter-payroll` (`/api/employees`) |
| Journal (chart of accounts + manual entries) | `insighthunter-ledger` (`/api/accounts`, `/api/journals`) |
| Apps | Tier-gated launcher tiles linking to every other subdomain (bookkeeping, advisor, reports, bizforma, pbx, scout) |

Payroll run *approval* is intentionally not wired here — it requires the
tax-provider (Check) onboarding flow that lives in `insighthunter-payroll`
itself; the Payroll tab links out to it rather than faking the action.

## Files

```
src/
  index.js       # Hono Worker: verifies session, proxies each tab to its service binding
  session.js     # calls insighthunter-auth's /session/verify over AUTH_SERVICE
  services.js    # fetch wrapper that forwards identity headers to a service binding
public/
  index.html     # shell that loads /client.js
  client.js      # UI — tabs, forms, charts; talks only to this Worker's /api/*
wrangler.json    # Worker + static assets + service binding config
```

## Auth model

- Every request is gated by `AUTH_SERVICE` (`insighthunter-auth`). No session →
  redirect to `${AUTH_ORIGIN}/login` (HTML) or `401` (`/api/*`).
- `insighthunter-auth` has no separate `organizations` table — each user **is**
  the tenant, so `orgId === userId` is forwarded to every downstream service.
- Downstream services expect identity via headers (`X-User-Id`, `X-Org-Id`,
  `X-User-Role`, `X-User-Email`, `X-Org-Name`, `X-Org-Plan`, plus the lowercase
  `x-organization-id`/`x-user-id` pair `insighthunter-ledger` uses) — see
  `src/services.js`.

## Deploy

```sh
cd apps/insighthunter-dashboard
pnpm install
npx wrangler deploy
```

Requires the six services listed in `wrangler.json` (`insighthunter-auth`,
`insighthunter-insights`, `insighthunter-invoicing`, `insighthunter-bills`,
`insighthunter-payroll`, `insighthunter-ledger`) to already be deployed under
those exact Worker names, since service bindings resolve by name at deploy time.
