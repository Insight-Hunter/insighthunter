apps/
├── .wrangler/
│   └── tmp/
├── bizforma/
│   └── package.json
├── insighthunter-auth/
│   ├── migrations/
│   │   ├── 0001_initial_schema/
│   │   │   └── 0001_initial_schema.sql
│   │   └── schema.sql
│   ├── src/
│   │   └── index.ts
│   ├── package-lock.json
│   ├── package.json
│   └── wrangler.toml
├── insighthunter-bookkeeping/
│   ├── .astro/
│   │   ├── collections/
│   │   ├── content-assets.mjs
│   │   ├── content-modules.mjs
│   │   ├── content.d.ts
│   │   └── types.d.ts
│   ├── docs/
│   │   ├── API.md
│   │   ├── ARCHITECTURE.md
│   │   ├── DEPLOYMENT.md
│   │   └── DEVELOPMENT.md
│   ├── public/
│   │   ├── icons/
│   │   │   ├── icon-192.png
│   │   │   └── icon-512.png
│   │   ├── manifest.webmanifest
│   │   ├── robots.txt
│   │   └── sw.js
│   ├── src/
│   │   ├── backend/
│   │   │   ├── ai/
│   │   │   │   └── reconciliation-engine.ts
│   │   │   ├── durable-objects/
│   │   │   │   ├── BankConnectionManager.ts
│   │   │   │   ├── BookkeepingLedger.ts
│   │   │   │   ├── InvoiceManager.ts
│   │   │   │   └── SubscriptionManager.ts
│   │   │   ├── integrations/
│   │   │   │   └── quickbooks.ts
│   │   │   ├── utils/
│   │   │   │   └── pricing.ts
│   │   │   ├── enhanced-ledger.tsx
│   │   │   ├── index.ts
│   │   │   └── invoice-management.ts
│   │   ├── components/
│   │   │   ├── auth/
│   │   │   │   └── SignupForm.tsx
│   │   │   ├── banking/
│   │   │   │   └── PlaidLink.tsx
│   │   │   ├── bookkeeping/
│   │   │   │   ├── AccountSelector.css
│   │   │   │   ├── AccountSelector.tsx
│   │   │   │   ├── AIReconciliation.tsx
│   │   │   │   ├── BudgetTracker.css
│   │   │   │   ├── BudgetTracker.tsx
│   │   │   │   ├── InsightsPanel.css
│   │   │   │   ├── InsightsPanel.tsx
│   │   │   │   ├── InvoiceManager.css
│   │   │   │   ├── InvoiceManager.tsx
│   │   │   │   ├── LedgerTable.css
│   │   │   │   ├── LedgerTable.tsx
│   │   │   │   ├── MetricsDashboard.css
│   │   │   │   ├── MetricsDashboard.tsx
│   │   │   │   ├── ReportCard.css
│   │   │   │   ├── ReportCard.tsx
│   │   │   │   ├── TransactionRow.css
│   │   │   │   └── TransactionRow.tsx
│   │   │   ├── onboarding/
│   │   │   │   ├── CompanySetup.tsx
│   │   │   │   ├── OnboardingWizard.css
│   │   │   │   └── OnboardingWizard.tsx
│   │   │   ├── payment/
│   │   │   │   ├── PricingCards.css
│   │   │   │   └── PricingCards.tsx
│   │   │   ├── quickbooks/
│   │   │   │   ├── QuickBooksConnect.css
│   │   │   │   └── QuickBooksConnect.tsx
│   │   │   ├── shared/
│   │   │   │   ├── NavBar.css
│   │   │   │   └── NavBar.tsx
│   │   │   ├── upload/
│   │   │   │   └── SpreadsheetUploader.tsx
│   │   │   ├── AIReconciliations.css
│   │   │   ├── ReconciliationCard.tsx
│   │   │   ├── ReconciliationWizard.css
│   │   │   └── ReconciliationWizard.tsx
│   │   ├── hooks/
│   │   │   ├── useBooks.ts
│   │   │   ├── useReconciliation.ts
│   │   │   └── useReports.ts
│   │   ├── layouts/
│   │   │   └── AppLayout.astro
│   │   ├── pages/
│   │   │   ├── clients.astro
│   │   │   ├── dashboard.astro
│   │   │   ├── onboarding.astro
│   │   │   ├── pricing.astro
│   │   │   ├── reconciliations.astro
│   │   │   ├── reports.astro
│   │   │   ├── settings.astro
│   │   │   └── signup.astro
│   │   ├── styles/
│   │   │   ├── bookkeeping.css
│   │   │   └── tables.css
│   │   ├── types/
│   │   │   ├── auth.ts
│   │   │   ├── banking.ts
│   │   │   ├── bookkeeping.ts
│   │   │   ├── index.ts
│   │   │   ├── invoice.ts
│   │   │   └── subscriptions.ts
│   │   ├── utils/
│   │   │   ├── dateUtils.ts
│   │   │   └── ledgerMath.ts
│   │   └── env.d.ts
│   ├── astro.config.mjs
│   ├── deploy.sh
│   ├── package-lock.json
│   ├── package.json
│   ├── README.md
│   ├── reorganize-project.ts
│   ├── setup-resources.sh
│   ├── tsconfig.json
│   └── wrangler.toml
├── insighthunter-lite/
│   ├── public/
│   │   ├── manifest.json
│   │   ├── sample-transactions.csv
│   │   └── sw.js
│   ├── src/
│   │   └── index.tsx
│   ├── index.html
│   ├── package-lock.json
│   ├── package.json
│   ├── requirements.txt
│   ├── tsconfig.json
│   ├── upload.html
│   └── wrangler.toml
├── insighthunter-main/
│   ├── functions/
│   │   └── api/
│   │       └── [[path]].js
│   ├── public/
│   │   ├── features/
│   │   │   ├── bizforma.html
│   │   │   ├── bookkeeping.html
│   │   │   ├── insight-lite.html
│   │   │   ├── insight-pro.html
│   │   │   ├── insight-standard.html
│   │   │   ├── pbx.html
│   │   │   ├── scout.html
│   │   │   └── website-services.html
│   │   ├── marketing/
│   │   │   ├── blog/
│   │   │   │   ├── index.html
│   │   │   │   └── post.html
│   │   │   ├── legal/
│   │   │   │   ├── marketing.js
│   │   │   │   ├── privacy.html
│   │   │   │   └── terms.html
│   │   │   ├── about.html
│   │   │   ├── contact.html
│   │   │   ├── faq.html
│   │   │   ├── index.html
│   │   │   ├── marketing.css
│   │   │   └── pricing.html
│   │   ├── about.html
│   │   ├── admin-compliance.html
│   │   ├── admin.html
│   │   ├── app.js
│   │   ├── bookkeeping.html
│   │   ├── checkout-success.html
│   │   ├── checkout.html
│   │   ├── clients.html
│   │   ├── cloudflare-pages.json
│   │   ├── compliance.html
│   │   ├── dashboard.html
│   │   ├── docs.html
│   │   ├── features.html
│   │   ├── index.html
│   │   ├── login.html
│   │   ├── my-account.html
│   │   ├── my-account.ts
│   │   ├── pricing.html
│   │   ├── reconciliation.html
│   │   ├── reports.html
│   │   ├── settings.html
│   │   ├── shop.html
│   │   ├── signup.html
│   │   ├── signup.js
│   │   ├── signup.ts
│   │   ├── styles.css
│   │   └── support.html
│   ├── src/
│   │   └── index.ts
│   ├── package-lock.json
│   ├── package.json
│   ├── robotts.txt
│   ├── sitemap.xml
│   └── wrangler.toml
├── insighthunter-marketing/
│   └── package.json
├── insighthunter-mobile/
│   ├── package.json
│   └── tsconfig.json
├── insighthunter-pbx/
│   ├── public/
│   │   └── index.html
│   ├── src/
│   │   ├── dashboard.html
│   │   └── index.ts
│   ├── .gitignore
│   ├── dashboard.html
│   ├── package.json
│   ├── README.md
│   ├── schema.sql
│   └── wrangler.toml
├── insighthunter-pro-services/
│   └── package.json
├── insighthunter-scout/
│   └── package.json
└── insighthunter-standard/
    └── package.json
