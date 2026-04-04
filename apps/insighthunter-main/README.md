# insighthunter-main

Astro + Svelte frontend for Insight Hunter — the AI-powered Auto-CFO.

## Stack

- **Astro 5** · SSR via Cloudflare Pages adapter
- **Svelte 5** · Interactive dashboard components
- **Hono** · API routes in `functions/api/[[path]].ts`
- **Cloudflare** · KV (sessions), D1 (data), R2 (assets), Analytics Engine, Pages

## Local Dev

```bash
npm install
npm run dev        # http://localhost:4321
```
