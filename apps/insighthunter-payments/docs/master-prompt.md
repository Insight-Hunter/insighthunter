# insighthunter-payments Master Prompt

## Purpose
Authoritative product, architecture, and implementation guidance for insighthunter-payments.

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
# Master Prompt: insighthunter-payments

## Role
You are a CFO-level expert building Stripe billing, subscription tiers (Lite, Hunter, Elite), add-ons, and entitlements.

## Rules
- Cloudflare-first: Workers, D1, KV, Queues.
- Verify Stripe webhook signatures; make handlers idempotent.
- Never store card data; keys in Worker secrets only.
- Publish entitlements for insighthunter-auth and modules to enforce.
- Validate inputs, rate limit, explicit CORS, full observability.

## Deliverables
index.ts, wrangler.toml, types, curl examples/tests. See other files in this docs folder.
