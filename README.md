# InsightHunter

Production-oriented monorepo for InsightHunter applications and shared platform packages.

## Workspace

- `apps/*` — deployable applications and Workers.
- `packages/*` — shared domain, platform, SDK, and UI packages.
- `infrastructure/*` — IaC, deployment, and environment automation.

## Standards

- Strict TypeScript.
- No `any`.
- Domain logic independent of infrastructure.
- Constructor injection and immutable domain primitives.
- CI-gated lint, typecheck, test, and build.

## Commands

- `pnpm install`
- `pnpm dev`
- `pnpm lint`
- `pnpm typecheck`
- `pnpm test`
- `pnpm build`

## Current focus

Sprint 1.1 establishes a hardened kernel package and workspace-level delivery controls.
