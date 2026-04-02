#!/bin/bash
set -e

echo "═══════════════════════════════════════════════"
echo "  InsightHunter — Production Deploy"
echo "═══════════════════════════════════════════════"

echo ""
echo "▶ Installing dependencies..."
npm install

echo ""
echo "▶ Running D1 migrations..."
bash scripts/migrate.sh

echo ""
echo "▶ [1/7] Deploying insighthunter-auth..."
cd apps/insighthunter-auth && npx wrangler deploy && cd ../..

echo ""
echo "▶ [2/7] Deploying insighthunter-bookkeeping..."
cd apps/insighthunter-bookkeeping && npx wrangler deploy && cd ../..

echo ""
echo "▶ [3/7] Deploying insighthunter-bizforma..."
cd apps/insighthunter-bizforma && npx wrangler deploy && cd ../..

echo ""
echo "▶ [4/7] Deploying insighthunter-pbx..."
cd apps/insighthunter-pbx && npx wrangler deploy && cd ../..

echo ""
echo "▶ [5/7] Deploying insighthunter-payroll..."
cd apps/insighthunter-payroll && npx wrangler deploy && cd ../..

echo ""
echo "▶ [6/7] Deploying insighthunter-ai..."
cd apps/insighthunter-ai && npx wrangler deploy && cd ../..

echo ""
echo "▶ [7/7] Deploying insighthunter-dispatch (must be last)..."
cd apps/insighthunter-dispatch && npx wrangler deploy && cd ../..

echo ""
echo "▶ Building and deploying insighthunter-main (Pages)..."
cd apps/insighthunter-main
npm run build
npx wrangler pages deploy dist --project-name=insighthunter-main
cd ../..

echo ""
echo "═══════════════════════════════════════════════"
echo "  ✅ Deploy complete!"
echo "═══════════════════════════════════════════════"
