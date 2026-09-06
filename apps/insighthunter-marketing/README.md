# insighthunter-marketing

Public marketing website for Insight Hunter, deployed as a single Cloudflare
Worker (Hono). This app owns **only** public marketing content: informational
pages, SEO metadata, and a rate-limited contact form. It has no access to
tenant data, financial records, dashboard logic, private/admin APIs, billing
secrets, or the authentication credential lifecycle — see [Isolation
boundary](#isolation-boundary) below.

## Routes

| Path | Purpose |
| --- | --- |
| `/` | Home / hero / core capabilities / pricing teaser |
| `/features` | Feature detail page |
| `/pricing` | Scout / Hunter / Apex pricing tiers, one signup CTA per plan |
| `/addons` | Add-on marketplace with a client-side simulated checkout total |
| `/about` | Company page |
| `/security` | Public security & isolation-boundary statement |
| `/contact` (GET/POST) | Validated, rate-limited lead form |
| `/resources`, `/resources/saas-data-mining-guide`, `/resources/predictive-analytics-directory` | SEO content |
| `/legal/privacy`, `/legal/terms` | Legal pages |
| `/robots.txt`, `/sitemap.xml` | Crawler directives |
| `/health` | Liveness check |

## CTA links

Login and signup links are built in one place (`src/lib/links.ts`) from
environment variables so they never diverge from the required format:

- Signup: `https://auth.insighthunter.app/register?plan=startup|standard|pro`
- Login: `https://auth.insighthunter.app/login?return_to=https%3A%2F%2Fapp.insighthunter.app%2Fdashboard`

The domain is always `app.insighthunter.app` / `auth.insighthunter.app` —
never the misspelled `insighthutner.app`.

## Isolation boundary

- No database, KV (other than the contact-form rate limiter), or Durable
  Object binding holds tenant, financial, or session data.
- Sign-in and account creation happen exclusively on `insighthunter-auth`.
- The authenticated dashboard (`insighthunter-dashboard`) is a separate
  Worker; this app only links to it, it never renders authenticated views.
- Request logs record `method`, `path`, `status`, `durationMs` only — form
  field values are never logged (`src/lib/security.ts`).

## Local development

```bash
pnpm --filter @insighthunter/marketing dev        # wrangler dev
pnpm --filter @insighthunter/marketing lint        # biome check
pnpm --filter @insighthunter/marketing typecheck    # tsc --noEmit
pnpm --filter @insighthunter/marketing test         # vitest
pnpm --filter @insighthunter/marketing build        # wrangler deploy --dry-run
```

> Note: this sandbox's bundled `workerd` binary only supports compatibility
> dates up to `2026-08-27`, so `wrangler dev`/`wrangler deploy` against the
> configured `2026-09-06` compatibility date will fail to boot locally until
> Wrangler is upgraded. `build` (`wrangler deploy --dry-run`) does not start
> the runtime and passes. See the validation report for details.

## Configuration

`wrangler.jsonc` declares only the bindings this app actually uses:

- `RATE_LIMIT` (KV) — fixed-window rate limiter for the contact form only.
  Replace `REPLACE_WITH_KV_NAMESPACE_ID` / `REPLACE_WITH_KV_PREVIEW_NAMESPACE_ID`
  with real namespace ids before deploying.
- `vars.CANONICAL_ORIGIN`, `vars.AUTH_ORIGIN`, `vars.APP_ORIGIN` — the three
  origins that differ per environment (production vs. preview/staging).
- `vars.CONTACT_TO_EMAIL` — informational only; no outbound email is wired up
  yet (see the validation report).

No `routes` entry is defined — `insighthunter.app` is currently routed to
`apps/insighthunter-main`. Cutting the production domain over to this Worker
is an explicit infrastructure change outside this app's scope.
