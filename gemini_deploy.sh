#!/bin/bash
set -e
echo "Deploying applications..."
echo "1 of 7: Deploying insighthunter-auth..."
(cd apps/insighthunter-auth && npx wrangler deploy)
echo "2 of 7: Deploying insighthunter-bookkeeping..."
(cd apps/insighthunter-bookkeeping && npx wrangler deploy)
echo "3 of 7: Deploying insighthunter-bizforma..."
(cd apps/insighthunter-bizforma && npx wrangler deploy)
echo "4 of 7: Skipping insighthunter-pbx (does not exist)..."
echo "5 of 7: Deploying insighthunter-payroll..."
(cd apps/insighthunter-payroll && npx wrangler deploy)
echo "6 of 7: Deploying insighthunter-insights..."
(cd apps/insighthunter-insights && npx wrangler deploy)
echo "7 of 7: Deploying insighthunter-dispatch (must come after all others)..."
(cd apps/insighthunter-dispatch && npx wrangler deploy)
echo "Building and deploying insighthunter-main..."
(cd apps/insighthunter-main && npm install && npm run build && npx wrangler pages deploy dist --project-name ih-main)
echo "All applications deployed successfully."