#!/bin/bash
set -e

if [ -f .env ]; then
  echo "Loading environment variables from .env"
  export $(grep -v '^[[:space:]]*#' .env | grep -E '^[a-zA-Z_][a-zA-Z0-9_]*=' | xargs)
fi

echo "Installing dependencies..."
pnpm install

# Build the main application
echo "Building main application..."
pnpm --filter insighthunter-main build

echo "Deploying insighthunter (main frontend)..."
npx wrangler pages deploy dist

echo "Deploying insighthunter-auth worker..."
npx wrangler deploy --config workers/insighthunter-auth/wrangler.toml

echo "Deploying Bizforma worker..."
npx wrangler deploy --config apps/insighthunter-bizforma/wrangler.toml

echo "Deploying insighthunter-bookkeeping worker..."
npx wrangler deploy --config apps/insighthunter-bookkeeping/wrangler.toml

echo "Deploying insighthunter-advisor worker..."
npx wrangler deploy --config apps/insighthunter-advisor/wrangler.toml

echo "Deploying insighthunter-finops worker..."
npx wrangler deploy --config apps/insighthunter-finops/wrangler.toml

echo "Deploying insighthunter-ledger worker..."
npx wrangler deploy --config apps/insighthunter-ledger/wrangler.toml

echo "Deploying insighthunter-payroll worker..."
npx wrangler deploy --config apps/insighthunter-payroll/wrangler.toml

echo "Deploying insighthunter-roadmap worker..."
npx wrangler deploy --config apps/insighthunter-roadmap/wrangler.toml

echo "All applications deployed successfully!"
