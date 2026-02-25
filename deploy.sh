#!/bin/bash

git add . 
git commit -m ":pre-deploy git"
git --commit-dirty=true
git push 

export CLOUDFLARE_ACCOUNT_ID="18c8e61a3669253dcfd0c7eec6be36a3"
export CLOUDFLARE_API_TOKEN="kAY9u88TaeuI9wByQkismZ2oGjBWqf5mVBhDTYNE"

wrangler d1 execute insighthunter-auth --file=apps/insighthunter-auth/schema.sql -c apps/insighthunter-auth/wrangler.toml --remote
# Make sure your CLOUDFLARE_ACCOUNT_ID and CLOUDFLARE_API_TOKEN are set
wrangler d1 execute insight-hunter --file=apps/insighthunter-auth/schema.sql -c apps/insighthunter-auth/wrangler.toml --remote

## wrangler deploy /home/user/insighthunter/apps/insighthunter-auth
## wrangler deploy /home/user/insighthunter/apps/insighthunter-main

echo " "
echo "Secrets set and deployment command ran"

