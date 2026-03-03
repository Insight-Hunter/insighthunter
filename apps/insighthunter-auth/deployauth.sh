#!/bin/bash

git add . 
git commit -m ":pre-deploy git"
git push

export JWT_SECRET="5afde2d9ba897193d88ba038ed3edd03870ccae6338077cec5c50e333c9de777"
export CLOUDFLARE_ACCOUNT_ID="18c8e61a3669253dcfd0c7eec6be36a3"
export TURNSTILE_SECRET="0x4AAAAAACh0opVnevzeby3S65WWzoSwJOE" 
export CLOUDFLARE_API_TOKEN="kAY9u88TaeuI9wByQkismZ2oGjBWqf5mVBhDTYNE"
export VERIFY_EMAIL_JWT_SECRET="fa8bd5c974d77275081c682d635d81ea127329711d6b87f0035172a79928dc80"
export MAGIC_LINK_JWT_SECRET="aca7a8f956926b57fcd4d5624c21d3efb9730b4a115f3b0bbc969b06da8c136f"
export RESEND_API_KEY
export TURNSTILE_SITE_KEY="0x4AAAAAACh0ortSylrGgGmZ"

# From apps/insighthunter-auth/
npm install bcryptjs jose
npm install -D @types/bcryptjs

# Create D1
#wrangler d1 create insighthunter-auth

# Apply schema
#wrangler d1 migrations apply insighthunter-auth --local

# Create KV namespaces
#wrangler kv namespace create LOGIN_SESSION_CACHE
#wrangler kv namespace create RATE_LIMIT

# Set secrets
#wrangler secret put JWT_SECRET               # min 32 chars, same as insighthunter-lite
#wrangler secret put VERIFY_EMAIL_JWT_SECRET  # different 32+ char secret
#wrangler secret put MAGIC_LINK_JWT_SECRET    # different 32+ char secret
#wrangler secret put RESEND_API_KEY           # from resend.com
#wrangler secret put TURNSTILE_SECRET_KEY     # from Cloudflare dashboard > Turnstile

npm run dev
