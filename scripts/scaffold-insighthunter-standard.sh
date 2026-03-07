#!/bin/bash
source "$(dirname "$0")/lib/scaffold-utils.sh"
ROOT="apps/insighthunter-standard"
echo "🔧 $ROOT"

mkdir -p $ROOT/public/icons
mkdir -p $ROOT/src/{styles,layouts,types,utils}
mkdir -p $ROOT/src/pages/{auth,dashboard,reports,api}
mkdir -p $ROOT/src/components/{ui,islands/{dashboard,reports,shared}}
mkdir -p $ROOT/tests/{routes,services,fixtures}

# root config
safe_file $ROOT/astro.config.mjs
safe_file $ROOT/wrangler.toml
safe_file $ROOT/svelte.config.js
safe_file $ROOT/package.json
safe_file $ROOT/tsconfig.json

# public
safe_file $ROOT/public/favicon.ico
safe_file $ROOT/public/manifest.webmanifest
safe_file $ROOT/public/robots.txt

# src
safe_file $ROOT/src/env.d.ts

# styles
safe_file $ROOT/src/styles/styles.css
safe_file $ROOT/src/styles/dashboard.css

# layouts
safe_file $ROOT/src/layouts/Layout.astro
safe_file $ROOT/src/layouts/DashboardLayout.astro

# pages
safe_file $ROOT/src/pages/index.astro
safe_file $ROOT/src/pages/pricing.astro
safe_file $ROOT/src/pages/auth/login.astro
safe_file $ROOT/src/pages/auth/signup.astro
safe_file $ROOT/src/pages/auth/logout.astro
safe_file $ROOT/src/pages/dashboard/index.astro
safe_file $ROOT/src/pages/dashboard/transactions.astro
safe_file $ROOT/src/pages/dashboard/forecasts.astro
safe_file $ROOT/src/pages/dashboard/insights.astro
safe_file $ROOT/src/pages/dashboard/settings.astro
safe_file $ROOT/src/pages/reports/index.astro
safe_file $ROOT/src/pages/reports/pl.astro
safe_file $ROOT/src/pages/reports/cashflow.astro
safe_file $ROOT/src/pages/api/insights.ts
safe_file $ROOT/src/pages/api/reports.ts
safe_file $ROOT/src/pages/api/forecast.ts
safe_file $ROOT/src/pages/api/upload.ts

# components — ui
safe_file $ROOT/src/components/ui/Nav.astro
safe_file $ROOT/src/components/ui/Footer.astro
safe_file $ROOT/src/components/ui/PricingCard.astro

# components — islands
safe_file $ROOT/src/components/islands/dashboard/RevenueChart.svelte
safe_file $ROOT/src/components/islands/dashboard/CashFlowChart.svelte
safe_file $ROOT/src/components/islands/dashboard/ForecastWidget.svelte
safe_file $ROOT/src/components/islands/dashboard/TransactionTable.svelte
safe_file $ROOT/src/components/islands/dashboard/InsightsPanel.svelte
safe_file $ROOT/src/components/islands/reports/PLStatement.svelte
safe_file $ROOT/src/components/islands/reports/CashFlowStatement.svelte
safe_file $ROOT/src/components/islands/reports/ExportButton.svelte
safe_file $ROOT/src/components/islands/shared/Notification.svelte
safe_file $ROOT/src/components/islands/shared/LoadingSpinner.svelte
safe_file $ROOT/src/components/islands/shared/CSVUploader.svelte

# types
safe_file $ROOT/src/types/env.ts
safe_file $ROOT/src/types/financial.ts
safe_file $ROOT/src/types/index.ts

# utils
safe_file $ROOT/src/utils/dateUtils.ts
safe_file $ROOT/src/utils/currencyUtils.ts

# tests
safe_file $ROOT/tests/routes/dashboard.test.ts
safe_file $ROOT/tests/services/forecastService.test.ts
safe_file $ROOT/tests/fixtures/mockUser.ts
safe_file $ROOT/tests/fixtures/mockFinancials.ts

finish
