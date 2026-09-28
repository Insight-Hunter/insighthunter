# insighthunter-main

The public marketing site — `insighthunter.app`. Astro, deployed to
Cloudflare Workers Static Assets. Handles: landing page, module descriptions,
pricing (live from `insighthunter-payments`), and signup/login (against
`insighthunter-auth`).

## Design

Field-journal / trail-map identity — deliberately not the cream+serif or
near-black+neon SaaS defaults. Deep forest ink (`#14231F`) + cool sage paper
(`#E9EDE7`, not warm cream) + amber "signal found" accent (`#D9A441`).
`Instrument Serif` for headlines, `Public Sans` for body, `IBM Plex Mono` for
every number and UI label — ledger-style tabular figures throughout. The
hero's signature element is topographic contour lines resolving into a line
chart with a hand-stamped field-note callout, a literal rendering of
"tracking down the signal in your numbers."

## Setup

```bash
npm install
cp .env.example .env   # point at local auth/payments workers for dev
npm run dev
```

## Deploy

```bash
npm run build
npx wrangler deploy
```

`wrangler.toml` sets `PUBLIC_AUTH_API_URL`, `PUBLIC_PAYMENTS_API_URL`, and
`PUBLIC_APP_BASE_URL` as plain vars (no secrets live in this app — it only
ever calls public API endpoints from the browser).

## How auth actually works here (a deliberate scope decision)

`insighthunter-auth` is API-only (register/login/session-verify/logout) — it
has no hosted UI of its own. The login and signup **forms** live here, in
`insighthunter-main`, and call the auth API directly via `fetch`. This keeps
one public-facing UI surface instead of splitting it across two domains.
`auth.insighthunter.app` remains purely the API/authorization boundary, as
the architecture doc specifies — it just doesn't render pages.

Flow:

1. `/signup` (optionally `?tier=standard` or `?addon=payroll` from a pricing
   button) → `POST auth/register` → if a paid tier/add-on was requested,
   immediately `POST payments/checkout` and redirect to Stripe; otherwise
   redirect straight to `app.insighthunter.app/dashboard?token=...`.
2. `/login` → `POST auth/login` → redirect to
   `app.insighthunter.app/dashboard?token=...`.

## Known follow-up (flagged, not silently skipped)

Passing the session token as a `?token=` query param to the dashboard is a
placeholder handoff — fine for getting the dashboard app built next, but the
real version should have the dashboard worker exchange that token for a
proper `HttpOnly; Secure; SameSite=Strict` cookie scoped to
`.insighthunter.app` (set server-side by a redirect endpoint), so the token
never sits in browser history or a URL bar. Do this as part of building
`insighthunter-dashboard`.

## Pages

- `/` — landing page
- `/modules` — all six modules with tier requirements
- `/pricing` — live tiers + add-ons from `insighthunter-payments` `/catalog`
- `/signup`, `/login` — auth forms
