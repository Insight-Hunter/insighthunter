#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────
# InsightHunter Migration Apply Script
# Run this inside your local clone of Insight-Hunter/insighthunter
# ─────────────────────────────────────────────────────────────
set -e

BUNDLE="insighthunter-migration.bundle"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
BUNDLE_PATH="$SCRIPT_DIR/$BUNDLE"

# Confirm we're in the right repo
if [ ! -f "astro.config.mjs" ] || [ ! -d "apps/insighthunter-main" ]; then
  echo "❌  Run this script from the root of the insighthunter repo."
  exit 1
fi

echo "✅  Repo detected."

# Check bundle exists
if [ ! -f "$BUNDLE_PATH" ]; then
  echo "❌  Bundle not found at: $BUNDLE_PATH"
  echo "    Place insighthunter-migration.bundle in the same directory as this script."
  exit 1
fi

echo "📦  Fetching bundle..."
git fetch "$BUNDLE_PATH" HEAD:refs/bundles/migration

echo "🔍  Commits in bundle:"
git log --oneline HEAD..refs/bundles/migration

echo ""
read -p "Merge these commits? (y/N) " confirm
[[ "$confirm" =~ ^[Yy]$ ]] || { echo "Aborted."; exit 0; }

git merge --ff-only refs/bundles/migration
echo ""
echo "✅  Migration applied locally."
echo ""
echo "Push to GitHub with:"
echo "  git push origin main"
