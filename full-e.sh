#!/bin/bash
source "scripts/lib/scaffold-utils.sh"
ROOT="apps/insighthunter-full-enterprise"
echo "$ROOT"

mkdir -p $ROOT/public/icons
mkdir -p $ROOT/src/backend/{durable-objects,integrations,ai,utils,workflows}
mkdir -p $ROOT/src/{styles,layouts,types,utils}
mkdir -p $ROOT/src/pages/{auth,dashboard,entities,bookkeeping,payroll,reports,tax,admin,whitelabel,shop,account,api/{auth,entities,bookkeeping,payroll,reports,ai,admin,whitelabel}}
mkdir -p $ROOT/src/components/ui
mkdir -p $ROOT/src/components/islands/{auth,dashboard,entities,bookkeeping,payroll,reports,admin,whitelabel,shared}
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
safe_file $ROOT/src/backend/durable-objects/EnterpriseOrchestrator.ts
safe_file $ROOT/src/backend/durable-objects/MultiEntityLedger.ts
safe_file $ROOT/src/backend/durable-objects/ConsolidationEngine.ts
safe_file $ROOT/src/backend/durable-objects/PayrollEngine.ts
safe_file $ROOT/src/backend/durable-objects/InvoiceManager.ts
safe_file $ROOT/src/backend/durable-objects/BankConnectionManager.ts
safe_file $ROOT/src/backend/durable-objects/WhitelabelManager.ts
safe_file $ROOT/src/backend/durable-objects/CfoAgent.ts
safe_file $ROOT/src/backend/ai/forecastEngine.ts
safe_file $ROOT/src/backend/ai/consolidationAgent.ts
safe_file $ROOT/src/backend/ai/insightEngine.ts
safe_file $ROOT/src/backend/ai/complianceAgent.ts
safe_file $ROOT/src/backend/integrations/quickbooks.ts
safe_file $ROOT/src/backend/integrations/xero.ts
safe_file $ROOT/src/backend/integrations/plaid.ts
safe_file $ROOT/src/backend/integrations/stripe.ts
safe_file $ROOT/src/backend/integrations/netsuite.ts
safe_file $ROOT/src/backend/workflows/ConsolidationWorkflow.ts
safe_file $ROOT/src/backend/workflows/PayrollWorkflow.ts
safe_file $ROOT/src/backend/workflows/AuditWorkflow.ts
safe_file $ROOT/src/backend/workflows/ReportWorkflow.ts
safe_file $ROOT/src/backend/utils/taxCalculator.ts
safe_file $ROOT/src/backend/utils/payCalculator.ts
safe_file $ROOT/src/backend/utils/doubleEntry.ts
safe_file $ROOT/src/backend/utils/intercompany.ts

# styles
safe_file $ROOT/src/styles/styles.css
safe_file $ROOT/src/styles/dashboard.css
safe_file $ROOT/src/styles/enterprise.css
safe_file $ROOT/src/styles/print.css

# layouts
safe_file $ROOT/src/layouts/Layout.astro
safe_file $ROOT/src/layouts/DashboardLayout.astro
safe_file $ROOT/src/layouts/AdminLayout.astro
safe_file $ROOT/src/layouts/WhitelabelLayout.astro
safe_file $ROOT/src/layouts/PrintLayout.astro

# pages — top
safe_file $ROOT/src/pages/index.astro
safe_file $ROOT/src/pages/auth/login.astro
safe_file $ROOT/src/pages/auth/signup.astro
safe_file $ROOT/src/pages/auth/logout.astro
safe_file $ROOT/src/pages/auth/sso.astro

# pages — dashboard
safe_file $ROOT/src/pages/dashboard/index.astro
safe_file $ROOT/src/pages/dashboard/consolidated.astro
safe_file $ROOT/src/pages/dashboard/insights.astro
safe_file $ROOT/src/pages/dashboard/forecast.astro
safe_file $ROOT/src/pages/dashboard/settings.astro

