#!/bin/bash
source "scripts/lib/scaffold-utils.sh"
ROOT="apps/insighthunter-full-single-entity"
echo "🔧 $ROOT"

mkdir -p $ROOT/public/icons
mkdir -p $ROOT/src/backend/{durable-objects,integrations,ai,utils}
mkdir -p $ROOT/src/{styles,layouts,types,utils}
mkdir -p $ROOT/src/pages/{auth,dashboard,bookkeeping,payroll,reports,tax,shop,account,api/{auth,bookkeeping,payroll,reports,ai}}
mkdir -p $ROOT/src/components/ui
mkdir -p $ROOT/src/components/islands/{auth,dashboard,bookkeeping,payroll,reports,tax,shared}
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
safe_file $ROOT/public/.assetsignore

# src
safe_file $ROOT/src/env.d.ts

# backend
safe_file $ROOT/src/backend/index.ts
safe_file $ROOT/src/backend/durable-objects/BookkeepingLedger.ts
safe_file $ROOT/src/backend/durable-objects/PayrollEngine.ts
safe_file $ROOT/src/backend/durable-objects/InvoiceManager.ts
safe_file $ROOT/src/backend/durable-objects/BankConnectionManager.ts
safe_file $ROOT/src/backend/durable-objects/CfoAgent.ts
safe_file $ROOT/src/backend/ai/forecastEngine.ts
safe_file $ROOT/src/backend/ai/categorizationAgent.ts
safe_file $ROOT/src/backend/ai/insightEngine.ts
safe_file $ROOT/src/backend/integrations/quickbooks.ts
safe_file $ROOT/src/backend/integrations/plaid.ts
safe_file $ROOT/src/backend/integrations/stripe.ts
safe_file $ROOT/src/backend/utils/taxCalculator.ts
safe_file $ROOT/src/backend/utils/payCalculator.ts
safe_file $ROOT/src/backend/utils/doubleEntry.ts

# styles
safe_file $ROOT/src/styles/styles.css
safe_file $ROOT/src/styles/dashboard.css
safe_file $ROOT/src/styles/print.css

# layouts
safe_file $ROOT/src/layouts/Layout.astro
safe_file $ROOT/src/layouts/DashboardLayout.astro
safe_file $ROOT/src/layouts/PrintLayout.astro

# pages — auth
safe_file $ROOT/src/pages/index.astro
safe_file $ROOT/src/pages/auth/login.astro
safe_file $ROOT/src/pages/auth/signup.astro
safe_file $ROOT/src/pages/auth/logout.astro

# pages — dashboard
safe_file $ROOT/src/pages/dashboard/index.astro
safe_file $ROOT/src/pages/dashboard/insights.astro
safe_file $ROOT/src/pages/dashboard/forecast.astro
safe_file $ROOT/src/pages/dashboard/settings.astro

# pages — bookkeeping
safe_file $ROOT/src/pages/bookkeeping/index.astro
safe_file $ROOT/src/pages/bookkeeping/transactions.astro
safe_file $ROOT/src/pages/bookkeeping/reconciliation.astro
safe_file $ROOT/src/pages/bookkeeping/invoices.astro
safe_file $ROOT/src/pages/bookkeeping/accounts.astro

# pages — payroll
safe_file $ROOT/src/pages/payroll/index.astro
safe_file $ROOT/src/pages/payroll/employees.astro
safe_file $ROOT/src/pages/payroll/runs.astro
safe_file $ROOT/src/pages/payroll/tax.astro
safe_file $ROOT/src/pages/payroll/paystubs.astro

# pages — reports
safe_file $ROOT/src/pages/reports/index.astro
safe_file $ROOT/src/pages/reports/pl.astro
safe_file $ROOT/src/pages/reports/cashflow.astro
safe_file $ROOT/src/pages/reports/balance-sheet.astro
safe_file $ROOT/src/pages/reports/tax.astro

