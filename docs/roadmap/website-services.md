<!-- docs/roadmap/website-services.md -->
# Website Services — roadmap (not sold)

Not currently sold. Do not add to `addons.ts` or `catalog.ts` until:
1. `apps/insighthunter-sites` exists with, at minimum: template selection,
   Cloudflare Pages/Workers Static Assets deployment per customer subdomain,
   and a custom-domain CNAME flow.
2. It has a `/health` endpoint and passes `pnpm verify:platform`.
3. Support cost (design revisions, DNS troubleshooting) is priced into the
   $79/mo rate — recommend re-costing before relaunch, template-based
   website builders typically run thin margins if support isn't capped.
