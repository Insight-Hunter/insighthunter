#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# InsightHunter — Full Build + Auth Wiring Fix Bundle
# Covers both commits:
#   1. fix(build): resolve all Cloudflare Pages build blockers
#   2. fix(arch):  types & auth under workers/insighthunter-auth; wire frontend → backend
#
# Usage:
#   1. Place insighthunter-auth-wiring.bundle + this script in your repo root
#   2. chmod +x apply-build-fix.sh && ./apply-build-fix.sh
#   3. git push origin fix/build-ready  →  open PR → merge to main
# ─────────────────────────────────────────────────────────────────────────────
set -e

BUNDLE="insighthunter-auth-wiring.bundle"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
BUNDLE_PATH="$SCRIPT_DIR/$BUNDLE"

if [ ! -f "astro.config.mjs" ] || [ ! -d "apps/insighthunter-main" ]; then
  echo "❌  Run this script from the root of the insighthunter repo."
  exit 1
fi
echo "✅  Repo root confirmed."

if [ ! -f "$BUNDLE_PATH" ]; then
  echo "❌  Bundle not found: $BUNDLE_PATH"
  exit 1
fi

echo "🔄  Fetching latest origin/main..."
git fetch origin

echo "🔍  Verifying bundle..."
git bundle verify "$BUNDLE_PATH"

echo "🌿  Creating branch fix/build-ready from origin/main..."
git checkout -B fix/build-ready origin/main

echo "📦  Applying bundle (2 commits)..."
git fetch "$BUNDLE_PATH" HEAD:refs/bundles/auth-wiring
echo ""
git log --oneline HEAD..refs/bundles/auth-wiring

echo ""
read -p "Apply these 2 commits to fix/build-ready? (y/N) " confirm
[[ "$confirm" =~ ^[Yy]$ ]] || { echo "Aborted."; exit 0; }

git merge --ff-only refs/bundles/auth-wiring

echo ""
echo "✅  Done!"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo " NEXT STEPS"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "1. Install deps:"
echo "   pnpm install"
echo ""
echo "2. Set secrets (before deploy):"
echo "   wrangler secret put JWT_SECRET --name insighthunter-auth"
echo "   wrangler secret put JWT_SECRET --name insighthunter-main"
echo ""
echo "3. Update wrangler.toml placeholders:"
echo "   apps/insighthunter-main/wrangler.toml:"
echo "     <YOUR_D1_ID>  → your D1 database ID"
echo "     <YOUR_KV_ID>  → your KV namespace ID"
echo ""
echo "4. Deploy auth worker FIRST (main app has service binding to it):"
echo "   cd workers/insighthunter-auth && wrangler deploy"
echo ""
echo "5. Push & deploy main app:"
echo "   git push origin fix/build-ready"
echo "   # Open PR → merge to main"
echo "   # Cloudflare Pages will auto-build"
echo ""
echo "6. Cloudflare Pages build settings:"
echo "   Root directory:   apps/insighthunter-main"
echo "   Build command:    npm run build"
echo "   Build output dir: dist"
echo "   Node version:     20"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
