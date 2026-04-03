#!/usr/bin/env bash
# ============================================================
# InsightHunter Main — Full Project Scaffold
# Creates all dirs and blank files. Never overwrites existing.
# Usage: bash scaffold-insighthunter-main.sh [target-dir]
# ============================================================

set -euo pipefail

ROOT="${1:-apps/insighthunter-main}"

# ---------- helper: create file only if it doesn't exist ----
mkfile() {
  local f="$ROOT/$1"
  mkdir -p "$(dirname "$f")"
  [ -f "$f" ] || touch "$f"
}

echo "▶ Scaffolding insighthunter-main → $ROOT"

# ─── PAGES ───────────────────────────────────────────────────
mkfile "src/pages/index.astro"
mkfile "src/pages/pricing.astro"
mkfile "src/pages/about.astro"
mkfile "src/pages/contact.astro"
mkfile "src/pages/404.astro"

# features
mkfile "src/pages/features/index.astro"
mkfile "src/pages/features/bookkeeping.astro"
mkfile "src/pages/features/bizforma.astro"
mkfile "src/pages/features/insight-lite.astro"
mkfile "src/pages/features/insight-standard.astro"
mkfile "src/pages/features/insight-pro.astro"
mkfile "src/pages/features/scout.astro"
mkfile "src/pages/features/pbx.astro"
mkfile "src/pages/features/payroll.astro"
mkfile "src/pages/features/website-services.astro"

# dashboard
mkfile "src/pages/dashboard/index.astro"
mkfile "src/pages/dashboard/reports.astro"
mkfile "src/pages/dashboard/forecast.astro"
mkfile "src/pages/dashboard/bookkeeping.astro"
mkfile "src/pages/dashboard/bizforma.astro"
mkfile "src/pages/dashboard/insights.astro"
mkfile "src/pages/dashboard/pbx.astro"
mkfile "src/pages/dashboard/settings.astro"
mkfile "src/pages/dashboard/upgrade.astro"

# auth
mkfile "src/pages/auth/login.astro"
mkfile "src/pages/auth/register.astro"
mkfile "src/pages/auth/forgot-password.astro"
mkfile "src/pages/auth/callback.astro"

# ─── LAYOUTS ─────────────────────────────────────────────────
mkfile "src/layouts/MarketingLayout.astro"
mkfile "src/layouts/DashboardLayout.astro"
mkfile "src/layouts/AuthLayout.astro"

# ─── COMPONENTS — marketing ──────────────────────────────────
mkfile "src/components/marketing/Hero.astro"
mkfile "src/components/marketing/FeatureGrid.astro"
mkfile "src/components/marketing/PricingTable.astro"
mkfile "src/components/marketing/Testimonials.astro"
mkfile "src/components/marketing/CTABanner.astro"
mkfile "src/components/marketing/AppCard.astro"
mkfile "src/components/marketing/Nav.astro"

# ─── COMPONENTS — dashboard ──────────────────────────────────
mkfile "src/components/dashboard/Sidebar.svelte"
mkfile "src/components/dashboard/TopBar.svelte"
mkfile "src/components/dashboard/KPICard.svelte"
mkfile "src/components/dashboard/RevenueChart.svelte"
mkfile "src/components/dashboard/CashFlowChart.svelte"
mkfile "src/components/dashboard/InsightCard.svelte"
mkfile "src/components/dashboard/ActivityFeed.svelte"
mkfile "src/components/dashboard/QuickActions.svelte"

# ─── COMPONENTS — dashboard/pbx ──────────────────────────────
mkfile "src/components/dashboard/pbx/PBXShell.svelte"
mkfile "src/components/dashboard/pbx/Dialer.svelte"
mkfile "src/components/dashboard/pbx/ExtensionManager.svelte"
mkfile "src/components/dashboard/pbx/CallLogTable.svelte"
mkfile "src/components/dashboard/pbx/VoicemailInbox.svelte"
mkfile "src/components/dashboard/pbx/IVRBuilder.svelte"
mkfile "src/components/dashboard/pbx/PBXSettings.svelte"

# ─── COMPONENTS — auth ───────────────────────────────────────
mkfile "src/components/auth/LoginForm.svelte"
mkfile "src/components/auth/RegisterForm.svelte"
mkfile "src/components/auth/ForgotPasswordForm.svelte"

