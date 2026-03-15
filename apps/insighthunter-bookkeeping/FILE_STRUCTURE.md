apps/insighthunter-bookkeeping/
├── src/
│   ├── index.ts                        # Worker entry & route handling
│   ├── routes/
│   │   ├── transactions.ts             # CRUD for transactions
│   │   ├── accounts.ts                 # Chart of accounts
│   │   ├── journal.ts                  # Journal entries (debits/credits)
│   │   ├── reconciliation.ts           # Bank reconciliation
│   │   ├── pl.ts                       # P&L statement endpoints
│   │   ├── balanceSheet.ts             # Balance sheet endpoints
│   │   ├── cashFlow.ts                 # Cash flow statement endpoints
│   │   └── categories.ts               # Transaction categorization
│   ├── middleware/
│   │   ├── auth.ts                     # JWT validation via insighthunter-auth
│   │   ├── rateLimit.ts                # KV-based rate limiting
│   │   └── cors.ts                     # CORS policy
│   ├── services/
│   │   ├── transactionService.ts       # Transaction ingestion & processing
│   │   ├── categorizationService.ts    # AI-powered auto-categorization
│   │   ├── reconciliationService.ts    # Match transactions to bank data
│   │   ├── plService.ts                # P&L aggregation logic
│   │   ├── balanceSheetService.ts      # Balance sheet aggregation
│   │   ├── cashFlowService.ts          # Cash flow computation
│   │   ├── importService.ts            # CSV/QBO/OFX file ingestion
│   │   └── exportService.ts            # Export to CSV/PDF/Excel
│   ├── agents/
│   │   └── CategorizationAgent.ts      # Durable Object AI agent for auto-categorization
│   ├── queues/
│   │   ├── importQueue.ts              # Async CSV/file import consumer
│   │   └── reconciliationQueue.ts      # Async reconciliation job consumer
│   ├── workflows/
│   │   ├── ImportWorkflow.ts           # Durable import pipeline
│   │   └── ReconciliationWorkflow.ts   # Durable reconciliation pipeline
│   ├── db/
│   │   ├── schema.sql                  # D1 schema
│   │   ├── migrations/
│   │   │   ├── 0001_init.sql           # Accounts, transactions tables
│   │   │   ├── 0002_journal.sql        # Journal entries
│   │   │   ├── 0003_categories.sql     # Categories & rules
│   │   │   └── 0004_reconciliation.sql # Reconciliation records
│   │   └── queries.ts                  # Typed D1 query helpers
│   ├── lib/
│   │   ├── doubleEntry.ts              # Double-entry accounting engine
│   │   ├── currencyUtils.ts            # Multi-currency handling
│   │   ├── dateUtils.ts                # Fiscal period helpers
│   │   ├── cache.ts                    # KV caching helpers
│   │   ├── analytics.ts                # Analytics Engine event tracking
│   │   └── logger.ts                   # Structured logging
│   └── types/
│       ├── env.ts                      # Env bindings interface
│       ├── accounting.ts               # Account, Transaction, Journal types
│       ├── statements.ts               # P&L, Balance Sheet, Cash Flow types
│       └── index.ts                    # Re-exports
│
├── tests/
│   ├── services/
│   │   ├── plService.test.ts
│   │   ├── reconciliationService.test.ts
│   │   └── categorizationService.test.ts
│   └── fixtures/
│       ├── mockTransactions.ts
│       ├── mockAccounts.ts
│       └── mockStatements.ts
│
├── wrangler.jsonc
├── package.json
├── tsconfig.json
└── README.md
