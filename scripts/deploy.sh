#!/bin/bash
set -euo pipefail

ROOT="/Users/jamesmichaelhunterturner/Documents/insighthunter"

cd "$ROOT"

if [ -f .env ]; then
  echo "Loading environment variables from .env"
  export $(grep -v '^[[:space:]]*#' .env | grep -E '^[a-zA-Z_][a-zA-Z0-9_]*=' | xargs)
fi

echo "Installing dependencies..."
npx pnpm install --recursive

echo "Building main application..."
(
  cd apps/insighthunter-main
  npx pnpm build
)

echo "Preparing Pages deployment assets..."
cat > apps/insighthunter-main/dist/.assetsignore <<'EOF'
_worker.js
EOF

deploy_worker() {
  local app_dir="$1"
  local app_name
  app_name="$(basename "$app_dir")"

  if [ ! -d "$app_dir" ]; then
    echo "Skipping $app_name: directory not found"
    return
  fi

  if [ ! -f "$app_dir/wrangler.toml" ]; then
    echo "Skipping $app_name: wrangler.toml not found"
    return
  fi

  echo "Deploying $app_name worker..."
  (
    cd "$app_dir"
    npx wrangler deploy
  )
}

echo "Deploying workers in required order..."

deploy_worker "apps/insighthunter-platform-worker"
deploy_worker "apps/insighthunter-tenant"

deploy_worker "apps/insighthunter-advisor"
deploy_worker "apps/insighthunter-bookkeeping"
deploy_worker "apps/insighthunter-bizforma"
deploy_worker "apps/insighthunter-compliance"
deploy_worker "apps/insighthunter-finops"
deploy_worker "apps/insighthunter-insights"
deploy_worker "apps/insighthunter-ledger"
deploy_worker "apps/insighthunter-notifications"
deploy_worker "apps/insighthunter-payroll"
deploy_worker "apps/insighthunter-pbx"
deploy_worker "apps/insighthunter-report"
deploy_worker "apps/insighthunter-reports"
deploy_worker "apps/insighthunter-roadmap"
deploy_worker "apps/insighthunter-scout"
deploy_worker "apps/insighthunter-whitelabel"
deploy_worker "apps/insighthunter-cron"

deploy_worker "apps/insighthunter-auth"
deploy_worker "apps/insighthunter-dispatch"

echo "Deploying insighthunter-main worker..."
(
  cd apps/insighthunter-main
  npx wrangler deploy
)

echo "Deploying insighthunter-main Pages frontend..."
npx wrangler pages deploy apps/insighthunter-main/dist --project-name=insighthunter-main

echo "All applications deployed successfully!"
