#!/bin/bash
set -e

echo "▶ Running D1 migrations..."

echo "  auth..."
npx wrangler d1 execute insighthunter-auth \
  --file=apps/insighthunter-auth/src/db/schema.sql

echo "  bookkeeping..."
npx wrangler d1 execute insighthunter-bookkeeping \
  --file=apps/insighthunter-bookkeeping/src/db/schema.sql

echo "  bizforma..."
npx wrangler d1 execute insighthunter-bizforma \
  --file=apps/insighthunter-bizforma/src/db/schema.sql

echo "  pbx..."
npx wrangler d1 execute insighthunter-pbx \
  --file=apps/insighthunter-pbx/src/db/schema.sql

echo "  payroll..."
npx wrangler d1 execute insighthunter-payroll \
  --file=apps/insighthunter-payroll/src/db/schema.sql

echo "  ai..."
npx wrangler d1 execute insighthunter-ai \
  --file=apps/insighthunter-ai/src/db/schema.sql

echo "✅ All migrations complete."
