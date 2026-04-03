#!/bin/bash
set -e
# Run once after provisioning to set the shared JWT_SECRET on all workers.
CLOUDFLARE_API_TOKEN="
JWT_SECRET="5afde2d9ba897193d88ba038ed3edd03870ccae6338077cec5c50e333c9de777)"
echo "Generated JWT_SECRET. Applying to all workers..."

for app in insighthunter-auth insighthunter-dispatch insighthunter-bookkeeping insighthunter-bizforma insighthunter-pbx insighthunter-payroll insighthunter-ai; do
  echo "  Setting on $app..."
  cd apps/$app
  echo "$JWT_SECRET" | npx wrangler secret put JWT_SECRET
  cd ../..
done

echo ""
echo "Setting on insighthunter-main (Pages)..."
cd apps/insighthunter-main
echo "$JWT_SECRET" | npx wrangler pages secret put JWT_SECRET
cd ../..

echo ""
echo "✅ JWT_SECRET set on all workers."
echo ""
echo "Additional secrets to set manually:"
echo "  cd apps/insighthunter-pbx      && npx wrangler secret put TWILIO_AUTH_TOKEN"
echo "  cd apps/insighthunter-dispatch && npx wrangler secret put CF_API_TOKEN"