# pages — tax & shop
safe_file $ROOT/src/pages/tax/index.astro
safe_file $ROOT/src/pages/shop/index.astro
safe_file $ROOT/src/pages/shop/checkout.astro
safe_file $ROOT/src/pages/account/index.astro
safe_file $ROOT/src/pages/account/billing.astro

# api endpoints
safe_file $ROOT/src/pages/api/auth/login.ts
safe_file $ROOT/src/pages/api/auth/signup.ts
safe_file $ROOT/src/pages/api/auth/logout.ts
safe_file $ROOT/src/pages/api/bookkeeping/transactions.ts
safe_file $ROOT/src/pages/api/bookkeeping/reconcile.ts
safe_file $ROOT/src/pages/api/bookkeeping/invoices.ts
safe_file $ROOT/src/pages/api/payroll/run.ts
safe_file $ROOT/src/pages/api/payroll/employees.ts
safe_file $ROOT/src/pages/api/reports/pl.ts
safe_file $ROOT/src/pages/api/reports/cashflow.ts
safe_file $ROOT/src/pages/api/reports/export.ts
safe_file $ROOT/src/pages/api/ai/insights.ts
safe_file $ROOT/src/pages/api/ai/forecast.ts

# components — ui
safe_file $ROOT/src/components/ui/Nav.astro
safe_file $ROOT/src/components/ui/Footer.astro
safe_file $ROOT/src/components/ui/Sidebar.astro
safe_file $ROOT/src/components/ui/StatusBadge.astro

# components — islands
safe_file $ROOT/src/components/islands/auth/LoginForm.svelte
safe_file $ROOT/src/components/islands/auth/SignupForm.svelte
safe_file $ROOT/src/components/islands/dashboard/RevenueChart.svelte
safe_file $ROOT/src/components/islands/dashboard/CashFlowChart.svelte
safe_file $ROOT/src/components/islands/dashboard/ForecastWidget.svelte
safe_file $ROOT/src/components/islands/dashboard/InsightsPanel.svelte
safe_file $ROOT/src/components/islands/bookkeeping/LedgerTable.svelte
safe_file $ROOT/src/components/islands/bookkeeping/ReconciliationWizard.svelte
safe_file $ROOT/src/components/islands/bookkeeping/InvoiceManager.svelte
safe_file $ROOT/src/components/islands/bookkeeping/SpreadsheetUploader.svelte
safe_file $ROOT/src/components/islands/payroll/PayrollRunWizard.svelte
safe_file $ROOT/src/components/islands/payroll/EmployeeTable.svelte
safe_file $ROOT/src/components/islands/payroll/PaystubViewer.svelte
safe_file $ROOT/src/components/islands/reports/PLStatement.svelte
safe_file $ROOT/src/components/islands/reports/CashFlowStatement.svelte
safe_file $ROOT/src/components/islands/reports/BalanceSheet.svelte
safe_file $ROOT/src/components/islands/reports/ExportButton.svelte
safe_file $ROOT/src/components/islands/tax/TaxSummary.svelte
safe_file $ROOT/src/components/islands/shared/Notification.svelte
safe_file $ROOT/src/components/islands/shared/LoadingSpinner.svelte

# types
safe_file $ROOT/src/types/env.ts
safe_file $ROOT/src/types/financial.ts
safe_file $ROOT/src/types/employee.ts
safe_file $ROOT/src/types/bookkeeping.ts
safe_file $ROOT/src/types/payroll.ts
safe_file $ROOT/src/types/index.ts

# utils
safe_file $ROOT/src/utils/dateUtils.ts
safe_file $ROOT/src/utils/currencyUtils.ts
safe_file $ROOT/src/utils/formatters.ts

# tests
safe_file $ROOT/tests/services/forecastEngine.test.ts
safe_file $ROOT/tests/services/payCalculator.test.ts
safe_file $ROOT/tests/services/doubleEntry.test.ts
safe_file $ROOT/tests/fixtures/mockUser.ts
safe_file $ROOT/tests/fixtures/mockFinancials.ts
safe_file $ROOT/tests/fixtures/mockEmployee.ts

finish
