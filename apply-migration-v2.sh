#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# InsightHunter Migration Apply Script (v2 — rebased on main @ 10a65f6)
# 1. Place BOTH files in the root of your insighthunter repo:
#      insighthunter-migration-v2.bundle
#      apply-migration-v2.sh
# 2. Run:  chmod +x apply-migration-v2.sh && ./apply-migration-v2.sh
# 3. Push: git push origin migration-branch   (then open a PR)
#    OR:   git push origin migration-branch:main   (direct to main)
# ─────────────────────────────────────────────────────────────────────────────
set -e

BUNDLE="insighthunter-migration-v2.bundle"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
BUNDLE_PATH="$SCRIPT_DIR/$BUNDLE"

# Confirm repo root
if [ ! -f "astro.config.mjs" ] || [ ! -d "apps/insighthunter-main" ]; then
  echo "❌  Run this script from the root of the insighthunter repo."
  exit 1
fi
echo "✅  Repo root confirmed."

# Check bundle
if [ ! -f "$BUNDLE_PATH" ]; then
  echo "❌  Bundle not found: $BUNDLE_PATH"
  echo "    Make sure insighthunter-migration-v2.bundle is next to this script."
  exit 1
fi

# Make sure we're up to date
echo "🔄  Fetching latest origin/main..."
git fetch origin

# Verify bundle against local repo
echo "🔍  Verifying bundle..."
git bundle verify "$BUNDLE_PATH"

# Create migration branch from current main
echo "🌿  Creating branch migration-branch from origin/main..."
git checkout -B migration-branch origin/main

# Apply the bundle
echo "📦  Fetching bundle commits..."
git fetch "$BUNDLE_PATH" HEAD:refs/bundles/migration-v2

echo ""
echo "📝  Commits to be applied:"
git log --oneline HEAD..refs/bundles/migration-v2

echo ""
read -p "Apply these commits to migration-branch? (y/N) " confirm
[[ "$confirm" =~ ^[Yy]$ ]] || { echo "Aborted."; exit 0; }

git merge --ff-only refs/bundles/migration-v2

echo ""
echo "✅  Migration applied to migration-branch."
echo ""
echo "Next steps:"
echo "  Option A — Push as a PR (recommended):"
echo "    git push origin migration-branch"
echo "    Then open a PR on GitHub."
echo ""
echo "  Option B — Push directly to main:"
echo "    git push origin migration-branch:main"
