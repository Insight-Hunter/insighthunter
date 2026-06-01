#!/bin/bash
set -e

if [ -f .env ]; then
  echo "Loading environment variables from .env"
  export $(grep -v '^[[:space:]]*#' .env | grep -E '^[a-zA-Z_][a-zA-Z0-9_]*=' | xargs)
fi

echo "Installing dependencies..."
npx pnpm install --recursive

# Build the main application
echo "Building main application..."
(cd apps/insighthunter-main && npx pnpm build)

echo "Preparing Pages deployment assets..."
cat > apps/insighthunter-main/dist/.assetsignore <<'EOF'
_worker.js
EOF

echo "Deploying insighthunter (main frontend)..."
npx wrangler pages deploy apps/insighthunter-main/dist --project-name=insighthunter-main

echo "Deploying workers..."
for app_dir in apps/*; do
  if [ -d "$app_dir" ]; then
    app_name=$(basename "$app_dir")
    if [ "$app_name" != "insighthunter-main" ] && [ -f "$app_dir/wrangler.toml" ]; then
      echo "Deploying $app_name worker..."
      npx wrangler deploy --config "$app_dir/wrangler.toml"
    fi
  fi
done

echo "All applications deployed successfully!"
