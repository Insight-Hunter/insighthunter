#!/bin/bash
set -e

echo "═══════════════════════════════════════════════"
echo "  InsightHunter — One-Time Resource Provisioning"
echo "═══════════════════════════════════════════════"

echo ""
echo "▶ Creating D1 databases..."
npx wrangler d1 create insighthunter-auth
npx wrangler d1 create insighthunter-bookkeeping
npx wrangler d1 create insighthunter-bizforma
npx wrangler d1 create insighthunter-pbx
npx wrangler d1 create insighthunter-payroll
npx wrangler d1 create insighthunter-ai

echo ""
echo "▶ Creating KV namespaces..."
npx wrangler kv namespace create SESSIONS
npx wrangler kv namespace create REFRESH_TOKENS
npx wrangler kv namespace create REPORT_CACHE
npx wrangler kv namespace create BIZ_CACHE
npx wrangler kv namespace create CALL_STATE
npx wrangler kv namespace create PAYROLL_CACHE
npx wrangler kv namespace create USAGE
npx wrangler kv namespace create TENANT_CACHE

echo ""
echo "▶ Creating R2 buckets..."
npx wrangler r2 bucket create ih-receipts
npx wrangler r2 bucket create ih-bizforma-docs
npx wrangler r2 bucket create ih-voicemail
npx wrangler r2 bucket create ih-pay-stubs

echo ""
echo "▶ Creating Workers for Platforms dispatch namespace..."
npx wrangler dispatch-namespace create insighthunter-tenants

echo ""
echo "▶ Creating Vectorize index (384 dims, cosine)..."
npx wrangler vectorize create ih-financial-docs --dimensions=384 --metric=cosine

echo ""
echo "═══════════════════════════════════════════════"
echo "  ✅ Provisioning complete!"
echo ""
echo "  NEXT STEPS:"
echo "  1. Copy each resource ID from the output above"
echo "  2. Replace REPLACE_AFTER_PROVISION in all wrangler.jsonc files"
echo "  3. Set CF_ACCOUNT_ID in insighthunter-dispatch/wrangler.jsonc"
echo "  4. Run: bash scripts/secrets.sh"
echo "  5. Run: bash scripts/deploy.sh"
echo "═══════════════════════════════════════════════"
