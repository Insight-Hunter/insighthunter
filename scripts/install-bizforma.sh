#!/usr/bin/env bash
# scripts/install-bizforma.sh
# ─────────────────────────────────────────────────────────────
# Fully installs apps/insighthunter-bizforma:
#   1. Resolve wrangler
#   2. Install npm dependencies
#   3. Create D1 database
#   4. Create R2 buckets (prod + preview)
#   5. Create KV namespaces (prod + preview)
#   6. Create Queues + DLQs
#   7. Run migrations
#   8. Patch wrangler.jsonc with all real IDs
#   9. Deploy Worker
# ─────────────────────────────────────────────────────────────

set -euo pipefail

# ─── Config ──────────────────────────────────────────────────────────────────

APP_DIR="apps/insighthunter-bizforma"
WRANGLER_CONFIG="$APP_DIR/wrangler.jsonc"

D1_DB_NAME="insighthunter-bizforma"
R2_BUCKET="insighthunter-bizforma-documents"
R2_BUCKET_PREVIEW="insighthunter-bizforma-documents-preview"
KV_NAMESPACE="insighthunter-bizforma-cache"
QUEUE_PDF="insighthunter-bizforma-pdf"
QUEUE_PDF_DLQ="insighthunter-bizforma-pdf-dlq"
QUEUE_REMINDERS="insighthunter-bizforma-reminders"
QUEUE_REMINDERS_DLQ="insighthunter-bizforma-reminders-dlq"

REMOTE_FLAG=""
SKIP_DEPLOY=false

# Colors
GREEN='\033[0;32m'; YELLOW='\033[1;33m'; RED='\033[0;31m'
BLUE='\033[0;34m';  CYAN='\033[0;36m';   NC='\033[0m'

# ─── Args ────────────────────────────────────────────────────────────────────

