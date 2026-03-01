#!/bin/bash
# ============================================================
# InsightHunter — Astro + Svelte Migration Scaffold
# Creates new structure WITHOUT modifying existing files
# Safe to run multiple times (skips existing files)
# ============================================================

set -e
ROOT=$(pwd)
BOLD="\033[1m"
GREEN="\033[0;32m"
YELLOW="\033[0;33m"
BLUE="\033[0;34m"
RESET="\033[0m"

log()   { echo -e "${GREEN}✅ $1${RESET}"; }
warn()  { echo -e "${YELLOW}⚠️  $1${RESET}"; }
info()  { echo -e "${BLUE}📁 $1${RESET}"; }
title() { echo -e "\n${BOLD}$1${RESET}"; }

# Safe file creator — never overwrites existing files
mkstub() {
  local file="$1"
  local content="$2"
  if [ -f "$file" ]; then
    warn "EXISTS (skipped): $file"
  else
    mkdir -p "$(dirname "$file")"
    echo "$content" > "$file"
    log "Created: $file"
  fi
}

mkdironly() {
  mkdir -p "$1"
  info "Dir ready: $1"
}

# ============================================================
title "🚀 PHASE 1: insighthunter-main (21 pages → Astro + Svelte)"
# ============================================================

MAIN="$ROOT/apps/insighthunter-main"

# Config files
mkstub "$MAIN/astro.config.mjs" \
"import { defineConfig } from 'astro/config';
import cloudflare from '@astrojs/cloudflare';
import svelte from '@astrojs/svelte';

export default defineConfig({
  output: 'server',
  adapter: cloudflare({ platformProxy: { enabled: true } }),
  integrations: [svelte()]
});"

mkstub "$MAIN/svelte.config.js" \
"import { vitePreprocess } from '@astrojs/svelte';
export default { preprocess: vitePreprocess() };"

mkstub "$MAIN/tsconfig.json" \
'{
  "extends": "astro/tsconfigs/strict",
  "compilerOptions": {
    "baseUrl": ".",
    "paths": { "@/*": ["src/*"] }
  }
}'

mkstub "$MAIN/public/.assetsignore" \
"_worker.js
_worker.js.map"

# Styles
mkstub "$MAIN/src/styles/styles.css"         "/* Global styles — migrated from public/styles.css */"
mkstub "$MAIN/src/styles/marketing.css"      "/* Marketing styles — migrated from public/marketing/marketing.css */"
mkstub "$MAIN/src/styles/dashboard.css"      "/* Dashboard-specific style overrides */"

# env.d.ts
mkstub "$MAIN/src/env.d.ts" \
'/// <reference path="../.astro/types.d.ts" />
/// <reference types="astro/client" />
type Runtime = import("@astrojs/cloudflare").Runtime<Env>;
declare namespace App {
  interface Locals extends Runtime {}
}'

# Layouts
mkstub "$MAIN/src/layouts/Layout.astro" \
"---
import '../styles/styles.css';
const { title } = Astro.props;
---
<!DOCTYPE html>
<html lang=\"en\">
<head>
  <meta charset=\"UTF-8\" />
  <meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\" />
  <title>{title} – InsightHunter</title>
</head>
<body>
  <slot />
</body>
</html>"

mkstub "$MAIN/src/layouts/DashboardLayout.astro" \
"---
import Layout from './Layout.astro';
import '../styles/dashboard.css';
const { title } = Astro.props;
---
<Layout title={title}>
  <slot />
</Layout>"

mkstub "$MAIN/src/layouts/MarketingLayout.astro" \
"---
import Layout from './Layout.astro';
import '../styles/marketing.css';
const { title } = Astro.props;
---
<Layout title={title}>
  <slot />
</Layout>"

# ── Static Astro pages (root) ──────────────────────────────
title "  → Root pages"
for page in index about features pricing docs support; do
  mkstub "$MAIN/src/pages/${page}.astro" \
"---
import Layout from '../layouts/Layout.astro';
// TODO: migrate content from public/${page}.html
---
<Layout title=\"${page^}\">
  <!-- STUB: migrate from public/${page}.html -->
</Layout>"
done

# ── Auth pages ─────────────────────────────────────────────
title "  → Auth pages"
for page in login signup logout; do
  mkstub "$MAIN/src/pages/auth/${page}.astro" \
