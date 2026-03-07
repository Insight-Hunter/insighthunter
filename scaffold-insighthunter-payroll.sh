#!/bin/bash
import safe_file from "$HOME/insighthunter/scripts/lib/scaffold-utils.sh"
source "$HOME/insighthunter/scripts/lib/scaffold-utils.sh"
ROOT="apps/insighthunter-payroll"
echo "🔧 $ROOT"

mkdir -p $ROOT/public/icons
mkdir -p $ROOT/src/backend/{durable-objects,integrations,utils}
mkdir -p $ROOT/src/{styles,types,utils,layouts,pages/api}
mkdir -p $ROOT/src/components/{islands/{employees,payroll,tax,shared},ui}
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

# backend
safe_file $ROOT/src/backend/index.ts
safe_file $ROOT/src/backend/durable-objects/PayrollEngine.ts
safe_file $ROOT/src/backend/durable-objects/TaxCalculator.ts
safe_file $ROOT/src/backend/durable-objects/EmployeeManager.ts
safe_file $ROOT/src/backend/integrations/gusto.ts
safe_file $ROOT/src/backend/integrations/adp.ts
safe_file $ROOT/src/backend/utils/taxTables.ts
safe_file $ROOT/src/backend/utils/payCalculator.ts

# styles
safe_file $ROOT/src/styles/payroll.css
safe_file $ROOT/src/styles/tables.css

# layouts
safe_file $ROOT/src/layouts/AppLayout.astro
safe_file $ROOT/src/layouts/PayrollLayout.astro

# pages
safe_file $ROOT/src/pages/index.astro
safe_file $ROOT/src/pages/employees.astro
safe_file $ROOT/src/pages/runs.astro
safe_file $ROOT/src/pages/tax.astro
safe_file $ROOT/src/pages/paystubs.astro
safe_file $ROOT/src/pages/reports.astro
safe_file $ROOT/src/pages/settings.astro
safe_file $ROOT/src/pages/onboarding.astro
safe_file $ROOT/src/pages/api/run-payroll.ts
safe_file $ROOT/src/pages/api/employees.ts
safe_file $ROOT/src/pages/api/tax.ts
safe_file $ROOT/src/pages/api/paystubs.ts
safe_file $ROOT/src/pages/api/export.ts

# components — ui
safe_file $ROOT/src/components/ui/Nav.astro
safe_file $ROOT/src/components/ui/Footer.astro
safe_file $ROOT/src/components/ui/StatusBadge.astro

# components — islands
safe_file $ROOT/src/components/islands/employees/EmployeeTable.svelte
safe_file $ROOT/src/components/islands/employees/EmployeeForm.svelte
safe_file $ROOT/src/components/islands/employees/DirectDepositForm.svelte
safe_file $ROOT/src/components/islands/payroll/PayrollRunWizard.svelte
safe_file $ROOT/src/components/islands/payroll/PayrollSummary.svelte
safe_file $ROOT/src/components/islands/payroll/PaystubViewer.svelte
safe_file $ROOT/src/components/islands/tax/TaxCalculator.svelte
safe_file $ROOT/src/components/islands/tax/W2Generator.svelte
safe_file $ROOT/src/components/islands/tax/Form1099.svelte
safe_file $ROOT/src/components/islands/shared/Notification.svelte
safe_file $ROOT/src/components/islands/shared/LoadingSpinner.svelte

# types
safe_file $ROOT/src/types/env.ts
safe_file $ROOT/src/types/employee.ts
safe_file $ROOT/src/types/payroll.ts
safe_file $ROOT/src/types/tax.ts
safe_file $ROOT/src/types/index.ts

# utils
safe_file $ROOT/src/utils/dateUtils.ts
safe_file $ROOT/src/utils/currencyUtils.ts

# tests
safe_file $ROOT/tests/services/payCalculator.test.ts
safe_file $ROOT/tests/services/taxTables.test.ts
safe_file $ROOT/tests/fixtures/mockEmployee.ts
safe_file $ROOT/tests/fixtures/m