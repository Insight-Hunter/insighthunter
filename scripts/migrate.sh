#!/usr/bin/env bash
# scripts/migrate.sh
# ─────────────────────────────────────────────────────────────
# Insight Hunter — Full D1 Setup & Migration Runner
# Usage:
#   ./scripts/migrate.sh              # local dev (auto-creates DBs if missing)
#   ./scripts/migrate.sh --remote     # production (auto-creates DBs if missing)
# ─────────────────────────────────────────────────────────────

set -euo pipefail

# ─── Config ──────────────────────────────────────────────────────────────────

MAIN_DB_NAME="insighthunter-main"
PLATFORM_DB_NAME="insighthunter-platform"
REMOTE_FLAG=""
TIMESTAMP=$(date +"%Y-%m-%d %H:%M:%S")

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

# ─── Arg Parsing ─────────────────────────────────────────────────────────────

for arg in "$@"; do
  case $arg in
    --remote) REMOTE_FLAG="--remote" ;;
    --help|-h)
      echo "Usage: ./scripts/migrate.sh [--remote]"
      echo "  --remote   Apply to production D1 (omit for local dev)"
      echo "  Databases are created automatically if they do not exist."
      exit 0
      ;;
  esac
done

ENV_LABEL="${REMOTE_FLAG:+PRODUCTION}"
ENV_LABEL="${ENV_LABEL:-LOCAL DEV}"

# ─── Helpers ─────────────────────────────────────────────────────────────────

