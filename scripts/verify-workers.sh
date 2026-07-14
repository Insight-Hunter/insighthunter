#!/usr/bin/env bash
set -euo pipefail
for app in apps/*; do
  if [ -f "$app/wrangler.toml" ]; then
    echo "verifying $(basename "$app")"
    (cd "$app" && pnpm run cf:types && pnpm run typecheck)
  fi
done
