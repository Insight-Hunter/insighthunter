#!/bin/bash
# deploy.sh

echo "🚀 Deploying InsightHunter Bookkeeping App"

# Build frontend
echo "📦 Building frontend..."
npm run build

# Deploy Cloudflare Worker
echo "☁️ Deploying to Cloudflare..."
npx wrangler deploy

# Upload static assets (if using Workers Static Assets)
echo "📤 Uploading static assets..."
# wrangler pages deploy dist

echo "✅ Deployment complete!"
echo "🌐 Your app is live!"