"---
import Layout from '../../layouts/Layout.astro';
// TODO: migrate from public/${page}.html
---
<Layout title=\"${page^}\">
  <!-- STUB: migrate from public/${page}.html -->
</Layout>"
done

# ── Dashboard pages ────────────────────────────────────────
title "  → Dashboard pages"
for page in index bookkeeping clients compliance reconciliation reports settings; do
  mkstub "$MAIN/src/pages/dashboard/${page}.astro" \
"---
import DashboardLayout from '../../layouts/DashboardLayout.astro';
// TODO: migrate from public/${page}.html
---
<DashboardLayout title=\"${page^}\">
  <!-- STUB: migrate from public/${page}.html -->
</DashboardLayout>"
done

# ── Admin pages ────────────────────────────────────────────
title "  → Admin pages"
for page in index compliance; do
  mkstub "$MAIN/src/pages/admin/${page}.astro" \
"---
import DashboardLayout from '../../layouts/DashboardLayout.astro';
---
<DashboardLayout title=\"Admin\">
  <!-- STUB -->
</DashboardLayout>"
done

# ── Account pages ──────────────────────────────────────────
title "  → Account pages"
for page in index billing; do
  mkstub "$MAIN/src/pages/account/${page}.astro" \
"---
import DashboardLayout from '../../layouts/DashboardLayout.astro';
---
<DashboardLayout title=\"Account\">
  <!-- STUB: migrate from public/my-account.html -->
</DashboardLayout>"
done

# ── Shop pages ─────────────────────────────────────────────
title "  → Shop pages"
for page in index checkout success; do
  mkstub "$MAIN/src/pages/shop/${page}.astro" \
"---
import Layout from '../../layouts/Layout.astro';
---
<Layout title=\"Shop\">
  <!-- STUB -->
</Layout>"
done

# ── Feature sub-pages ──────────────────────────────────────
title "  → Feature sub-pages"
for page in bizforma bookkeeping insight-lite insight-pro insight-standard pbx scout website-services; do
  mkstub "$MAIN/src/pages/features/${page}.astro" \
"---
import MarketingLayout from '../../layouts/MarketingLayout.astro';
// TODO: migrate from public/features/${page}.html
---
<MarketingLayout title=\"${page^}\">
  <!-- STUB: migrate from public/features/${page}.html -->
</MarketingLayout>"
done

# ── Marketing sub-pages ────────────────────────────────────
title "  → Marketing sub-pages"
for page in index about contact faq pricing; do
  mkstub "$MAIN/src/pages/marketing/${page}.astro" \
"---
import MarketingLayout from '../../layouts/MarketingLayout.astro';
---
<MarketingLayout title=\"${page^}\">
  <!-- STUB: migrate from public/marketing/${page}.html -->
</MarketingLayout>"
done

mkstub "$MAIN/src/pages/marketing/blog/index.astro" \
"---
import MarketingLayout from '../../../layouts/MarketingLayout.astro';
---
<MarketingLayout title=\"Blog\">
  <!-- STUB -->
</MarketingLayout>"

mkstub "$MAIN/src/pages/marketing/blog/[slug].astro" \
"---
import MarketingLayout from '../../../layouts/MarketingLayout.astro';
const { slug } = Astro.params;
---
<MarketingLayout title=\"Post\">
  <!-- STUB: dynamic blog route (was post.html) -->
</MarketingLayout>"

mkstub "$MAIN/src/pages/marketing/legal/privacy.astro" \
"---
import MarketingLayout from '../../../layouts/MarketingLayout.astro';
---
<MarketingLayout title=\"Privacy Policy\">
  <!-- STUB: migrate from public/marketing/legal/privacy.html -->
</MarketingLayout>"

mkstub "$MAIN/src/pages/marketing/legal/terms.astro" \
"---
import MarketingLayout from '../../../layouts/MarketingLayout.astro';
---
<MarketingLayout title=\"Terms of Service\">
  <!-- STUB: migrate from public/marketing/legal/terms.html -->
</MarketingLayout>"

# ── API endpoints ──────────────────────────────────────────
title "  → API endpoints"
for ep in revenue reports; do
  mkstub "$MAIN/src/pages/api/${ep}.ts" \
"import type { APIRoute } from 'astro';
// TODO: implement ${ep} endpoint
export const GET: APIRoute = async ({ locals }) => {
  // const db = locals.runtime.env.DB;
  return new Response(JSON.stringify({ stub: true }), {
    headers: { 'Content-Type': 'application/json' }
  });
};"
done

