#!/bin/bash
set -e
# Seed a new tenant's Chart of Accounts after they register.
# Usage: bash scripts/seed-tenant.sh <ORG_ID>

ORG_ID=${1:?Usage: seed-tenant.sh <ORG_ID>}
JWT_SECRET=$(npx wrangler secret get JWT_SECRET --name insighthunter-bookkeeping 2>/dev/null || echo "")

if [ -z "$JWT_SECRET" ]; then
  echo "Error: Could not retrieve JWT_SECRET. Set it manually."
  exit 1
fi

echo "Seeding Chart of Accounts for org: $ORG_ID"

curl -s -X POST \
  "https://insighthunter-bookkeeping.$(npx wrangler whoami 2>/dev/null | grep 'account' | awk '{print $NF}').workers.dev/seed" \
  -H "X-Internal-Secret: $JWT_SECRET" \
  -H "X-Org-Id: $ORG_ID" \
  | jq .

echo "Done."
