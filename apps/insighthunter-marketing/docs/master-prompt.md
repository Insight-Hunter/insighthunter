# insighthunter-marketing Master Prompt

## Purpose
Authoritative product, architecture, and implementation guidance for insighthunter-marketing.

## Insight Hunter Platform Standards
- Serve small businesses with secure, practical, cost-aware financial operations.
- Prefer Cloudflare-native services: Workers, Durable Objects, D1, KV, R2, Queues, Workflows, Workers AI, Analytics Engine, Browser Rendering, and Static Assets.
- Use TypeScript and ES Modules; validate input, handle errors, log safely, define explicit CORS, rate-limit public endpoints, and use least-privilege bindings.
- Preserve strict tenant isolation. Never expose, mix, or infer one business's records from another business's data.
- Document data ownership, retention, encryption, compliance responsibilities, external integrations, failure modes, recovery processes, and operational runbooks.
- Optimize for global low latency, maintainability, low operating cost, customer privacy, and clear user workflows.

## Documentation Rules
- Link every app-specific architecture, API, schema, feature, security, operations, and integration document from this folder.
- Update this file for any material change to billing, entitlements, authentication, customer data, compliance, pricing, Cloudflare bindings, or service behavior.
# Master Prompt: insighthunter-marketing

The full prompt for this app is in [`../insight_hunter_marketing_prompt.md`](../insight_hunter_marketing_prompt.md). Treat that file as the source of truth until it is moved into this docs folder.

## Summary
Astro site at insighthunter.app: promotes Lite, Hunter, and Elite tiers; handles SEO, privacy, terms, blog, signup funnel; calls insighthunter-auth for login and registration.