for ep in signup login logout; do
  mkstub "$MAIN/src/pages/api/auth/${ep}.ts" \
"import type { APIRoute } from 'astro';
// TODO: proxy to insighthunter-auth Worker
export const POST: APIRoute = async ({ request }) => {
  return new Response(JSON.stringify({ stub: true }), {
    headers: { 'Content-Type': 'application/json' }
  });
};"
done

for ep in connect callback; do
  mkstub "$MAIN/src/pages/api/quickbooks/${ep}.ts" \
"import type { APIRoute } from 'astro';
// TODO: QuickBooks OAuth ${ep}
export const GET: APIRoute = async ({ request }) => {
  return new Response(JSON.stringify({ stub: true }), {
    headers: { 'Content-Type': 'application/json' }
  });
};"
done

# ── Static Astro UI components ─────────────────────────────
title "  → Static UI components"
for comp in Nav Footer Hero PricingCard FeatureCard; do
  mkstub "$MAIN/src/components/ui/${comp}.astro" \
"---
// ${comp} static component
---
<!-- STUB: ${comp} -->"
done

# ── Svelte island components ───────────────────────────────
title "  → Svelte islands"

mkstub "$MAIN/src/components/islands/auth/SignupForm.svelte" \
"<script lang=\"ts\">
  // TODO: migrate from public/signup.js + signup.ts
  let email = '';
  let password = '';
</script>
<!-- STUB: SignupForm island -->"

mkstub "$MAIN/src/components/islands/auth/LoginForm.svelte" \
"<script lang=\"ts\">
  let email = '';
  let password = '';
</script>
<!-- STUB: LoginForm island -->"

for comp in RevenueChart CashFlowChart ForecastWidget TransactionTable; do
  mkstub "$MAIN/src/components/islands/dashboard/${comp}.svelte" \
"<script lang=\"ts\">
  // TODO: implement ${comp}
</script>
<!-- STUB: ${comp} island -->"
done

for comp in PlanSelector StripeCheckout; do
  mkstub "$MAIN/src/components/islands/shop/${comp}.svelte" \
"<script lang=\"ts\">
  // TODO: implement ${comp}
</script>
<!-- STUB: ${comp} island -->"
done

for comp in Notification LoadingSpinner; do
  mkstub "$MAIN/src/components/islands/shared/${comp}.svelte" \
"<script lang=\"ts\">
  // TODO: implement ${comp}
</script>
<!-- STUB: ${comp} island -->"
done


# ============================================================
title "🚀 PHASE 2: insighthunter-bookkeeping (TSX → Svelte)"
# ============================================================

BK="$ROOT/apps/insighthunter-bookkeeping"

# Svelte stores (replacing React hooks)
mkstub "$BK/src/hooks/books.store.ts"          "// TODO: migrate from useBooks.ts → Svelte store"
mkstub "$BK/src/hooks/reconciliation.store.ts" "// TODO: migrate from useReconciliation.ts → Svelte store"
mkstub "$BK/src/hooks/reports.store.ts"        "// TODO: migrate from useReports.ts → Svelte store"

# Svelte component stubs (TSX counterparts exist — do NOT delete them yet)
for comp in SignupForm; do
  mkstub "$BK/src/components/auth/${comp}.svelte"          "<script lang=\"ts\">// TODO: migrate from ${comp}.tsx\n</script>"
done
mkstub "$BK/src/components/banking/PlaidLink.svelte"       "<script lang=\"ts\">// TODO: migrate from PlaidLink.tsx\n</script>"

for comp in AccountSelector AIReconciliation BudgetTracker InsightsPanel InvoiceManager LedgerTable MetricsDashboard ReportCard TransactionRow; do
  mkstub "$BK/src/components/bookkeeping/${comp}.svelte"   "<script lang=\"ts\">// TODO: migrate from ${comp}.tsx + ${comp}.css\n</script>"
done

for comp in CompanySetup OnboardingWizard; do
  mkstub "$BK/src/components/onboarding/${comp}.svelte"    "<script lang=\"ts\">// TODO: migrate from ${comp}.tsx\n</script>"
done