# pages — entities
safe_file $ROOT/src/pages/entities/index.astro
safe_file $ROOT/src/pages/entities/new.astro
safe_file "$ROOT/src/pages/entities/[id].astro"
safe_file "$ROOT/src/pages/entities/[id]/bookkeeping.astro"
safe_file "$ROOT/src/pages/entities/[id]/payroll.astro"
safe_file "$ROOT/src/pages/entities/[id]/reports.astro"

# pages — bookkeeping
safe_file $ROOT/src/pages/bookkeeping/index.astro
safe_file $ROOT/src/pages/bookkeeping/transactions.astro
safe_file $ROOT/src/pages/bookkeeping/reconciliation.astro
safe_file $ROOT/src/pages/bookkeeping/invoices.astro
safe_file $ROOT/src/pages/bookkeeping/intercompany.astro
safe_file $ROOT/src/pages/bookkeeping/consolidation.astro

# pages — payroll
safe_file $ROOT/src/pages/payroll/index.astro
safe_file $ROOT/src/pages/payroll/employees.astro
safe_file $ROOT/src/pages/payroll/runs.astro
safe_file $ROOT/src/pages/payroll/tax.astro
safe_file $ROOT/src/pages/payroll/paystubs.astro
safe_file $ROOT/src/pages/payroll/contractors.astro

# pages — reports
safe_file $ROOT/src/pages/reports/index.astro
safe_file $ROOT/src/pages/reports/pl.astro
safe_file $ROOT/src/pages/reports/cashflow.astro
safe_file $ROOT/src/pages/reports/balance-sheet.astro
safe_file $ROOT/src/pages/reports/consolidated.astro
safe_file $ROOT/src/pages/reports/tax.astro
safe_file $ROOT/src/pages/reports/audit.astro

# pages — admin & whitelabel
safe_file $ROOT/src/pages/admin/index.astro
safe_file $ROOT/src/pages/admin/users.astro
safe_file $ROOT/src/pages/admin/entities.astro
safe_file $ROOT/src/pages/admin/billing.astro
safe_file $ROOT/src/pages/admin/compliance.astro
safe_file $ROOT/src/pages/admin/audit-log.astro
safe_file $ROOT/src/pages/whitelabel/index.astro
safe_file $ROOT/src/pages/whitelabel/branding.astro
safe_file $ROOT/src/pages/whitelabel/clients.astro

# pages — account & shop
safe_file $ROOT/src/pages/shop/index.astro
safe_file $ROOT/src/pages/shop/checkout.astro
safe_file $ROOT/src/pages/account/index.astro
safe_file $ROOT/src/pages/account/billing.astro
safe_file $ROOT/src/pages/account/team.astro
safe_file $ROOT/src/pages/account/sso.astro

# api endpoints
safe_file $ROOT/src/pages/api/auth/login.ts
safe_file $ROOT/src/pages/api/auth/signup.ts
safe_file $ROOT/src/pages/api/auth/logout.ts
safe_file $ROOT/src/pages/api/auth/sso.ts
safe_file $ROOT/src/pages/api/entities/index.ts
safe_file $ROOT/src/pages/api/entities/create.ts
safe_file $ROOT/src/pages/api/bookkeeping/transactions.ts
safe_file $ROOT/src/pages/api/bookkeeping/consolidate.ts
safe_file $ROOT/src/pages/api/bookkeeping/intercompany.ts
safe_file $ROOT/src/pages/api/payroll/run.ts
safe_file $ROOT/src/pages/api/payroll/employees.ts
safe_file $ROOT/src/pages/api/reports/consolidated.ts
safe_file $ROOT/src/pages/api/reports/export.ts
safe_file $ROOT/src/pages/api/ai/insights.ts
safe_file $ROOT/src/pages/api/ai/forecast.ts
safe_file $ROOT/src/pages/api/ai/compliance.ts
safe_file $ROOT/src/pages/api/admin/users.ts
safe_file $ROOT/src/pages/api/admin/audit.ts
safe_file $ROOT/src/pages/api/whitelabel/branding.ts
safe_file $ROOT/src/pages/api/whitelabel/clients.ts

