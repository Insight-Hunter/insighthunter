# @insighthunter/kernel

Foundational DDD kernel for InsightHunter.

Shared domain kernel for InsightHunter packages and Cloudflare Workers.

The package contains dependency-free DDD primitives:

- Result / Maybe primitives
- Domain errors and guards
- UniqueId / TypedId
- ValueObject / Entity / AggregateRoot
- Specification / Policy
- Domain events and in-memory event bus
- Repository / UnitOfWork contracts
- ImmutableList
- Clock abstraction
- JSON bigint-safe helpers
- branded identifiers and entity IDs
- entities, aggregates, value objects, and domain events
- result and domain error types
- use-case and repository ports
- Cloudflare-native runtime context abstractions

## Scripts

- `pnpm --filter @insighthunter/kernel build`
- `pnpm --filter @insighthunter/kernel typecheck`
- `pnpm --filter @insighthunter/kernel test`
- `pnpm --filter @insighthunter/kernel lint`

