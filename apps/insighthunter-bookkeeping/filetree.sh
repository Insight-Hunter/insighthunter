#!/bin/bash
ROOT="//" #apps/insighthunter-bookkeeping"

mkdir -p $ROOT/src/{routes,middleware,services,agents,queues,workflows,db/migrations,lib,types}
mkdir -p $ROOT/tests/{routes,services,fixtures}

# src
echo "." > $ROOT/src/index.ts

# routes
echo "." > $ROOT/src/routes/transactions.ts
echo "." > $ROOT/src/routes/accounts.ts
echo "." > $ROOT/src/routes/journal.ts
echo "." > $ROOT/src/routes/reconciliation.ts
echo "." > $ROOT/src/routes/pl.ts
echo "." > $ROOT/src/routes/balanceSheet.ts
echo "." > $ROOT/src/routes/cashFlow.ts
echo "." > $ROOT/src/routes/categories.ts

# middleware
echo "." > $ROOT/src/middleware/auth.ts
echo "." > $ROOT/src/middleware/rateLimit.ts
echo "." > $ROOT/src/middleware/cors.ts

# services
echo "." > $ROOT/src/services/transactionService.ts
echo "." > $ROOT/src/services/categorizationService.ts
echo "." > $ROOT/src/services/reconciliationService.ts
echo "." > $ROOT/src/services/plService.ts
echo "." > $ROOT/src/services/balanceSheetService.ts
echo "." > $ROOT/src/services/cashFlowService.ts
echo "." > $ROOT/src/services/importService.ts
echo "." > $ROOT/src/services/exportService.ts

# agents
echo "." > $ROOT/src/agents/CategorizationAgent.ts

# queues
echo "." > $ROOT/src/queues/importQueue.ts
echo "." > $ROOT/src/queues/reconciliationQueue.ts

# workflows
echo "." > $ROOT/src/workflows/ImportWorkflow.ts
echo "." > $ROOT/src/workflows/ReconciliationWorkflow.ts

# db
echo "." > $ROOT/src/db/schema.sql
echo "." > $ROOT/src/db/migrations/0001_init.sql
echo "." > $ROOT/src/db/migrations/0002_journal.sql
echo "." > $ROOT/src/db/migrations/0003_categories.sql
echo "." > $ROOT/src/db/migrations/0004_reconciliation.sql
echo "." > $ROOT/src/db/queries.ts

# lib
echo "." > $ROOT/src/lib/doubleEntry.ts
echo "." > $ROOT/src/lib/currencyUtils.ts
echo "." > $ROOT/src/lib/dateUtils.ts
echo "." > $ROOT/src/lib/cache.ts
echo "." > $ROOT/src/lib/analytics.ts
echo "." > $ROOT/src/lib/logger.ts

# types
echo "." > $ROOT/src/types/env.ts
echo "." > $ROOT/src/types/accounting.ts
echo "." > $ROOT/src/types/statements.ts
echo "." > $ROOT/src/types/index.ts

# tests
echo "." > $ROOT/tests/services/plService.test.ts
echo "." > $ROOT/tests/services/reconciliationService.test.ts
echo "." > $ROOT/tests/services/categorizationService.test.ts
echo "." > $ROOT/tests/fixtures/mockTransactions.ts
echo "." > $ROOT/tests/fixtures/mockAccounts.ts
echo "." > $ROOT/tests/fixtures/mockStatements.ts

# config
echo "." > $ROOT/wrangler.jsonc
echo "." > $ROOT/package.json
echo "." > $ROOT/tsconfig.json
echo "." > $ROOT/README.md

echo "✅ insighthunter-bookkeeping scaffolded"