# components — ui
safe_file $ROOT/src/components/ui/Nav.astro
safe_file $ROOT/src/components/ui/Footer.astro
safe_file $ROOT/src/components/ui/Sidebar.astro
safe_file $ROOT/src/components/ui/EntityBreadcrumb.astro
safe_file $ROOT/src/components/ui/StatusBadge.astro

# components — islands
safe_file $ROOT/src/components/islands/auth/LoginForm.svelte
safe_file $ROOT/src/components/islands/auth/SSOForm.svelte
safe_file $ROOT/src/components/islands/dashboard/ConsolidatedChart.svelte
safe_file $ROOT/src/components/islands/dashboard/EntitySwitcher.svelte
safe_file $ROOT/src/components/islands/dashboard/ForecastWidget.svelte
safe_file $ROOT/src/components/islands/dashboard/InsightsPanel.svelte
safe_file $ROOT/src/components/islands/entities/EntityTable.svelte
safe_file $ROOT/src/components/islands/entities/EntityForm.svelte
safe_file $ROOT/src/components/islands/bookkeeping/LedgerTable.svelte
safe_file $ROOT/src/components/islands/bookkeeping/IntercompanyMatrix.svelte
safe_file $ROOT/src/components/islands/bookkeeping/ConsolidationWizard.svelte
safe_file $ROOT/src/components/islands/bookkeeping/ReconciliationWizard.svelte
safe_file $ROOT/src/components/islands/payroll/PayrollRunWizard.svelte
safe_file $ROOT/src/components/islands/payroll/EmployeeTable.svelte
safe_file $ROOT/src/components/islands/payroll/ContractorTable.svelte
safe_file $ROOT/src/components/islands/reports/ConsolidatedPL.svelte
safe_file $ROOT/src/components/islands/reports/SegmentReport.svelte
safe_file $ROOT/src/components/islands/reports/AuditTrail.svelte
safe_file $ROOT/src/components/islands/reports/ExportButton.svelte
safe_file $ROOT/src/components/islands/admin/UserManagement.svelte
safe_file $ROOT/src/components/islands/admin/AuditLog.svelte
safe_file $ROOT/src/components/islands/admin/BillingManager.svelte
safe_file $ROOT/src/components/islands/whitelabel/BrandingEditor.svelte
safe_file $ROOT/src/components/islands/whitelabel/ClientPortal.svelte
safe_file $ROOT/src/components/islands/shared/Notification.svelte
safe_file $ROOT/src/components/islands/shared/LoadingSpinner.svelte
safe_file $ROOT/src/components/islands/shared/PermissionGate.svelte

# types
safe_file $ROOT/src/types/env.ts
safe_file $ROOT/src/types/entity.ts
safe_file $ROOT/src/types/financial.ts
safe_file $ROOT/src/types/employee.ts
safe_file $ROOT/src/types/bookkeeping.ts
safe_file $ROOT/src/types/payroll.ts
safe_file $ROOT/src/types/admin.ts
safe_file $ROOT/src/types/whitelabel.ts
safe_file $ROOT/src/types/index.ts

# utils
safe_file $ROOT/src/utils/dateUtils.ts
safe_file $ROOT/src/utils/currencyUtils.ts
safe_file $ROOT/src/utils/formatters.ts
safe_file $ROOT/src/utils/permissions.ts

# tests
safe_file $ROOT/tests/services/consolidationEngine.test.ts
safe_file $ROOT/tests/services/intercompany.test.ts
safe_file $ROOT/tests/services/payCalculator.test.ts
safe_file $ROOT/tests/fixtures/mockEntity.ts
safe_file $ROOT/tests/fixtures/mockUser.ts
safe_file $ROOT/tests/fixtures/mockFinancials.ts
safe_file $ROOT/tests/fixtures/mockEmployee.

