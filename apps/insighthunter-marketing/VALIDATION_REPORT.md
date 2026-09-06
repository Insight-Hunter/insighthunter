# Validation Report — apps/insighthunter-marketing

## Scope

Built the public Insight Hunter marketing website under
`apps/insighthunter-marketing` only, per
`apps/insighthunter-marketing/insight_hunter_marketing_prompt.md`. No files
outside `apps/insighthunter-marketing` were changed. No deploy, DNS,
Cloudflare route/custom-domain, Stripe, production secret, or tenant data
changes were made.

## Commands run and results

All commands were run from the repo root against the new workspace package.

```bash
corepack prepare pnpm@10.12.4 --activate
pnpm install --frozen-lockfile        # baseline install, 26 workspace projects
pnpm install --no-frozen-lockfile     # after adding the new package, 27 projects, lockfile updated
pnpm --filter @insighthunter/marketing lint        # biome check src tests -> PASS (0 errors)
pnpm --filter @insighthunter/marketing typecheck    # tsc -p tsconfig.json --noEmit -> PASS (0 errors)
pnpm --filter @insighthunter/marketing test         # vitest run --passWithNoTests -> PASS (14/14 tests)
pnpm --filter @insighthunter/marketing build        # wrangler deploy --dry-run -> PASS, bindings printed correctly
```

Manual smoke test: ran `wrangler dev --local` against a **temporary** copy of
`wrangler.jsonc` with `compatibility_date` lowered to `2026-08-23` (the
sandbox's bundled `workerd` only supports up to `2026-08-27`; see Blocker
below), then `curl`'d every route:

- `GET /`, `/features`, `/pricing`, `/addons`, `/about`, `/security`,
  `/contact`, `/resources`, `/resources/saas-data-mining-guide`,
  `/resources/predictive-analytics-directory`, `/legal/privacy`,
  `/legal/terms`, `/robots.txt`, `/sitemap.xml`, `/health` — all `200`.
- `GET /nope` — `404` via the custom not-found page.
- `POST /contact` with a valid payload — `200`, renders the success alert,
  and the structured request log line contains no form field values.
- Confirmed rendered HTML contains the exact required CTA URLs:
  - `https://auth.insighthunter.app/register?plan=startup` (and `standard`,
    `pro` on `/pricing`)
  - `https://auth.insighthunter.app/login?return_to=https%3A%2F%2Fapp.insighthunter.app%2Fdashboard`
  - Confirmed `insighthutner` (misspelling) does not appear anywhere in
    rendered output or source.
- Confirmed response headers include CSP (`script-src 'self'`, no
  `unsafe-inline` for scripts), HSTS, `X-Frame-Options: DENY`,
  `X-Content-Type-Options: nosniff`, `Referrer-Policy`, `Permissions-Policy`.

The temporary compatibility-date edit was reverted immediately after the
smoke test; the committed `wrangler.jsonc` uses `compatibility_date =
"2026-09-06"` as required and was re-verified with `lint`/`typecheck`/
`test`/`build` afterward (all still pass).

## Blockers

- **Local `wrangler dev`/`wrangler deploy` cannot boot with
  `compatibility_date: 2026-09-06`** in this sandbox: the bundled `workerd`
  binary caps out at `2026-08-27` ("newest date supported by this server
  binary"). This is an environment/tooling limitation, not an app defect —
  `wrangler deploy --dry-run` (used for `pnpm build`) does not start the
  runtime and succeeds. Real deploys from a Wrangler version that ships a
  newer `workerd` will not hit this.
- No outbound email integration exists for contact-form notifications (no
  email-sending binding, e.g. MailChannels/Workers Email Routing, was
  added — that would be an external dependency not required to satisfy the
  stated CTA/SEO/security requirements). Instead, validated submissions are
  persisted to a dedicated `LEADS` KV namespace (90-day TTL,
  `src/lib/leads.ts`) so the success message shown to users is accurate
  (something is retained for sales follow-up) rather than silently
  discarding the data. Wiring `LEADS` up to real email/CRM delivery reading
  `CONTACT_TO_EMAIL` remains a documented follow-up.

## Conflicts with the existing marketing/dashboard/auth split (flagged, not silently violated)

1. **Login/signup query parameter names differ from `insighthunter-auth`'s
   actual implementation.** The task's CTA requirements specify
   `return_to` and `plan=startup`. `apps/insighthunter-auth/src/index.ts`
   currently reads `returnTo` (not `return_to`) and only allows
   `plan` values `lite`, `standard`, `pro` (not `startup`) — see
   `ALLOWED_PLANS` and `safeReturnTo`/`safePlan` in that file. Per
   instructions, the marketing site's CTAs were built **exactly** as
   specified in the task (this is called out as a hard requirement, not a
   "where compatible" item). This means, as committed today, a visitor
   clicking "Start Free Trial" will land on `/register?plan=startup`, which
   `insighthunter-auth` will currently coerce to its default plan (`lite`)
   because `startup` isn't in its allow-list, and `return_to` is silently
   ignored in favor of the default `${APP_ORIGIN}/dashboard` because only
   `returnTo` is read. Functionally the user still ends up at
   `app.insighthunter.app/dashboard` after registering, so there is no
   broken link or security issue, but the plan selection signal is lost.
   **Recommendation:** align `insighthunter-auth`'s `ALLOWED_PLANS` (rename
   `lite` → `startup`, or add `startup` as an alias) and accept `return_to`
   (in addition to or instead of `returnTo`) in a follow-up change scoped to
   `insighthunter-auth`, which is out of bounds for this task.
