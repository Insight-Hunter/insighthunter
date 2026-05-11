#!/bin/bash
set -e

if [ -f .env ]; then
  echo "Loading environment variables from .env"
  export $(grep -v '^[[:space:]]*#' .env | grep -E '^[a-zA-Z_][a-zA-Z0-9_]*=' | xargs)
fi

<<<<<<< HEAD
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
=======
# Build the Next.js application
echo "Building Next.js application..."
npm run build

# Remove cache directories
rm -rf .next/cache
rm -rf dev

echo "Deploying insighthunter-auth..."
npx wrangler deploy --config apps/insighthunter-auth/wrangler.toml

echo "Deploying insighthunter..."
npx wrangler pages deploy

echo "Deployjng Bizforma...."
npx wrangler deploy --config apps/insighthunter-bizforma/wrangler.toml"

# Install dependencies for insighthunter-bookkeeping
echo "Installing dependencies for insighthunter-bookkeeping..."
(cd apps/insighthunter-bookkeeping && npm install)

echo "Deploying insighthunter-bookkeeping..."
npx wrangler deploy --config apps/insighthunter-bookkeeping/wrangler.toml

echo "Deploying insighthunter-lite..."
npx wrangler deploy --config apps/insighthunter-lite/wrangler.toml

echo "Deploying insighthunter-pbx..."
npx wrangler deploy --config apps/insighthunter-pbx/wrangler.toml
>>>>>>> 67612b7d33a6889fca29e77e31214f4791cbb16f

echo "All applications deployed successfully!"
