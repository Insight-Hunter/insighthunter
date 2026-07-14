# Install Commands

## Fresh setup
```bash
cd /Users/jamesmichaelhunterturner
mkdir -p insighthunter
cd insighthunter
# copy the pack contents here first
bash scripts/setup-monorepo.sh
```

## Core commands
```bash
pnpm install
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

## Local app development
```bash
cd apps/insighthunter-main && pnpm dev
cd apps/insighthunter-auth && pnpm dev
cd apps/insighthunter-dispatch && pnpm dev
```

## Cloudflare deploy
```bash
pnpm exec wrangler login
cd apps/insighthunter-main && pnpm exec wrangler deploy
cd apps/insighthunter-auth && pnpm exec wrangler deploy
cd apps/insighthunter-dispatch && pnpm exec wrangler deploy
```
