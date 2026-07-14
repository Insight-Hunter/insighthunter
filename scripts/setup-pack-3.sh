#!/usr/bin/env bash
set -euo pipefail
ROOT_DIR="${1:-$(pwd)}"
cd "$ROOT_DIR"
if ! command -v pnpm >/dev/null 2>&1; then
  corepack enable
  corepack prepare pnpm@10 --activate
fi
pnpm install
find apps -maxdepth 2 -name wrangler.toml -print0 | while IFS= read -r -d '' file; do
  app_dir="$(dirname "$file")"
  echo "Generating Worker types in $app_dir"
  (cd "$app_dir" && pnpm exec wrangler types || true)
done