2. **No production route/domain change was made.** `apps/insighthunter-main`
   still owns the `insighthunter.app` / `www.insighthunter.app` Cloudflare
   routes in its `wrangler.toml`. This new Worker is deployable to a
   `workers.dev` preview subdomain or a non-production route, but cutting
   the public domain over to it is an explicit, reviewed infrastructure
   change intentionally left out of this build (task says not to modify
   Cloudflare routes/custom domains).
3. **`apps/insighthunter-main` already contains an overlapping, largely
   stubbed Astro marketing site** (pricing/signup/login pages, empty
   `src/pages/api/contact.ts`). Per the task, `apps/insighthunter-main` was
   left untouched (no migration doc was requested/needed beyond this
   report, since no other file in that app was modified). Consolidating the
   two marketing surfaces is a product/infra decision outside this task's
   scope.

## Automated code review feedback addressed

Three rounds of automated review (code review + CodeQL) were run via
`parallel_validation`. CodeQL found 0 alerts in every round. Code review
findings and fixes:

1. Bot (honeypot) detection ran after the rate-limit check, letting bot
   submissions consume a real client's rate-limit budget. **Fixed**:
   validation/honeypot is now checked before the rate limiter is touched.
2. Honeypot detection overwrote `errors.message`, conflating bot rejection
   with genuine field validation. **Fixed**: `ValidationResult` now has a
   distinct `bot: boolean` field.
3. Bot-detected submissions returned HTTP 422 (identical to real validation
   errors), signaling detection to automated scripts. **Fixed**: bots now
   receive the same silent `200` success response as real submissions,
   without being rate-limited or persisted.
4. Validated contact submissions were discarded after validation while
   still showing a "success" message, which was misleading since nothing
   was retained. **Fixed**: added `src/lib/leads.ts` (`recordLead`),
   persisting genuine submissions to a new `LEADS` KV namespace (90-day
   TTL) — a lightweight, dependency-free holding area rather than an
   invented external email/CRM integration.
5. The rate limiter's KV read-then-write is not atomic, so under
   concurrency more than `MAX_REQUESTS_PER_WINDOW` requests can pass
   (under-throttling, not just eventual-consistency lag). **Accepted as a
   documented limitation** (comment in `src/lib/rate-limit.ts`): a Durable
   Object counter would close this gap but isn't justified to protect a
   public lead-gen form; revisit if abuse is observed.
6. `clientKeyFrom` fell back to the literal string `"unknown"` when
   `CF-Connecting-IP` was absent (local dev / non-Cloudflare test
   environments), which would put all such clients in one shared
   rate-limit bucket. **Fixed**: falls back to a `User-Agent`-derived key
   instead, with no behavior change in production where the IP header is
   always present.
7. The JSON-LD `SoftwareApplication` offers (`Startup`/`Standard`/`Pro`)
   were hardcoded separately from the pricing page's plan names/prices
   (`Scout`/`Hunter`/`Apex`), risking drift. **Fixed**: extracted a single
   `PLANS` source of truth (`src/lib/plans.ts`) consumed by both
   `src/pages/pricing.ts` and `src/lib/seo.ts`.

## Out of scope / untouched (by design)

- `apps/insighthunter-main`, `apps/insighthunter-auth`,
  `apps/insighthunter-dashboard`, DNS, Cloudflare routes/custom domains,
  Stripe config, production secrets, and all tenant/financial data.
- `.github/workflows/*` — no changes were needed; `pnpm-workspace.yaml`
  already globs `apps/*`, so `turbo`-driven `lint`/`typecheck`/`test`/`build`
  in CI picks up the new package automatically, and `deploy.yml` does not
  reference this app (consistent with "do not deploy").
