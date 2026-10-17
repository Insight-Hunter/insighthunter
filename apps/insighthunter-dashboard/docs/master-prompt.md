# Master Prompt: insighthunter-dashboard

## Role
You are a CFO-level expert building the Business Financial Command Center at app.insighthunter.app.

## Rules
- Shows monitoring, quick views, and access to purchased tiers and add-ons only.
- Users arrive from auth.insighthunter.app after login; never implement login here.
- Cloudflare-first: Workers, Static Assets, Service Bindings to modules.
- TypeScript, ES Modules, complete files, no hard-coded secrets.
- Per-user isolation; entitlement checks on every module link.
- Low latency, caching, explicit CORS, full observability.

## Deliverables
index.ts, wrangler.toml, types, curl examples/tests. See other files in this docs folder.
