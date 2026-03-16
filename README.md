git ad
# insighthunter-main

Marketing site + dashboard PWA for [insighthunter.app](https://insighthunter.app).

Built with Astro + Svelte on Cloudflare Pages.

## Stack
- **Framework**: Astro 4 (SSR via Cloudflare adapter)
- **UI**: Svelte 5 (interactive islands), Astro (static shells)
- **Styling**: SCSS with sand/taupe design system
- **Deploy**: Cloudflare Pages + Workers
- **Auth**: `insighthunter-auth` Worker via service binding

## Development

\`\`\`bash
pnpm install
pnpm --filter insighthunter-main dev
\`\`\`

## Deploy

\`\`\`bash
pnpm --filter insighthunter-main build
wrangler pages deploy dist --project-name insighthunter-main
\`\`\`

## Architecture

All `/api/*` requests are proxied through `functions/api/[[path]].ts`
to the appropriate Cloudflare Worker via service bindings.
Session validation happens in `src/middleware/index.ts` — every
`/dashboard/*` route requires a valid `ih_session` cookie.
