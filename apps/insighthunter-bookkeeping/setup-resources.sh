#!/bin/bash
set -e

echo "🚀 Setting up InsightHunter Bookkeeping..."

if ! command -v wrangler &> /dev/null; then
    npm install -g wrangler
fi

wrangler login

echo "Creating KV namespaces..."
wrangler kv:namespace create "AUTH_TOKENS" --preview false
wrangler kv:namespace create "AUTH_TOKENS" --preview
wrangler kv:namespace create "USER_SESSIONS" --preview false
wrangler kv:namespace create "USER_SESSIONS" --preview

echo "Creating R2 buckets..."
wrangler r2 bucket create insighthunter-uploads 2>/dev/null || true
wrangler r2 bucket create insighthunter-uploads-preview 2>/dev/null || true
wrangler r2 bucket create insighthunter-uploads-dev 2>/dev/null || true
wrangler r2 bucket create insighthunter-uploads-staging 2>/dev/null || true
wrangler r2 bucket create insighthunter-uploads-prod 2>/dev/null || true

echo ""
echo "✅ Setup complete!"
echo "Update wrangler.toml with the KV namespace IDs above"