log()     { echo -e "${BLUE}[$(date +%H:%M:%S)]${NC} $*"; }
success() { echo -e "${GREEN}✓${NC} $*"; }
warn()    { echo -e "${YELLOW}⚠${NC}  $*"; }
error()   { echo -e "${RED}✗${NC}  $*"; exit 1; }
header()  { echo -e "\n${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"; echo -e "${CYAN}  $*${NC}"; echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"; }

# ─── Wrangler Resolution ─────────────────────────────────────────────────────

WRANGLER=""

resolve_wrangler() {
  # 1. Global binary (not just an alias)
  if command -v wrangler &>/dev/null; then
    echo "wrangler"
    return 0
  fi
  # 2. Local node_modules
  if [[ -f "./node_modules/.bin/wrangler" ]]; then
    echo "./node_modules/.bin/wrangler"
    return 0
  fi
  # 3. npx fallback
  if npx wrangler --version &>/dev/null 2>&1; then
    echo "npx wrangler"
    return 0
  fi
  return 1
}

check_wrangler() {
  log "Resolving wrangler..."
  WRANGLER=$(resolve_wrangler || true)

  if [[ -z "$WRANGLER" ]]; then
    warn "wrangler not found — installing globally..."
    npm install -g wrangler
    WRANGLER="wrangler"
  fi

  local version
  version=$($WRANGLER --version 2>&1 | head -1)
  success "Using: $WRANGLER ($version)"
}

# ─── SQL Runners ─────────────────────────────────────────────────────────────

run_sql() {
  local db_name="$1"
  local file="$2"
  local label="${3:-$(basename "$file")}"

  if [[ ! -f "$file" ]]; then
    warn "Skipping (not found): $file"
    return 0
  fi

  log "Applying ${label} → ${db_name} ${REMOTE_FLAG:-[local]}"
  if $WRANGLER d1 execute "$db_name" $REMOTE_FLAG --file="$file" 2>&1; then
    success "$label"
  else
    error "Failed: $label on $db_name"
  fi
}

run_sql_inline() {
  local db_name="$1"
  local sql="$2"
  local label="$3"

  log "Executing: ${label} → ${db_name}"
  if $WRANGLER d1 execute "$db_name" $REMOTE_FLAG --command="$sql" 2>&1; then
    success "$label"
  else
    error "Failed: $label on $db_name"
  fi
}

# ─── Auto-Create Database if Missing ─────────────────────────────────────────

ensure_database() {
  local db_name="$1"
  local wrangler_config="$2"

  log "Checking $db_name..."

  # Check if DB already exists
  if $WRANGLER d1 info "$db_name" $REMOTE_FLAG &>/dev/null; then
    success "$db_name — already exists"
    return 0
  fi

  warn "$db_name not found — creating automatically..."

  local output
  output=$($WRANGLER d1 create "$db_name" 2>&1)
  echo "$output"

  # Extract database_id from wrangler output (two possible formats)
  local db_id
  db_id=$(echo "$output" | grep -oE 'database_id = "[^"]+"' | head -1 | grep -oE '"[^"]+"' | tr -d '"')

  if [[ -z "$db_id" ]]; then
    db_id=$(echo "$output" | grep -oE '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}' | head -1)
  fi

  if [[ -n "$db_id" && -f "$wrangler_config" ]]; then
    log "Patching database_id ($db_id) into $wrangler_config..."
    sed -i '' "s/REPLACE_WITH_D1_ID/$db_id/g" "$wrangler_config"
    success "Patched $wrangler_config → database_id: $db_id"
  elif [[ -n "$db_id" ]]; then
    warn "Manually set database_id = \"$db_id\" in $wrangler_config"
  else
    warn "Could not extract database_id — manually update $wrangler_config"
  fi

  success "$db_name — created"
}

ensure_databases() {
  header "Ensuring D1 Databases Exist"
  ensure_database "$MAIN_DB_NAME"     "apps/insighthunter-main/wrangler.jsonc"
  ensure_database "$PLATFORM_DB_NAME" "apps/insighthunter-platform/wrangler.jsonc"
}

# ─── insighthunter-main Migrations ───────────────────────────────────────────

migrate_main() {
  header "insighthunter-main Migrations"

  run_sql "$MAIN_DB_NAME" \
    "apps/insighthunter-main/migrations/0001_init.sql" \
    "0001_init — onboarding_sessions"

  run_sql "$MAIN_DB_NAME" \
    "apps/insighthunter-main/schema.sql" \
    "schema.sql — customers, subscriptions, billing_events, entitlements"

  # Any additional migrations in sorted order
  for f in $(find apps/insighthunter-main/migrations -name "*.sql" 2>/dev/null | sort -V); do
    fname=$(basename "$f")
    [[ "$fname" == "0001_init.sql" ]] && continue
    run_sql "$MAIN_DB_NAME" "$f" "$fname"
  done
}

# ─── insighthunter-platform Migrations ───────────────────────────────────────

migrate_platform() {
  header "insighthunter-platform Migrations"

  run_sql "$PLATFORM_DB_NAME" \
    "infrastructure/migrations/0010_bos_foundation.sql" \
    "0010_bos_foundation — BOS core tables"

  # Any additional infrastructure migrations in sorted order
  for f in $(find infrastructure/migrations -name "*.sql" 2>/dev/null | sort -V); do
    fname=$(basename "$f")
    [[ "$fname" == "0010_bos_foundation.sql" ]] && continue
    run_sql "$PLATFORM_DB_NAME" "$f" "$fname"
  done
}

# ─── Seed Dev Data (local only) ──────────────────────────────────────────────

seed_dev() {
  [[ -n "$REMOTE_FLAG" ]] && return 0

  header "Seeding Local Dev Data"

  run_sql_inline "$MAIN_DB_NAME" "
    INSERT OR IGNORE INTO customers (id, user_id, email, created_at)
    VALUES ('cust_dev_001', 'user_dev_001', 'demo@insighthunter.app', datetime('now'));

    INSERT OR IGNORE INTO subscriptions (
      id, customer_id, plan_code, status, created_at, updated_at
    ) VALUES (
      'sub_dev_001', 'cust_dev_001', 'growth', 'active', datetime('now'), datetime('now')
    );

    INSERT OR IGNORE INTO entitlements (
      id, customer_id, subscription_id, feature_key, status, source, granted_at, created_at, updated_at
    ) VALUES
      ('ent_001', 'cust_dev_001', 'sub_dev_001', 'insights',    'active', 'plan', datetime('now'), datetime('now'), datetime('now')),
      ('ent_002', 'cust_dev_001', 'sub_dev_001', 'bookkeeping', 'active', 'plan', datetime('now'), datetime('now'), datetime('now')),
      ('ent_003', 'cust_dev_001', 'sub_dev_001', 'advisor',     'active', 'plan', datetime('now'), datetime('now'), datetime('now'));
  " "demo customer + subscription + entitlements"

  run_sql_inline "$PLATFORM_DB_NAME" "
    INSERT OR IGNORE INTO users (id, email, name, password_hash, email_verified, created_at, updated_at)
    VALUES ('user_dev_001', 'demo@insighthunter.app', 'Demo Owner', 'HASHED_IN_PROD', 1, datetime('now'), datetime('now'));

    INSERT OR IGNORE INTO organizations (id, name, slug, plan, status, owner_user_id, created_at, updated_at)
    VALUES ('org_dev_001', 'Demo Business LLC', 'demo-business', 'growth', 'active', 'user_dev_001', datetime('now'), datetime('now'));

    INSERT OR IGNORE INTO org_members (id, org_id, user_id, role, status, joined_at, created_at, updated_at)
    VALUES ('mem_dev_001', 'org_dev_001', 'user_dev_001', 'owner', 'active', datetime('now'), datetime('now'), datetime('now'));

    INSERT OR IGNORE INTO org_health_metrics (org_id, metric_key, metric_value, raw_value, recorded_at)
    VALUES
      ('org_dev_001', 'cash_position',           82, 125000, datetime('now')),
      ('org_dev_001', 'revenue_growth',           75,   12.4, datetime('now')),
      ('org_dev_001', 'debt_risk',                68,   0.32, datetime('now')),
      ('org_dev_001', 'payroll_burden',           71,   0.38, datetime('now')),
      ('org_dev_001', 'customer_concentration',   60,   0.42, datetime('now')),
      ('org_dev_001', 'compliance_status',        90,      1, datetime('now'));
  " "demo org + user + member + health metrics"
}

# ─── Verify Tables ────────────────────────────────────────────────────────────

verify_tables() {
  header "Verifying Tables"

  log "Tables in $MAIN_DB_NAME:"
  $WRANGLER d1 execute "$MAIN_DB_NAME" $REMOTE_FLAG \
    --command="SELECT name FROM sqlite_master WHERE type='table' ORDER BY name;" 2>&1 || true

  echo ""
  log "Tables in $PLATFORM_DB_NAME:"
  $WRANGLER d1 execute "$PLATFORM_DB_NAME" $REMOTE_FLAG \
    --command="SELECT name FROM sqlite_master WHERE type='table' ORDER BY name;" 2>&1 || true
}

# ─── Main ─────────────────────────────────────────────────────────────────────

main() {
  echo ""
  echo -e "${CYAN}╔══════════════════════════════════════════╗${NC}"
  echo -e "${CYAN}║   Insight Hunter — DB Migration Runner   ║${NC}"
  echo -e "${CYAN}║   Environment : ${ENV_LABEL}$(printf '%*s' $((25 - ${#ENV_LABEL})) '')║${NC}"
  echo -e "${CYAN}║   Started     : $TIMESTAMP  ║${NC}"
  echo -e "${CYAN}╚══════════════════════════════════════════╝${NC}"
  echo ""

  check_wrangler
  ensure_databases    # ← auto-creates + patches wrangler.jsonc if DB missing
  migrate_main
  migrate_platform
  seed_dev
  verify_tables

  header "Done"
  success "All migrations applied to $ENV_LABEL"
  echo ""
}

main