mkstub "$BK/src/components/payment/PricingCards.svelte"    "<script lang=\"ts\">// TODO: migrate from PricingCards.tsx\n</script>"
mkstub "$BK/src/components/quickbooks/QuickBooksConnect.svelte" "<script lang=\"ts\">// TODO: migrate from QuickBooksConnect.tsx\n</script>"
mkstub "$BK/src/components/shared/NavBar.svelte"           "<script lang=\"ts\">// TODO: migrate from NavBar.tsx\n</script>"
mkstub "$BK/src/components/upload/SpreadsheetUploader.svelte" "<script lang=\"ts\">// TODO: migrate from SpreadsheetUploader.tsx\n</script>"
mkstub "$BK/src/components/ReconciliationCard.svelte"      "<script lang=\"ts\">// TODO: migrate from ReconciliationCard.tsx\n</script>"
mkstub "$BK/src/components/ReconciliationWizard.svelte"    "<script lang=\"ts\">// TODO: migrate from ReconciliationWizard.tsx\n</script>"


# ============================================================
title "🚀 PHASE 3: insighthunter-lite (index.tsx → Astro + Svelte)"
# ============================================================

LITE="$ROOT/apps/insighthunter-lite"

mkstub "$LITE/astro.config.mjs" \
"import { defineConfig } from 'astro/config';
import cloudflare from '@astrojs/cloudflare';
import svelte from '@astrojs/svelte';
export default defineConfig({
  output: 'server',
  adapter: cloudflare({ platformProxy: { enabled: true } }),
  integrations: [svelte()]
});"

mkstub "$LITE/src/pages/index.astro" \
"---
// TODO: migrate from index.html + src/index.tsx
---
<!DOCTYPE html>
<html lang=\"en\"><head><meta charset=\"UTF-8\" /></head>
<body><!-- STUB --></body></html>"

mkstub "$LITE/src/pages/upload.astro" \
"---
// TODO: migrate from upload.html
---
<!DOCTYPE html>
<html lang=\"en\"><head><meta charset=\"UTF-8\" /></head>
<body><!-- STUB --></body></html>"

mkstub "$LITE/src/components/islands/CSVUploader.svelte" \
"<script lang=\"ts\">
  // TODO: migrate core logic from src/index.tsx
</script>
<!-- STUB: CSV uploader island -->"


# ============================================================
title "🚀 PHASE 4: insighthunter-pbx (HTML → Astro)"
# ============================================================

PBX="$ROOT/apps/insighthunter-pbx"

mkstub "$PBX/astro.config.mjs" \
"import { defineConfig } from 'astro/config';
import cloudflare from '@astrojs/cloudflare';
export default defineConfig({
  output: 'server',
  adapter: cloudflare({ platformProxy: { enabled: true } }),
});"

mkstub "$PBX/src/pages/index.astro" \
"---
// TODO: migrate from public/index.html
---
<!DOCTYPE html>
<html lang=\"en\"><head><meta charset=\"UTF-8\" /></head>
<body><!-- STUB --></body></html>"

mkstub "$PBX/src/pages/dashboard.astro" \
"---
// TODO: migrate from src/dashboard.html
---
<!DOCTYPE html>
<html lang=\"en\"><head><meta charset=\"UTF-8\" /></head>
<body><!-- STUB --></body></html>"

mkstub "$PBX/src/backend/index.ts" \
"// TODO: migrate from src/index.ts"


# ============================================================
title "🚀 PHASE 5: Shared packages"
# ============================================================

PKG="$ROOT/packages"

mkstub "$PKG/types/package.json" \
'{
  "name": "@insighthunter/types",
  "version": "0.0.1",
  "main": "src/index.ts",
  "types": "src/index.ts"
}'

for type in user bookkeeping invoice banking subscriptions; do
  mkstub "$PKG/types/src/${type}.ts" "// TODO: migrate from apps/insighthunter-bookkeeping/src/types/${type}.ts"
done

mkstub "$PKG/types/src/index.ts" \
"export * from './user';
export * from './bookkeeping';
export * from './invoice';
export * from './banking';
export * from './subscriptions';"

mkstub "$PKG/utils/package.json" \
'{
  "name": "@insighthunter/utils",
  "version": "0.0.1",
  "main": "src/index.ts",
  "types": "src/index.ts"
}'

