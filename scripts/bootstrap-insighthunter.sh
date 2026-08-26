#!/bin/bash

echo "Creating Insight Hunter Modules"

APPS=(
insighthunter-auth
insighthunter-dashboard
insighthunter-bookkeeping
insighthunter-bizforma
insighthunter-payroll
insighthunter-pbx
insighthunter-reports
insighthunter-insights
insighthunter-compliance
insighthunter-documents
insighthunter-admin
insighthunter-billing
)

for app in "${APPS[@]}"
do
  mkdir -p apps/$app/src
  mkdir -p apps/$app/public
done

PACKAGES=(
auth
billing
security
tenant
ai-cfo
reporting
forecasting
notifications
integrations
documents
)

for pkg in "${PACKAGES[@]}"
do
  mkdir -p packages/$pkg/src
done

mkdir -p infrastructure/cloudflare
mkdir -p docs

echo "Done"
