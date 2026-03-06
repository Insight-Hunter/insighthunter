apps/insighthunter-main/
├── src/
│   ├── index.ts                        # Main Worker entry & route handling
│   ├── routes/
│   │   ├── dashboard.ts                # Dashboard data endpoints
│   │   ├── reports.ts                  # Report generation & export
│   │   ├── forecasts.ts                # Forecast endpoints
│   │   ├── insights.ts                 # AI-generated CFO insights
│   │   ├── transactions.ts             # Transaction management
│   │   ├── clients.ts                  # Client management (white-label)
│   │   └── settings.ts                 # User/org settings
│   ├── middleware/
│   │   ├── auth.ts                     # JWT validation via insighthunter-auth
│   │   ├── rateLimit.ts                # KV-based rate limiting
│   │   ├── cors.ts                     # CORS policy
│   │   └── featureFlags.ts             # Lite vs Pro feature gating
│   ├── services/
│   │   ├── dashboardService.ts         # Aggregates KPIs & metrics
│   │   ├── reportService.ts            # Builds & exports PDF reports
│   │   ├── forecastService.ts          # Cash flow & P&L projections
│   │   ├── insightService.ts           # Calls insighthunter-agents
│   │   ├── bookkeepingService.ts       # Calls insighthunter-bookkeeping
│   │   └── notificationService.ts      # Alerts & KPI threshold triggers
│   ├── db/
│   │   ├── schema.sql                  # D1 schema
│   │   ├── migrations/
│   │   │   ├── 0001_init.sql
│   │   │   ├── 0002_clients.sql
│   │   │   ├── 0003_reports.sql
│   │   │   └── 0004_forecasts.sql
│   │   └── queries.ts                  # Typed D1 query helpers
│   ├── lib/
│   │   ├── pdf.ts                      # R2-backed PDF generation
│   │   ├── cache.ts                    # KV caching helpers
│   │   ├── analytics.ts                # Analytics Engine event tracking
│   │   └── logger.ts                   # Structured logging
│   └── types/
│       ├── env.ts                      # Env bindings interface
│       ├── financial.ts                # P&L, forecast, KPI types
│       └── index.ts                    # Re-exports
│
├── public/
│   ├── index.html                      # SPA entry point
│   └── assets/
│       ├── app.[hash].js               # Bundled React app
│       ├── styles.[hash].css
│       └── icons/
│
├── tests/
│   ├── routes/
│   │   ├── dashboard.test.ts
│   │   └── reports.test.ts
│   ├── services/
│   │   └── forecastService.test.ts
│   └── fixtures/
│       ├── mockUser.ts
│       └── mockFinancials.ts
│
├── wrangler.jsonc                      # Bindings: D1, KV, R2, Queues, Analytics Engine
├── package.json
├── tsconfig.json
└── README.md