for arg in "$@"; do
  case $arg in
    --remote)       REMOTE_FLAG="--remote" ;;
    --skip-deploy)  SKIP_DEPLOY=true ;;
    --help|-h)
      echo "Usage: ./scripts/install-bizforma.sh [--remote] [--skip-deploy]"
      echo "  --remote       Provision against Cloudflare production account"
      echo "  --skip-deploy  Provision resources only, don't wrangler deploy"
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
header()  { echo -e "\n${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
            echo -e "${CYAN}  $*${NC}"
            echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"; }

# ─── Wrangler Resolution ─────────────────────────────────────────────────────

WRANGLER=""

resolve_wrangler() {
  if command -v wrangler &>/dev/null; then
    echo "wrangler"; return 0
  fi
  if [[ -f "./node_modules/.bin/wrangler" ]]; then
    echo "./node_modules/.bin/wrangler"; return 0
  fi
  if npx wrangler --version &>/dev/null 2>&1; then
    echo "npx wrangler"; return 0
  fi
  return 1
}

check_wrangler() {
  log "Resolving wrangler..."
  WRANGLER=$(resolve_wrangler || true)
  if [[ -z "$WRANGLER" ]]; then
    warn "wrangler not found — installing..."
    npm install -g wrangler
    WRANGLER="wrangler"
  fi
  local ver
  ver=$($WRANGLER --version 2>&1 | head -1)
  success "wrangler: $WRANGLER ($ver)"
}

# ─── wrangler.jsonc Patcher ───────────────────────────────────────────────────

patch_config() {
  local key="$1"
  local value="$2"
  if [[ -f "$WRANGLER_CONFIG" ]]; then
    sed -i '' "s|$key|$value|g" "$WRANGLER_CONFIG"
    log "Patched $key → $value"
  fi
}

extract_uuid() {
  echo "$1" | grep -oE '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}' | head -1
}

# ─── Step 1: npm install ──────────────────────────────────────────────────────

install_deps() {
  header "Installing Dependencies"
  if [[ -f "package.json" ]] && command -v pnpm &>/dev/null; then
    log "Running pnpm install (workspace root)..."
    pnpm install
    success "pnpm install complete"
  elif [[ -f "package.json" ]]; then
    log "Running npm install..."
    npm install
    success "npm install complete"
  else
    warn "No package.json at root — skipping"
  fi
}

# ─── Step 2: D1 Database ─────────────────────────────────────────────────────

setup_d1() {
  header "D1 Database: $D1_DB_NAME"

  local output db_id

  # Check if already exists
  if $WRANGLER d1 info "$D1_DB_NAME" $REMOTE_FLAG &>/dev/null; then
    success "$D1_DB_NAME — already exists"
    db_id=$($WRANGLER d1 info "$D1_DB_NAME" $REMOTE_FLAG 2>&1 | grep -oE '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}' | head -1)
  else
    log "Creating D1 database..."
    output=$($WRANGLER d1 create "$D1_DB_NAME" 2>&1)
    echo "$output"
    db_id=$(extract_uuid "$output")
    success "Created $D1_DB_NAME"
  fi

  if [[ -n "$db_id" ]]; then
    patch_config "REPLACE_WITH_D1_DATABASE_ID" "$db_id"
    success "D1 ID patched: $db_id"
  else
    warn "Could not extract D1 ID — manually set database_id in $WRANGLER_CONFIG"
  fi
}

# ─── Step 3: R2 Buckets ───────────────────────────────────────────────────────

setup_r2() {
  header "R2 Buckets"

  # Production bucket
  if $WRANGLER r2 bucket list 2>&1 | grep -q "$R2_BUCKET"; then
    success "$R2_BUCKET — already exists"
  else
    log "Creating R2 bucket: $R2_BUCKET"
    $WRANGLER r2 bucket create "$R2_BUCKET" $REMOTE_FLAG 2>&1
    success "Created $R2_BUCKET"
  fi

  # Preview bucket (local dev / preview environments)
  if $WRANGLER r2 bucket list 2>&1 | grep -q "$R2_BUCKET_PREVIEW"; then
    success "$R2_BUCKET_PREVIEW — already exists"
  else
    log "Creating R2 preview bucket: $R2_BUCKET_PREVIEW"
    $WRANGLER r2 bucket create "$R2_BUCKET_PREVIEW" 2>&1
    success "Created $R2_BUCKET_PREVIEW"
  fi

  # Enable CORS on production bucket for browser uploads
  log "Setting R2 CORS policy..."
  $WRANGLER r2 bucket cors put "$R2_BUCKET" \
    --rules '[{"allowedOrigins":["https://bizforma.insighthunter.app"],"allowedMethods":["GET","PUT","POST","DELETE"],"allowedHeaders":["*"],"maxAgeSeconds":3600}]' \
    $REMOTE_FLAG 2>&1 || warn "CORS set failed — set manually in Cloudflare dashboard"
  success "R2 buckets ready"
}

# ─── Step 4: KV Namespaces ────────────────────────────────────────────────────

setup_kv() {
  header "KV Namespace: $KV_NAMESPACE"

  local output kv_id kv_preview_id

  # Production KV
  if $WRANGLER kv namespace list 2>&1 | grep -q "$KV_NAMESPACE\""; then
    success "$KV_NAMESPACE — already exists"
    kv_id=$($WRANGLER kv namespace list 2>&1 | \
      grep -A2 "\"$KV_NAMESPACE\"" | grep -oE '"id": "[^"]+"' | head -1 | grep -oE '"[^"]+$' | tr -d '"')
  else
    log "Creating KV namespace (prod)..."
    output=$($WRANGLER kv namespace create "$KV_NAMESPACE" 2>&1)
    echo "$output"
    kv_id=$(extract_uuid "$output")
    success "Created KV prod namespace"
  fi

  # Preview KV
  local preview_name="${KV_NAMESPACE}-preview"
  if $WRANGLER kv namespace list 2>&1 | grep -q "$preview_name\""; then
    success "$preview_name — already exists"
    kv_preview_id=$($WRANGLER kv namespace list 2>&1 | \
      grep -A2 "\"$preview_name\"" | grep -oE '"id": "[^"]+"' | head -1 | grep -oE '"[^"]+$' | tr -d '"')
  else
    log "Creating KV namespace (preview)..."
    output=$($WRANGLER kv namespace create "$preview_name" 2>&1)
    echo "$output"
    kv_preview_id=$(extract_uuid "$output")
    success "Created KV preview namespace"
  fi

  [[ -n "$kv_id" ]]         && patch_config "REPLACE_WITH_KV_NAMESPACE_ID" "$kv_id"
  [[ -n "$kv_preview_id" ]] && patch_config "REPLACE_WITH_KV_PREVIEW_ID"   "$kv_preview_id"
  success "KV namespaces patched"
}

# ─── Step 5: Queues ───────────────────────────────────────────────────────────

create_queue_if_missing() {
  local name="$1"
  if $WRANGLER queues list 2>&1 | grep -q "\"$name\""; then
    success "$name — already exists"
  else
    log "Creating queue: $name"
    $WRANGLER queues create "$name" $REMOTE_FLAG 2>&1
    success "Created queue: $name"
  fi
}

setup_queues() {
  header "Queues"
  create_queue_if_missing "$QUEUE_PDF"
  create_queue_if_missing "$QUEUE_PDF_DLQ"
  create_queue_if_missing "$QUEUE_REMINDERS"
  create_queue_if_missing "$QUEUE_REMINDERS_DLQ"
  success "All queues ready"
}

# ─── Step 6: D1 Migrations ────────────────────────────────────────────────────

run_migrations() {
  header "D1 Migrations"

  # Check packages/database/migrations (referenced in wrangler.jsonc)
  local pkg_migrations="packages/database/migrations"
  local app_migrations="$APP_DIR/migrations"

  if [[ -d "$pkg_migrations" ]]; then
    log "Running migrations from $pkg_migrations..."
    for f in $(find "$pkg_migrations" -name "*.sql" | sort -V); do
      log "Applying $(basename "$f")..."
      $WRANGLER d1 execute "$D1_DB_NAME" $REMOTE_FLAG --file="$f" 2>&1
      success "$(basename "$f")"
    done
  else
    warn "No migrations at $pkg_migrations — skipping package migrations"
  fi

  if [[ -d "$app_migrations" ]]; then
    log "Running migrations from $app_migrations..."
    for f in $(find "$app_migrations" -name "*.sql" | sort -V); do
      log "Applying $(basename "$f")..."
      $WRANGLER d1 execute "$D1_DB_NAME" $REMOTE_FLAG --file="$f" 2>&1
      success "$(basename "$f")"
    done
  else
    warn "No migrations at $app_migrations — skipping app migrations"
  fi

  # Verify tables created
  log "Tables in $D1_DB_NAME:"
  $WRANGLER d1 execute "$D1_DB_NAME" $REMOTE_FLAG \
    --command="SELECT name FROM sqlite_master WHERE type='table' ORDER BY name;" 2>&1 || true

  success "Migrations complete"
}

# ─── Step 7: Secrets ─────────────────────────────────────────────────────────

check_secrets() {
  header "Secrets"

  warn "The following secrets must be set manually:"
  echo ""
  echo "  cd $APP_DIR"
  echo ""
  echo "  $WRANGLER secret put JWT_SECRET"
  echo "  $WRANGLER secret put STRIPE_SECRET_KEY"
  echo "  $WRANGLER secret put STRIPE_WEBHOOK_SECRET"
  echo "  $WRANGLER secret put SENDGRID_API_KEY        # or RESEND_API_KEY"
  echo "  $WRANGLER secret put OPENAI_API_KEY           # if not using Workers AI"
  echo ""

  read -r -p "Press ENTER once secrets are set (or CTRL+C to set them now)..."
}

# ─── Step 8: Deploy ───────────────────────────────────────────────────────────

deploy_worker() {
  if [[ "$SKIP_DEPLOY" == true ]]; then
    warn "Skipping deploy (--skip-deploy flag set)"
    return 0
  fi

  header "Deploying Worker"
  cd "$APP_DIR"
  log "Running wrangler deploy..."
  $WRANGLER deploy $REMOTE_FLAG 2>&1
  success "insighthunter-bizforma deployed"
  cd - > /dev/null
}

# ─── Step 9: Summary ─────────────────────────────────────────────────────────

print_summary() {
  header "Install Complete"

  echo -e "${GREEN}"
  echo "  App:       insighthunter-bizforma"
  echo "  Env:       $ENV_LABEL"
  echo "  Config:    $WRANGLER_CONFIG"
  echo ""
  echo "  Resources provisioned:"
  echo "    D1      → $D1_DB_NAME"
  echo "    R2      → $R2_BUCKET"
  echo "    R2      → $R2_BUCKET_PREVIEW"
  echo "    KV      → $KV_NAMESPACE"
  echo "    Queue   → $QUEUE_PDF"
  echo "    Queue   → $QUEUE_PDF_DLQ"
  echo "    Queue   → $QUEUE_REMINDERS"
  echo "    Queue   → $QUEUE_REMINDERS_DLQ"
  echo "    AI      → Workers AI (bound via wrangler.jsonc)"
  echo "    DO      → FormationAgent (Durable Object)"
  echo "    Crons   → 0 9 * * * | 0 0 * * *"
  echo ""
  echo "  URL: https://bizforma.insighthunter.app"
  echo -e "${NC}"
}

# ─── Main ─────────────────────────────────────────────────────────────────────

main() {
  echo ""
  echo -e "${CYAN}╔══════════════════════════════════════════╗${NC}"
  echo -e "${CYAN}║    BizForma — Full Install Script        ║${NC}"
  echo -e "${CYAN}║    Environment : ${ENV_LABEL}$(printf '%*s' $((24 - ${#ENV_LABEL})) '')║${NC}"
  echo -e "${CYAN}╚══════════════════════════════════════════╝${NC}"
  echo ""

  # Must run from repo root
  if [[ ! -d "$APP_DIR" ]]; then
    error "Run this script from the repo root. Could not find: $APP_DIR"
  fi

  check_wrangler
  install_deps
  setup_d1
  setup_r2
  setup_kv
  setup_queues
  run_migrations
  check_secrets
  deploy_worker
  print_summary
}

main
