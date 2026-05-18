#!/usr/bin/env bash
# migrate.sh — Run D1 migrations for all apps
# Usage: bash migrate.sh [local|preview|production]
set -e
ENV=${1:-local}

echo "=== Running D1 Migrations: $ENV ==="

# --- Helper function to run migration ---
run_migration() {
  local app_dir=$1
  local db_name=$2
  local env=$3

  echo "-> Migrating $app_dir..."
  cd "$app_dir"

  case $env in
    local)
      wrangler d1 migrations apply "$db_name" --local
      ;;
    preview)
      wrangler d1 migrations apply "${db_name}-preview" --env preview
      ;;
    production)
      wrangler d1 migrations apply "$db_name"
      ;;
  esac

  cd ../.. # Go back to project root
}


case $ENV in
  local|preview)
    run_migration "apps/insighthunter-advisor" "insighthunter-advisor" $ENV
    run_migration "apps/insighthunter-auth" "insighthunter-auth" $ENV
    run_migration "apps/insighthunter-bizforma" "insighthunter-bizforma" $ENV
    run_migration "apps/insighthunter-bookkeeping" "insighthunter-bookkeeping" $ENV
    run_migration "apps/insighthunter-insights" "insighthunter-insights" $ENV
    run_migration "apps/insighthunter-payroll" "insighthunter-payroll" $ENV
    run_migration "apps/insighthunter-report" "insighthunter-report" $ENV
    run_migration "apps/insighthunter-scout" "insighthunter-scout" $ENV
    run_migration "apps/ih-platform-worker" "ih-platform-worker" $ENV
    run_migration "apps/ih-tenant-template" "ih-tenant-template" $ENV
    run_migration "apps/insighthunter-finops" "insighthunter-finops" $ENV
    run_migration "apps/insighthunter-ledger" "insighthunter-ledger" $ENV
    ;;
  production)
    echo "⚠️  Applying to PRODUCTION. Press Ctrl+C to cancel, Enter to continue..."
    read
    run_migration "apps/insighthunter-advisor" "insighthunter-advisor" $ENV
    run_migration "apps/insighthunter-auth" "insighthunter-auth" $ENV
    run_migration "apps/insighthunter-bizforma" "insighthunter-bizforma" $ENV
    run_migration "apps/insighthunter-bookkeeping" "insighthunter-bookkeeping" $ENV
    run_migration "apps/insighthunter-insights" "insighthunter-insights" $ENV
    run_migration "apps/insighthunter-payroll" "insighthunter-payroll" $ENV
    run_migration "apps/insighthunter-report" "insighthunter-report" $ENV
    run_migration "apps/insighthunter-scout" "insighthunter-scout" $ENV
    run_migration "apps/ih-platform-worker" "ih-platform-worker" $ENV
    run_migration "apps/ih-tenant-template" "ih-tenant-template" $ENV
    run_migration "apps/insighthunter-finops" "insighthunter-finops" $ENV
    run_migration "apps/insighthunter-ledger" "insighthunter-ledger" $ENV
    ;;
  *)
    echo "Usage: bash migrate.sh [local|preview|production]"
    exit 1
    ;;
esac

echo "\n✅ Migrations complete for: $ENV"
