#!/bin/bash

git add . 
git commit -m ":pre-deploy git"
git push 

export CLOUDFLARE_ACCOUNT_ID="18c8e61a3669253dcfd0c7eec6be36a3"
export CLOUDFLARE_API_TOKEN="kAY9u88TaeuI9wByQkismZ2oGjBWqf5mVBhDTYNE"

wrangler pages deploy 

echo " "
echo "Secrets set and deployment command ran"