mkstub "$PKG/utils/src/formatCurrency.ts" "// Shared currency formatter"
mkstub "$PKG/utils/src/dateUtils.ts"      "// TODO: migrate from apps/insighthunter-bookkeeping/src/utils/dateUtils.ts"
mkstub "$PKG/utils/src/ledgerMath.ts"     "// TODO: migrate from apps/insighthunter-bookkeeping/src/utils/ledgerMath.ts"
mkstub "$PKG/utils/src/index.ts" \
"export * from './formatCurrency';
export * from './dateUtils';
export * from './ledgerMath';"


# ============================================================
title "🚀 PHASE 6: Root workspace config"
# ============================================================

mkstub "$ROOT/package.json" \
'{
  "name": "insighthunter",
  "private": true,
  "workspaces": [
    "apps/*",
    "packages/*"
  ],
  "scripts": {
    "dev:main":          "cd apps/insighthunter-main && npx wrangler dev",
    "dev:bookkeeping":   "cd apps/insighthunter-bookkeeping && npx wrangler dev",
    "dev:auth":          "cd apps/insighthunter-auth && npx wrangler dev",
    "dev:lite":          "cd apps/insighthunter-lite && npx wrangler dev",
    "build:main":        "cd apps/insighthunter-main && npm run build",
    "build:bookkeeping": "cd apps/insighthunter-bookkeeping && npm run build",
    "deploy:main":       "cd apps/insighthunter-main && npx wrangler deploy",
    "deploy:bookkeeping":"cd apps/insighthunter-bookkeeping && npx wrangler deploy",
    "deploy:auth":       "cd apps/insighthunter-auth && npx wrangler deploy",
    "deploy:all":        "npm run deploy:auth && npm run deploy:main && npm run deploy:bookkeeping"
  }
}'

mkstub "$ROOT/scripts/inject-styles.py" \
"# Run this to inject styles.css link into any remaining raw HTML files
import os, re

HTML_DIR = './apps/insighthunter-main/public'
LINK_TAG = '<link rel=\"stylesheet\" href=\"/styles.css\">'

for root, dirs, files in os.walk(HTML_DIR):
    dirs[:] = [d for d in dirs if d not in ['node_modules', '.git']]
    for f in files:
        if not f.endswith('.html'):
            continue
        path = os.path.join(root, f)
        with open(path, 'r') as fh:
            content = fh.read()
        if 'styles.css' in content:
            print(f'SKIP: {path}')
            continue
        updated = re.sub(r'(</head>)', f'  {LINK_TAG}\n\\1', content, count=1, flags=re.IGNORECASE)
        with open(path, 'w') as fh:
            fh.write(updated)
        print(f'INJECTED: {path}')"

mkstub "$ROOT/scripts/migrate-html.sh" \
'#!/bin/bash
# Converts a raw .html file to a .astro stub
# Usage: ./scripts/migrate-html.sh public/dashboard.html
FILE=$1
DEST="${FILE%.html}.astro"
echo "---" > "$DEST"
echo "// TODO: migrated from $FILE" >> "$DEST"
echo "---" >> "$DEST"
cat "$FILE" >> "$DEST"
echo "Stub created: $DEST"'

chmod +x "$ROOT/scripts/migrate-html.sh"


# ============================================================
echo ""
echo -e "${BOLD}============================================${RESET}"
echo -e "${GREEN}✅ Scaffold complete! Summary:${RESET}"
echo -e "${BOLD}============================================${RESET}"
echo ""
echo "📦 insighthunter-main   → Astro + Svelte scaffold ready"
echo "📦 insighthunter-bookkeeping → Svelte stubs created"
echo "📦 insighthunter-lite   → Astro + Svelte scaffold ready"
echo "📦 insighthunter-pbx    → Astro scaffold ready"
echo "📦 packages/types       → Shared types scaffold ready"
echo "📦 packages/utils       → Shared utils scaffold ready"
echo ""
echo -e "${YELLOW}⚠️  NOTHING was deleted or modified.${RESET}"
echo -e "${YELLOW}   Your live site continues to run from public/*.html${RESET}"
echo ""
echo "Next steps:"
echo "  1. cd apps/insighthunter-main && npm install @astrojs/cloudflare @astrojs/svelte astro svelte"
echo "  2. Copy content from public/*.html into matching src/pages/*.astro stubs"
echo "  3. npx wrangler dev  ← test locally"
echo "  4. npx wrangler deploy ← go live when ready"
echo ""
