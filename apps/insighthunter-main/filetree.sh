#!/bin/bash
ROOT="//" #"apps/insighthunter-main"

mkdir -p $ROOT/src/{routes,middleware,services,db/migrations,lib,types}
mkdir -p $ROOT/public/assets/icons
mkdir -p $ROOT/tests/{routes,services,fixtures}

# src
echo "." > $ROOT/src/index.ts

# routes
echo "." > $ROOT/src/routes/dashboard.ts
echo "." > $ROOT/src/routes/reports.ts
echo "." > $ROOT/src/routes/forecasts.ts
echo "." > $ROOT/src/routes/insights.ts
echo "." > $ROOT/src/routes/transactions.ts
echo "." > $ROOT/src/routes/clients.ts
echo "." > $ROOT/src/routes/settings.ts

# middleware
echo "." > $ROOT/src/middleware/auth.ts
echo "." > $ROOT/src/middleware/rateLimit.ts
echo "." > $ROOT/src/middleware/cors.ts
echo "." > $ROOT/src/middleware/featureFlags.ts

# services
echo "." > $ROOT/src/services/dashboardService.ts
echo "." > $ROOT/src/services/reportService.ts
echo "." > $ROOT/src/services/forecastService.ts
echo "." > $ROOT/src/services/insightService.ts
echo "." > $ROOT/src/services/bookkeepingService.ts
echo "." > $ROOT/src/services/notificationService.ts

# db
echo "." > $ROOT/src/db/schema.sql
echo "." > $ROOT/src/db/migrations/0001_init.sql
echo "." > $ROOT/src/db/migrations/0002_clients.sql
echo "." > $ROOT/src/db/migrations/0003_reports.sql
echo "." > $ROOT/src/db/migrations/0004_forecasts.sql
echo "." > $ROOT/src/db/queries.ts

# lib
echo "." > $ROOT/src/lib/pdf.ts
echo "." > $ROOT/src/lib/cache.ts
echo "." > $ROOT/src/lib/analytics.ts
echo "." > $ROOT/src/lib/logger.ts

# types
echo "." > $ROOT/src/types/env.ts
echo "." > $ROOT/src/types/financial.ts
echo "." > $ROOT/src/types/index.ts

# public
echo "." > $ROOT/public/index.html
echo "." > $ROOT/public/assets/app.js
echo "." > $ROOT/public/assets/styles.css

# tests
echo "." > $ROOT/tests/routes/dashboard.test.ts
echo "." > $ROOT/tests/routes/reports.test.ts
echo "." > $ROOT/tests/services/forecastService.test.ts
echo "." > $ROOT/tests/fixtures/mockUser.ts
echo "." > $ROOT/tests/fixtures/mockFinancials.ts

# config
echo "." > $ROOT/wrangler.jsonc
echo "." > $ROOT/package.json
echo "." > $ROOT/tsconfig.json
echo "." > $ROOT/README.md

echo "✅ insighthunter-main scaffolded"
