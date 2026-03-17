#!/usr/bin/env bash
# ============================================================
# insight-hunter scaffold script
# Run from your desired parent directory:  bash scaffold.sh
# ============================================================
set -euo pipefail

ROOT="insight-hunter"

# ── helpers ─────────────────────────────────────────────────
mkf() { mkdir -p "$(dirname "$1")"; touch "$1"; }
html() {
  local file="$1" title="$2"
  mkdir -p "$(dirname "$file")"
  cat > "$file" <<HTML
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${title} · Insight Hunter</title>
  <link rel="stylesheet" href="/assets/css/global.css" />
</head>
<body>
  <!-- ${title} -->
  <script src="/assets/js/utils.js"></script>
</body>
</html>
HTML
}

worker() {
  local dir="$1" route="$2"
  mkdir -p "${dir}/src"

  cat > "${dir}/src/index.ts" <<TS
import { Hono } from 'hono'
import { cors } from 'hono/cors'

interface Env {
  // Add bindings here
}

const app = new Hono<{ Bindings: Env }>()
app.use('*', cors())

// TODO: implement ${route} routes
app.get('/', (c) => c.json({ service: '${route}', status: 'ok' }))

export default app
TS

  cat > "${dir}/wrangler.jsonc" <<JSONC
{
  "name": "$(basename "$dir")",
  "main": "src/index.ts",
  "compatibility_date": "2025-03-07",
  "compatibility_flags": ["nodejs_compat"],
  "observability": {
    "enabled": true,
    "head_sampling_rate": 1
  }
  // TODO: add bindings (KV, D1, R2, Queues, etc.)
}
JSONC

  cat > "${dir}/package.json" <<PKG
{
  "name": "$(basename "$dir")",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev":    "wrangler dev",
    "deploy": "wrangler deploy",
    "lint":   "tsc --noEmit"
  },
  "dependencies": {
    "hono": "^4.4.0"
  },
  "devDependencies": {
    "@cloudflare/workers-types": "^4.20250307.0",
    "typescript": "^5.4.5",
    "wrangler": "^3.57.0"
  }
}
PKG

  cat > "${dir}/tsconfig.json" <<TSC
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ES2022",
    "moduleResolution": "bundler",
    "lib": ["ES2022"],
    "types": ["@cloudflare/workers-types"],
    "strict": true,
    "noEmit": true
  },
  "include": ["src/**/*.ts"]
}
TSC
}

# ════════════════════════════════════════════════════════════
# PUBLIC (Cloudflare Pages)
# ════════════════════════════════════════════════════════════

# ── root pages ───────────────────────────────────────────────
html "${ROOT}/public/index.html"           "Home"
html "${ROOT}/public/pricing.html"         "Pricing"
html "${ROOT}/public/about.html"           "About"
html "${ROOT}/public/contact.html"         "Contact"
html "${ROOT}/public/404.html"             "Page Not Found"

# ── features/ ────────────────────────────────────────────────
html "${ROOT}/public/features/index.html"       "Features"
html "${ROOT}/public/features/bizforma.html"    "BizForma"
html "${ROOT}/public/features/bookkeeping.html" "Bookkeeping"

# ── auth/ ─────────────────────────────────────────────────────
html "${ROOT}/public/auth/login.html"           "Log In"
html "${ROOT}/public/auth/register.html"        "Register"
html "${ROOT}/public/auth/forgot-password.html" "Forgot Password"
html "${ROOT}/public/auth/callback.html"        "Auth Callback"

# ── dashboard/ ────────────────────────────────────────────────
html "${ROOT}/public/dashboard/index.html"       "Dashboard"
html "${ROOT}/public/dashboard/bizforma.html"    "BizForma"
html "${ROOT}/public/dashboard/bookkeeping.html" "Bookkeeping"
html "${ROOT}/public/dashboard/reports.html"     "Reports"
html "${ROOT}/public/dashboard/forecast.html"    "Forecast"
html "${ROOT}/public/dashboard/insights.html"    "Insights"
html "${ROOT}/public/dashboard/payroll.html"     "Payroll"
html "${ROOT}/public/dashboard/pbx.html"         "PBX"
html "${ROOT}/public/dashboard/settings.html"    "Settings"
html "${ROOT}/public/dashboard/upgrade.html"     "Upgrade"

