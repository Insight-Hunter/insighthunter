#!/bin/bash

git add . 
git commit -m ":pre-deploy git"
git --commit-dirty=true
git push

export JWT_SECRET="5afde2d9ba897193d88ba038ed3edd03870ccae6338077cec5c50e333c9de777"
export CLOUDFLARE_ACCOUNT_ID="18c8e61a3669253dcfd0c7eec6be36a3"
export TURNSTILE_SECRET="0x4AAAAAACh0opVnevzeby3S65WWzoSwJOE"
export CLOUDFLARE_API_TOKEN="kAY9u88TaeuI9wByQkismZ2oGjBWqf5mVBhDTYNE"
##wrangler secret put TURNSTILE_SECRET="0x4AAAAAACh0opVnevzeby3S65WWzoSwJOE"
#wrangler secret put STRIPE_SECRET_KEY
#wrangler secret put STRIPE_WEBHOOK_SECRET  
##wrangler secret put JWT_SECRET="5afde2d9ba897193d88ba038ed3edd03870ccae6338077cec5c50e333c9de777"
#wrangler secret put STRIPE_PUBLISHABLE_KEY

# This script deploys all of the InsightHunter applications.

# Exit immediately if a command exits with a non-zero status.
set -e

# Deploy insighthunter-auth
echo "Deploying insighthunter-auth..."
npx wrangler deploy apps/insighthunter-auth/wrangler.toml

# Deploy insighthunter-bookkeeping
echo "Deploying insighthunter-bookkeeping..."
npx wrangler deploy apps/insighthunter-bookkeeping/wrangler.toml

# Deploy insighthunter-lite
echo "Deploying insighthunter-lite..."
npx wrangler deploy apps/insighthunter-lite/wrangler.toml

# Deploy insighthunter-main
echo "Deploying insighthunter-main..."
npx wrangler deploy apps/insighthunter-main/wrangler.toml

# Deploy insighthunter-pbx
echo "Deploying insighthunter-pbx..."
npx wrangler deploy apps/insighthunter-pbx/wrangler.toml

echo "All applications deployed successfully!"
#npx wrangler d1 execute insight-users --remote --file=./migrations/0001_initial_schema/0001_initial_schema.sql
#wrangler d1 execute insighthunter-auth --file=apps/insighthunter-auth/schema.sql -c apps/insighthunter-auth/wrangler.toml --remote
# Make sure your CLOUDFLARE_ACCOUNT_ID and CLOUDFLARE_API_TOKEN are set
##wrangler d1 execute insighthunter --file=apps/insighthunter-auth/schema.sql -c apps/insighthunter-auth/wrangler.toml --remote
##wrandler d1 create insight-hunter 
## wrangler d1 execute insight-hunter --file=apps/insighthunter-auth/schema.sql -c apps/insighthunter-auth/wrangler.toml --remote

# wrangler deploy /home/user/insighthunter/apps/insighthunter-auth/src/index.ts
 wrangler pages deploy /home/user/insighthunter/apps/insighthunter-main/public

echo " "
echo "Main deployed!"