# ─── COMPONENTS — shared ─────────────────────────────────────
mkfile "src/components/shared/Button.astro"
mkfile "src/components/shared/Badge.astro"
mkfile "src/components/shared/Modal.svelte"
mkfile "src/components/shared/Toast.svelte"
mkfile "src/components/shared/Spinner.svelte"
mkfile "src/components/shared/EmptyState.astro"

# ─── DATA ────────────────────────────────────────────────────
mkfile "src/data/apps.ts"
mkfile "src/data/pricing.ts"
mkfile "src/data/features.ts"
mkfile "src/data/navigation.ts"

# ─── LIB ─────────────────────────────────────────────────────
mkfile "src/lib/auth.ts"
mkfile "src/lib/api.ts"
mkfile "src/lib/pbx-client.ts"
mkfile "src/lib/analytics.ts"
mkfile "src/lib/pwa.ts"

# ─── TYPES ───────────────────────────────────────────────────
mkfile "src/types/index.ts"
mkfile "src/types/auth.ts"
mkfile "src/types/apps.ts"
mkfile "src/types/api.ts"

# ─── STYLES ──────────────────────────────────────────────────
mkfile "src/styles/globals.scss"
mkfile "src/styles/theme.scss"
mkfile "src/styles/dashboard.scss"
mkfile "src/styles/marketing.scss"

# ─── MIDDLEWARE ──────────────────────────────────────────────
mkfile "src/middleware/index.ts"

# ─── PUBLIC ──────────────────────────────────────────────────
mkfile "public/favicon.ico"
mkfile "public/favicon.svg"
mkfile "public/logo.svg"
mkfile "public/manifest.webmanifest"

# PWA icons
for size in 72 96 128 144 152 192 384 512; do
  mkfile "public/icons/icon-${size}x${size}.png"
done

# Open Graph images
mkfile "public/og/home.png"
mkfile "public/og/pricing.png"
mkfile "public/og/pbx.png"
mkfile "public/og/bookkeeping.png"
mkfile "public/og/bizforma.png"
mkfile "public/og/dashboard.png"

mkfile "public/fonts/.gitkeep"

# ─── LEGACY STATIC FEATURE PAGES ─────────────────────────────
mkfile "features/bizforma.html"
mkfile "features/bookkeeping.html"
mkfile "features/insight-lite.html"
mkfile "features/insight-standard.html"
mkfile "features/insight-pro.html"
mkfile "features/pbx.html"
mkfile "features/scout.html"
mkfile "features/website-services.html"

# ─── CLOUDFLARE PAGES FUNCTIONS ──────────────────────────────
mkfile "functions/api/[[path]].ts"

# ─── SERVICE WORKER ──────────────────────────────────────────
mkfile "sw/sw.ts"
mkfile "sw/precache.ts"

# ─── TESTS ───────────────────────────────────────────────────
mkfile "tests/pages/index.test.ts"
mkfile "tests/pages/dashboard.test.ts"
mkfile "tests/lib/auth.test.ts"
mkfile "tests/fixtures/mockSession.ts"

# ─── ROOT CONFIG ─────────────────────────────────────────────
mkfile "astro.config.mjs"
mkfile "wrangler.jsonc"
mkfile "package.json"
mkfile "tsconfig.json"
mkfile "vite.config.ts"
mkfile "tailwind.config.ts"
mkfile "README.md"
mkfile ".env.example"
mkfile ".gitignore"

# ─── PBX WORKER (sibling app) ────────────────────────────────
PBX="${ROOT%insighthunter-main}insighthunter-pbx"
mkfile_pbx() {
  local f="$PBX/$1"
  mkdir -p "$(dirname "$f")"
  [ -f "$f" ] || touch "$f"
}

mkfile_pbx "src/index.ts"
mkfile_pbx "db/schema.sql"
mkfile_pbx "db/migrations/0001_init.sql"
mkfile_pbx "wrangler.jsonc"
mkfile_pbx "package.json"
mkfile_pbx "tsconfig.json"
mkfile_pbx "README.md"

# ─── SUMMARY ─────────────────────────────────────────────────
echo ""
echo "✅ Scaffold complete!"
echo ""
echo "── insighthunter-main ──────────────────────────────────"
find "$ROOT" -type f | sort | sed "s|$ROOT/||" | awk '{print "   " $0}'
echo ""
echo "── insighthunter-pbx ───────────────────────────────────"
find "$PBX" -type f 2>/dev/null | sort | sed "s|$PBX/||" | awk '{print "   " $0}'
echo ""
echo "Next steps:"
echo "  cd $ROOT && pnpm install"
echo "  cd ../insighthunter-pbx && pnpm install"
