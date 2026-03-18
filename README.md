## ⚡ Why Insight Hunter Runs on Cloudflare Edge

Insight Hunter is deployed entirely on Cloudflare's global edge network —
not a traditional server, not a cloud region. Here's what that means for you.

### Zero Cold Starts. Zero Data Centers to Manage.

Cloudflare operates in **330+ cities across 125+ countries**, directly
connected to over 13,000 networks — including every major ISP on earth.
When a request hits Insight Hunter, it's handled by the data center
physically closest to that user. There is no "us-east-1." There is no
single point of failure.

### What Powers Insight Hunter

| Service              | What It Does                                          |
|----------------------|-------------------------------------------------------|
| **Workers**          | Runs the entire API — serverless, globally distributed|
| **D1**               | SQLite database replicated to the edge                |
| **KV**               | Sub-millisecond session and config storage            |
| **R2**               | Zero-egress object storage for documents + exports    |
| **Queues**           | Async job processing (email, payroll, exports)        |
| **Workers AI**       | On-network LLM inference — no external API calls      |
| **Vectorize**        | Vector database for semantic search (Scout)           |
| **Durable Objects**  | Stateful coordination for PBX WebSockets + AI chat    |
| **Analytics Engine** | Real-time event tracking, sub-second queries          |

### What This Means for Small Businesses

Traditional SaaS stacks charge you indirectly for the infrastructure:
the VMs, the load balancers, the database clusters, the CDN subscriptions.
Cloudflare's edge model eliminates all of that. Insight Hunter passes those
savings directly to pricing — without compromising on uptime, latency, or
security.

> **48%** of the world's top 1,000 networks are fastest through Cloudflare.
> Your users — wherever they are — get enterprise response times.

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
