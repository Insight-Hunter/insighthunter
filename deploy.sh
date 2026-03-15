#!/bin/bash
# Next steps for deploying insighthunter-main:

echo "Next steps:"
echo "  1. cp .env.example .env  — fill in your secrets"
echo "  2. wrangler kv:namespace create IH_SESSIONS  — then paste the ID into wrangler.jsonc"
echo "  3. wrangler kv:namespace create IH_CACHE     — same"
echo "  4. wrangler secret put JWT_SECRET"
echo "  5. wrangler secret put QBO_CLIENT_ID"
echo "  6. wrangler secret put QBO_CLIENT_SECRET"
echo "  7. npm run dev  — start local dev server"
echo "  8. npm run deploy  — build and deploy to Cloudflare Workers"
#!/bin/bash

git add . 
git commit -m ":pre-deploy git"
git push
export QBO_CLIENT_ID={.env{{QBO_CLIENT_ID}}
export QBO_CLIENT_SECRET={.env{{QBO_CLIENT_SECRET}}
export JWT_SECRET={.env{{JWT_SECRET}}
export CLOUDFLARE_ACCOUNT_ID={.env{{CLOUDFLARE_ACCOUNT_ID}}
export TURNSTILE_SECRET={.env{{TURNSTILE_SECRET}}
export CLOUDFLARE_API_TOKEN={.env{{CLOUDFLARE_API_TOKEN}}
export STRIPE_SECRET_KEY={.env{{STRIPE_SECRET_KEY}}
##wrangler secret put TURNSTILE_SECRET="0x4AAAAAACh0opVnevzeby3S65WWzoSwJOE"
#wrangler secret put STRIPE_SECRET_KEY
export STRIPE_WEBHOOK_SECRET={.env{{STRIPE_WEBHOOK_SECRET}}
export STRIPE_PUBLISHABLE_KEY={.env{{STRIPE_PUBLISHABLE_KEY}}


# This script deploys all of the InsightHunter applications.

# Exit immediately if a command exits with a non-zero status.
set -e

# Deploy insighthunter-auth
echo "Deploying insighthunter-auth..."
npx wrangler deploy --config apps/insighthunter-auth/wrangler.toml

# Deploy insighthunter
echo "Deploying insighthunter..."
npx wrangler pages deploy --project-name insighthunter

# Deploy insighthunter-bookkeeping
echo "Deploying insighthunter-bookkeeping..."
npx wrangler deploy --config apps/insighthunter-bookkeeping/wrangler.toml

# Deploy insighthunter-lite
echo "Deploying insighthunter-lite..."
npx wrangler deploy --config apps/insighthunter-lite/wrangler.toml

# Deploy insighthunter-pbx
echo "Deploying insighthunter-pbx..."
npx wrangler deploy --config apps/insighthunter-pbx/wrangler.toml

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


ġ