apps/insighthunter-lite/
├── src/
│   ├── index.ts                        # Worker entry & route handling
│   ├── routes/
│   │   ├── dashboard.ts                # Lite dashboard (basic KPIs only)
│   │   ├── upload.ts                   # CSV upload & ingestion
│   │   ├── reports.ts                  # Basic P&L & cash flow report
│   │   ├── insights.ts                 # Limited AI insights (capped)
│   │   └── upgrade.ts                  # Upsell to Pro endpoints
│   ├── middleware/
│   │   ├── auth.ts                     # JWT validation via insighthunter-auth
│   │   ├── rateLimit.ts                # Stricter KV-based rate limiting (free tier)
│   │   ├── cors.ts                     # CORS policy
│   │   └── usageCap.ts                 # Enforce free tier limits (uploads, reports)
│   ├── services/
│   │   ├── uploadService.ts            # CSV parsing & R2 storage
│   │   ├── dashboardService.ts         # Basic KPI aggregation
│   │   ├── reportService.ts            # Simplified P&L & cash flow
│   │   ├── insightService.ts           # Capped AI insight calls
│   │   └── upgradeService.ts           # Tracks upgrade prompts & conversions
│   ├── db/
│   │   ├── schema.sql                  # Lite D1 schema (minimal tables)
│   │   ├── migrations/
│   │   │   ├── 0001_init.sql           # Users, uploads, basic transactions
│   │   │   └── 0002_usage.sql          # Usage tracking for caps
│   │   └── queries.ts                  # Typed D1 query helpers
│   ├── lib/
│   │   ├── csvParser.ts                # CSV parsing & validation
│   │   ├── usageTracker.ts             # Track uploads, reports, AI calls
│   │   ├── cache.ts                    # KV caching helpers
│   │   ├── analytics.ts                # Analytics Engine (conversion tracking)
│   │   └── logger.ts                   # Structured logging
│   └── types/
│       ├── env.ts                      # Env bindings interface
│       ├── upload.ts                   # CSV row, upload job types
│       ├── usage.ts                    # Usage cap & limit types
│       └── index.ts                    # Re-exports
│
├── public/
│   ├── index.html                      # Lite SPA entry point
│   └── assets/
│       ├── app.[hash].js               # Lightweight React/vanilla bundle
│       ├── styles.[hash].css
│       └── icons/
│
├── tests/
│   ├── routes/
│   │   ├── upload.test.ts
│   │   └── dashboard.test.ts
│   ├── services/
│   │   └── csvParser.test.ts
│   └── fixtures/
│       ├── mockCsv.ts
│       └── mockUser.ts
│
├── wrangler.jsonc
├── package.json
├── tsconfig.json
└── README.md
