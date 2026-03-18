#!/usr/bin/env bash
# migrate.sh — Run D1 migrations for all apps
# Usage: bash migrate.sh [local|preview|production]
set -e
ENV=${1:-local}

echo "=== Running D1 Migrations: $ENV ==="

case $ENV in
  local)
    cd apps/insighthunter-api
    wrangler d1 migrations apply insighthunter-main --local
    cd ../insighthunter-pbx
    wrangler d1 migrations apply insighthunter-main --local
    ;;
  preview)
    cd apps/insighthunter-api
    wrangler d1 migrations apply insighthunter-preview --env preview
    cd ../insighthunter-pbx
    wrangler d1 migrations apply insighthunter-preview --env preview
    ;;
  production)
    echo "⚠️  Applying to PRODUCTION. Press Ctrl+C to cancel, Enter to continue..."
    read
    cd apps/insighthunter-api
    wrangler d1 migrations apply insighthunter-main
    cd ../insighthunter-pbx
    wrangler d1 migrations apply insighthunter-main
    ;;
  *)
    echo "Usage: bash migrate.sh [local|preview|production]"
    exit 1
    ;;
esac
echo "\n✅ Migrations complete for: $ENV"
