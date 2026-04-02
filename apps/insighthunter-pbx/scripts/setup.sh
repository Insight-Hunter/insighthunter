#!/usr/bin/env bash
# apps/insighthunter-pbx/scripts/setup.sh
# ─────────────────────────────────────────────────────────────────────────────
# One-time Cloudflare infrastructure provisioning for insighthunter-pbx.
# Run from the apps/insighthunter-pbx/ directory:
#   bash scripts/setup.sh
#
# What this does:
#   1. Creates D1 database
#   2. Creates R2 bucket
#   3. Creates KV namespace
#   4. Creates Queue
#   5. Patches wrangler.toml with the returned IDs automatically
#   6. Runs both SQL migration files
#   7. Prompts for secrets
#   8. Prompts to seed admin org ID
#   9. Deploys
# ─────────────────────────────────────────────────────────────────────────────
set -euo pipefail

# ── Colors ────────────────────────────────────────────────────────────────────
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'
CYAN='\033[0;36m'; BOLD='\033[1m'; RESET='\033[0m'

info()    { echo -e "${CYAN}==>${RESET} ${BOLD}$*${RESET}"; }
success() { echo -e "${GREEN}✓${RESET}  $*"; }
warn()    { echo -e "${YELLOW}⚠${RESET}  $*"; }
error()   { echo -e "${RED}✗${RESET}  $*" >&2; exit 1; }
ask()     { echo -e "${YELLOW}?${RESET}  $*"; }

# ── Guards ────────────────────────────────────────────────────────────────────
command -v wrangler >/dev/null 2>&1 || error "wrangler not found. Run: npm install -g wrangler"
command -v node     >/dev/null 2>&1 || error "node not found."

# Must be run from the package root (where wrangler.toml lives)
[[ -f "wrangler.toml" ]] || error "wrangler.toml not found. Run this script from apps/insighthunter-pbx/"

echo ""
echo -e "${BOLD}InsightHunter PBX — Cloudflare Setup${RESET}"
echo "────────────────────────────────────────"
echo ""

# ── Env selector ─────────────────────────────────────────────────────────────
ENV="${1:-}"
if [[ -z "$ENV" ]]; then
  ask "Which environment? [dev/staging/production] (default: dev)"
  read -r ENV
  ENV="${ENV:-dev}"
fi

if [[ "$ENV" != "dev" && "$ENV" != "staging" && "$ENV" != "production" ]]; then
  error "Invalid environment: $ENV. Choose dev, staging, or production."
fi

success "Environment: $ENV"
echo ""

# ── Suffix for resource names (avoid conflicts between envs) ─────────────────
SUFFIX=""
if [[ "$ENV" == "staging" ]];    then SUFFIX="-staging"; fi
if [[ "$ENV" == "production" ]]; then SUFFIX=""; fi
# dev uses local D1/KV by default, but we still create remote ones

# ── 1. D1 Database ────────────────────────────────────────────────────────────
##info "Creating D1 database: pbx-db${SUFFIX}"
#//D1_OUTPUT=$(wrangler d1 create "pbx-db${SUFFIX}" 2>&1) || {
 #// warn "D1 create failed (may already exist). Trying to fetch existing ID..."
 #// D1_OUTPUT=$(wrangler d1 list 2>&1)
#//}
#//D1_ID=$(echo "$D1_OUTPUT" | grep -oE 'database_id\s*=\s*"[a-f0-9-]+"' | head -1 | grep -oE '[a-f0-9-]{36}' || true)
#//if [[ -z "$D1_ID" ]]; then
 #/u D1_ID=$(echo "$D1_OUTPUT" | grep -oE '[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}' | head -1 || true)
#//fi
#//[[ -n "$D1_ID" ]] && success "D1 ID: $D1_ID" || warn "Could not auto-parse D1 ID — fill in wrangler.toml manually"

# ── 2. R2 Bucket ─────────────────────────────────────────────────────────────
#info "Creating R2 bucket: pbx-audio${SUFFIX}"
#wrangler r2 bucket create "pbx-audio${SUFFIX}" 2>&1 | grep -v "^$" || warn "R2 bucket may already exist"
#success "R2 bucket: pbx-audio${SUFFIX}"

# ── 3. KV Namespace ───────────────────────────────────────────────────────────
#info "Creating KV namespace: pbx-kv${SUFFIX}"
#KV_OUTPUT=$(wrangler kv namespace create "pbx-kv${SUFFIX}" 2>&1) || {
#warn "KV create failed (may already exist)"
 # KV_OUTPUT=""

#KV_ID=$(echo "$KV_OUTPUT" | grep -oE '"id":\s*"[a-f0-9]+"' | grep -oE '[a-f0-9]{32}' | head -1 || true)
#if [[ -z "$KV_ID" ]]; then
  #KV_ID=$(echo "$KV_OUTPUT" | grep -oE 'id = "[a-f0-9]+"' | grep -oE '[a-f0-9]{32}' | head -1 || true)
#fi
#[[ -n "$KV_ID" ]] && success "KV ID: $KV_ID" || warn "Could not auto-parse KV ID — fill in wrangler.toml manually"

