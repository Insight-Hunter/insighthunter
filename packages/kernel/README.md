# @insighthunter/kernel

Foundational DDD kernel for InsightHunter.

## Includes

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

## Scripts

- `pnpm --filter @insighthunter/kernel build`
- `pnpm --filter @insighthunter/kernel typecheck`
- `pnpm --filter @insighthunter/kernel test`
- `pnpm --filter @insighthunter/kernel lint`
