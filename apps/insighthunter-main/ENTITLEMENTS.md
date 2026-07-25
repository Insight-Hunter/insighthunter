# Entitlements bundle

## Features by plan

- starter: app.bizforma, documents.vault, compliance.calendar
- growth: starter + ai.advisor, forms.lego, dashboard.advanced
- pro: growth + payroll.workspace

## Apply schema

'''bash
cd apps/insighthunter-main
wrangler d1 execute insighthunter_main --file=schema.sql
