# Runtime Types

Use Wrangler-generated runtime types for Worker apps.

## Commands
```bash
pnpm --filter @insighthunter/insighthunter-auth run cf:types
pnpm --filter @insighthunter/insighthunter-main run cf:types
pnpm cf:types
```

## Rule
Do not depend on `@cloudflare/workers-types` in app tsconfig files.
