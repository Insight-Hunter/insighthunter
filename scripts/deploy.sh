#!/bin/bash
set -e

if [ -f .env ]; then
  echo "Loading environment variables from .env"
  export $(grep -v '^[[:space:]]*#' .env | grep -E '^[a-zA-Z_][a-zA-Z0-9_]*=' | xargs)
fi

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

echo "All applications deployed successfully!"