# ── legal/ ────────────────────────────────────────────────────
html "${ROOT}/public/legal/privacy.html"   "Privacy Policy"
html "${ROOT}/public/legal/terms.html"     "Terms of Service"
html "${ROOT}/public/legal/sms-optin.html" "SMS Opt-In"

# ── assets/ ───────────────────────────────────────────────────
# CSS
for f in global dashboard marketing; do
  mkf "${ROOT}/public/assets/css/${f}.css"
done

# JS
for f in api auth utils; do
  mkf "${ROOT}/public/assets/js/${f}.js"
done

# img placeholders
for f in logo favicon og-image; do
  mkf "${ROOT}/public/assets/img/${f}.png"
done
mkdir -p "${ROOT}/public/assets/img/icons"

# ════════════════════════════════════════════════════════════
# APPS (Cloudflare Workers)
# ════════════════════════════════════════════════════════════
worker "${ROOT}/apps/insighthunter-auth"        "/api/auth"
worker "${ROOT}/apps/insighthunter-bizforma"    "/api/bizforma"
worker "${ROOT}/apps/insighthunter-pbx"         "/api/pbx"
worker "${ROOT}/apps/insighthunter-payroll"     "/api/payroll"
worker "${ROOT}/apps/insighthunter-bookkeeping" "/api/bookkeeping"
worker "${ROOT}/apps/insighthunter-ai"          "/api/ai"
worker "${ROOT}/apps/insighthunter-reports"     "/api/reports"

# ════════════════════════════════════════════════════════════
# DOCS
# ════════════════════════════════════════════════════════════
mkdir -p "${ROOT}/docs"
cat > "${ROOT}/docs/README.md" <<MD
# Insight Hunter — Docs

| Area | Notes |
|------|-------|
| public/ | Static site deployed to Cloudflare Pages |
| apps/   | Individual Cloudflare Workers per service |
MD

# ════════════════════════════════════════════════════════════
# GITHUB WORKFLOWS
# ════════════════════════════════════════════════════════════
mkdir -p "${ROOT}/.github/workflows"

cat > "${ROOT}/.github/workflows/deploy-pages.yml" <<YML
name: Deploy Pages
on:
  push:
    branches: [main]
    paths: ["public/**"]
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Publish to Cloudflare Pages
        uses: cloudflare/pages-action@v1
        with:
          apiToken: \${{ secrets.CF_API_TOKEN }}
          accountId: \${{ secrets.CF_ACCOUNT_ID }}
          projectName: insight-hunter
          directory: public
YML

cat > "${ROOT}/.github/workflows/deploy-workers.yml" <<YML
name: Deploy Workers
on:
  push:
    branches: [main]
    paths: ["apps/**"]
jobs:
  deploy:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        app:
          - insighthunter-auth
          - insighthunter-bizforma
          - insighthunter-pbx
          - insighthunter-payroll
          - insighthunter-bookkeeping
          - insighthunter-ai
          - insighthunter-reports
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - name: Deploy \${{ matrix.app }}
        working-directory: apps/\${{ matrix.app }}
        run: |
          npm ci
          npx wrangler deploy
        env:
          CLOUDFLARE_API_TOKEN: \${{ secrets.CF_API_TOKEN }}
          CLOUDFLARE_ACCOUNT_ID: \${{ secrets.CF_ACCOUNT_ID }}
YML

# ════════════════════════════════════════════════════════════
# ROOT FILES
# ════════════════════════════════════════════════════════════
cat > "${ROOT}/.gitignore" <<GIT
node_modules/
dist/
.wrangler/
*.env
.env.local
GIT

cat > "${ROOT}/README.md" <<MD
# Insight Hunter

## Structure
\`\`\`
public/   → Cloudflare Pages  (static HTML/CSS/JS)
apps/     → Cloudflare Workers (API services)
docs/     → Documentation
\`\`\`

## Quick Start
\`\`\`bash
# Deploy pages
# Push to main — GitHub Actions handles it

# Run a worker locally
cd apps/insighthunter-auth
npm install
npm run dev
\`\`\`
MD

# ── done ─────────────────────────────────────────────────────
echo ""
echo "✅  insight-hunter scaffold created successfully!"
echo ""
find "${ROOT}" | sort | sed 's|[^/]*/|  |g'
