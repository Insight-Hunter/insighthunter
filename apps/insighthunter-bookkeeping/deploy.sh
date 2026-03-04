#!/bin/bash

# Exit on errors
set -e

# Change to the script's directory to ensure relative paths work
cd "$(dirname "$0")"

echo "🚀 Deploying InsightHunter Bookkeeping App"

# 1. Build Frontend
echo "📦 Building frontend..."
npm run build

# 2. Deploy to Cloudflare
echo "☁️ Deploying to Cloudflare..."
export CLOUDFLARE_API_TOKEN="kAY9u88TaeuI9wByQkismZ2oGjBWqf5mVBhDTYNE"
npx wrangler deploy

# 3. Upload Static Assets (if any)
# Note: wrangler deploy should handle this if configured in wrangler.toml
# But if you have a separate assets folder, you might do this:
# npx wrangler pages deploy dist
echo "📤 Uploading static assets..."


echo "✅ Deployment complete!"
echo "🌐 Your app is live!"
