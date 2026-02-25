#!/bin/bash
git add .
git commit -m "pre deployment"
git push 

export CLOUDFLARE_API_TOKEN="kAY9u88TaeuI9wByQkismZ2oGjBWqf5mVBhDTYNE"
export CLOUDFLARE_ACCOUNT_ID="18c8e61a3669253dcfd0c7eec6be36a3"

wrangler pages deploy apps/insighthunter-main

echo "Deployment Command issued with Token and ID stored" 