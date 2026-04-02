#!/usr/bin/env bash
# bootstrap.sh — Run ONCE to create all Cloudflare resources
# Usage: bash bootstrap.sh
# Requires: wrangler login first

set -e
echo "=== Insight Hunter Bootstrap ==="

# ── D1 Databases ──────────────────────────────────────────────
echo "\n[1/6] Creating D1 databases..."
wrangler d1 create insighthunter-main
wrangler d1 create insighthunter-preview

# ── KV v  Namespaces ─────────────────────────────────────────────
echo "\n[2/6] Creating KV namespaces..."
wrangler kv namespace create SESSIONS
wrangler kv namespace create SESSIONS --preview
wrangler kv namespace create CONFIG
wrangler kv namespace create CONFIG   --preview

# ── R2 Buckets ────────────────────────────────────────────────
echo "\n[3/6] Creating R2 buckets..."
wrangler r2 bucket create insighthunter-documents
wrangler r2 bucket create insighthunter-exports
wrangler r2 bucket create insighthunter-voicemails

# ── Queues ────────────────────────────────────────────────────
echo "\n[4/6] Creating Queues..."
wrangler queues create insighthunter-email
wrangler queues create insighthunter-payroll
wrangler queues create insighthunter-exports
wrangler queues create insighthunter-transcription

# ── Vectorize ─────────────────────────────────────────────────
echo "\n[5/6] Creating Vectorize index..."
wrangler vectorize create insighthunter-insights \
  --dimensions=1024 --metric=cosine

# ── Cloudflare Pages Projects ─────────────────────────────────
echo "\n[6/6] Creating Pages projects..."
wrangler pages project create insighthunter-main      --production-branch=main
wrangler pages project create insighthunter-bizforma  --production-branch=main
wrangler pages project create insighthunter-pbx       --production-branch=main

echo "\n✅ All resources created!"
echo "\n📋 NEXT STEPS:"
echo "   1. Copy the IDs printed above into each apps/*/wrangler.jsonc"
echo "   2. Run: wrangler secret put JWT_SECRET --name insighthunter-api"
echo "   3. Run: wrangler secret put JWT_SECRET --name insighthunter-ai"
echo "   4. Run: wrangler secret put JWT_SECRET --name insighthunter-pbx"
echo "   5. Ru5n D1 migrations: cd apps/insighthunter-api && wrangler d1 migrations apply insighthunter-main"
echo "   6. Add CF_API_TOKEN to GitHub Secrets"
echo "   7. Push to main → GitHub Actions deploys everything"
in 