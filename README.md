# InsightHunter

Cloudflare-first monorepo for Insight Hunter's small-business bookkeeping,
reporting, advisory, payroll workflow, compliance, and communications products.

## Workspace

- `apps/*` — deployable applications and Workers.
- `packages/*` — shared domain, platform, SDK, and UI packages.
- `infrastructure/*` — IaC, deployment, and environment automation.

## Standards

- Strict TypeScript.
- No 'any'.
- Domain logic independent of infrastructure.
- Constructor injection and immutable domain primitives.
- CI-gated lint, typecheck, test, and build.

## Commands

- `pnpm setup` — validates Node/pnpm, installs the locked workspace, and verifies the platform layout.
- `pnpm verify:platform` — confirms required deployable apps and marketing pages exist.
- `pnpm dev`
- `pnpm lint`
- `pnpm typecheck`
- `pnpm test`
- `pnpm build`

## First deployment

1. Install Node 22+ and the pnpm version pinned in `package.json`.
2. Run `pnpm setup`.
3. Create the Cloudflare resources named in each app's `wrangler.toml`, then
   replace the example resource IDs with the IDs from your Cloudflare account.
4. Set each application's secrets with `wrangler secret put`; do not place
   secrets in `wrangler.toml` or commit `.dev.vars`.
5. Apply D1 schemas, deploy `insighthunter-auth`, deploy
   `insighthunter-payments`, then deploy the dashboard and product modules.
6. Configure Stripe webhook delivery only after the payments Worker is live.

See [the platform architecture](docs/ARCHITECTURE.md) for the domain map,
isolation model, request flow, and provider boundaries.

## Current focus

Sprint 1.1 establishes a hardened kernel package and workspace-level delivery controls.