# ── 4. Queue ──────────────────────────────────────────────────────────────────
QUEUE_NAME="pbx-vm-transcription"
[[ "$ENV" == "staging" ]] && QUEUE_NAME="pbx-vm-transcription-staging"
info "Creating Queue: $QUEUE_NAME"
wrangler queues create "$QUEUE_NAME" 2>&1 | grep -v "^$" || warn "Queue may already exist"
success "Queue: $QUEUE_NAME"

# ── 5. Patch wrangler.toml ────────────────────────────────────────────────────


# ── 6. Run DB migrations ──────────────────────────────────────────────────────
echo ""
info "Running D1 migrations..."

DB_FLAG="--remote"
[[ "$ENV" == "dev" ]] && DB_FLAG="--local"

wrangler d1 execute "pbx-db${SUFFIX}" \
  --file db/schema.sql $DB_FLAG
success "schema.sql applied"

wrangler d1 execute "pbx-db${SUFFIX}" \
  --file db/schema-whitelabel.sql $DB_FLAG
success "schema-whitelabel.sql applied"

# ── 7. Secrets ────────────────────────────────────────────────────────────────
echo ""
info "Setting secrets..."
echo ""

SECRETS=(
  "TELNYX_API_KEY:KEY019D4DC6B03F137F389C6B90D611FAD2_ZYdG5dQkomjuwyLGECNT0r" 
  "TELNYX_WEBHOOK_SECRET:Id11JlUZhA2SYNQDO5/qjS2l7MnkFHQ+lQXukCzEkD0="
  "STRIPE_SECRET_KEY:Stripe secret key (sk_live_... or sk_test_...)"
  "STRIPE_WEBHOOK_SECRET:Stripe webhook signing secret (whsec_...)"
  "STRIPE_PK:Stripe publishable key (pk_live_... or pk_test_...)"
  "JWT_SECRET:Random secret shared with your auth worker (min 32 chars)"
)

ENV_FLAG=""
[[ "$ENV" == "staging" ]]    && ENV_FLAG="--env staging"
[[ "$ENV" == "production" ]] && ENV_FLAG="--env production"

for entry in "${SECRETS[@]}"; do
  NAME="${entry%%:*}"
  DESC="${entry##*:}"
  ask "Enter $NAME ($DESC):"
  read -rs VALUE
  echo ""
  if [[ -n "$VALUE" ]]; then
    # shellcheck disable=SC2086
    echo "$VALUE" | wrangler secret put "$NAME" $ENV_FLAG
    success "$NAME set"
  else
    warn "$NAME skipped (empty) — set it later: wrangler secret put $NAME $ENV_FLAG"
  fi
done

# ── 8. Seed admin org ─────────────────────────────────────────────────────────
echo ""
info "Seeding admin org..."
ask "Enter your admin org ID (or press Enter to skip):"
read -r ADMIN_ORG_ID

if [[ -n "$ADMIN_ORG_ID" ]]; then
  wrangler d1 execute "pbx-db${SUFFIX}" \
    --command "INSERT OR IGNORE INTO admins (org_id) VALUES ('${ADMIN_ORG_ID}');" \
    $DB_FLAG
  success "Admin org '${ADMIN_ORG_ID}' seeded"
else
  warn "Skipped — seed later:"
  echo "  wrangler d1 execute pbx-db${SUFFIX} --command \"INSERT OR IGNORE INTO admins (org_id) VALUES ('YOUR_ORG_ID');\" --remote"
fi

# ── 9. Stripe price ID reminder ───────────────────────────────────────────────
echo ""
warn "Remember to populate Stripe price IDs in the plans table after creating"
warn "your products + prices in the Stripe dashboard:"
echo ""
echo "  wrangler d1 execute pbx-db${SUFFIX} --remote --command \\"
echo "    \"UPDATE plans SET"
echo "       stripe_price_id_platform='price_XXX',"
echo "       stripe_price_id_minutes='price_YYY',"
echo "       stripe_price_id_numbers='price_ZZZ'"
echo "     WHERE plan_id='starter';\""
echo ""
echo "  Repeat for 'professional' and 'enterprise' plans."

# ── 10. Deploy ────────────────────────────────────────────────────────────────
echo ""
ask "Deploy now? [y/N]"
read -r DEPLOY_NOW

if [[ "$DEPLOY_NOW" =~ ^[Yy]$ ]]; then
  info "Deploying to $ENV..."
  if [[ "$ENV" == "dev" ]]; then
    wrangler deploy
  else
    wrangler deploy --env "$ENV"
  fi
  success "Deployed!"
else
  warn "Skipped deploy. Run when ready:"
  if [[ "$ENV" == "dev" ]]; then
    echo "  npm run deploy"
  else
    echo "  npm run deploy:${ENV}"
  fi
fi

# ── Done ──────────────────────────────────────────────────────────────────────
echo ""
echo -e "${GREEN}${BOLD}✅  Setup complete for environment: ${ENV}${RESET}"
echo ""
echo "Next steps:"
echo "  1. Verify wrangler.toml IDs are correct"
echo "  2. Set Stripe price IDs in the plans table (see above)"
echo "  3. Point Telnyx webhook URL to: https://pbx-api.insighthunter.app/webhook/telnyx"
echo "  4. Run: wrangler dev (local) or npm run deploy:production"
echo ""

