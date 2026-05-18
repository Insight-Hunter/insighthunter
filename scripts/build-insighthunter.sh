#!/usr/bin/env bash
set -euo pipefail

ROOT="${1:-insighthunter}"
mkdir -p "$ROOT"
cd "$ROOT"

mkdir -p apps/{insighthunter-main,insighthunter-auth,insighthunter-bizforma,insighthunter-payroll,insighthunter-pbx,insighthunter-bookkeeping,insighthunter-report,insighthunter-scout,insighthunter-whitelabel,ih-platform-worker,ih-tenant-template}
mkdir -p packages/{ih-auth-client,ih-ui,ih-types,ih-db}

cat > package.json <<'JSON'
{
  "name": "insighthunter",
  "private": true,
  "type": "module",
  "workspaces": ["apps/*", "packages/*"],
  "scripts": {
    "build": "turbo run build",
    "dev": "turbo run dev --parallel",
    "lint": "turbo run lint",
    "deploy:main": "cd apps/insighthunter-main && npm run deploy",
    "deploy:auth": "cd apps/insighthunter-auth && npx wrangler deploy",
    "deploy:bizforma": "cd apps/insighthunter-bizforma && npx wrangler deploy",
    "deploy:payroll": "cd apps/insighthunter-payroll && npx wrangler deploy",
    "deploy:pbx": "cd apps/insighthunter-pbx && npx wrangler deploy",
    "deploy:bookkeeping": "cd apps/insighthunter-bookkeeping && npx wrangler deploy",
    "deploy:report": "cd apps/insighthunter-report && npx wrangler deploy",
    "deploy:scout": "cd apps/insighthunter-scout && npx wrangler deploy",
    "deploy:whitelabel": "cd apps/insighthunter-whitelabel && npx wrangler deploy",
    "deploy:platform": "cd apps/ih-platform-worker && npx wrangler deploy",
    "deploy:tenant-template": "cd apps/ih-tenant-template && npx wrangler deploy"
  },
  "devDependencies": {
    "turbo": "^2.0.0",
    "typescript": "^5.4.0"
  }
}
JSON

cat > turbo.json <<'JSON'
{
  "$schema": "https://turbo.build/schema.json",
  "tasks": {
    "build": { "dependsOn": ["^build"], "outputs": ["dist/**"] },
    "dev": { "cache": false, "persistent": true },
    "lint": { "dependsOn": ["^lint"] }
  }
}
JSON

cat > .gitignore <<'EOF2'
node_modules
.dist
.wrangler
.env
EOF2

# Shared package scaffolds
for pkg in ih-auth-client ih-ui ih-types ih-db; do
  mkdir -p "packages/$pkg/src"
  cat > "packages/$pkg/package.json" <<JSON
{
  "name": "@ih/$pkg",
  "private": true,
  "version": "0.1.0",
  "type": "module",
  "main": "src/index.ts"
}
JSON
  cat > "packages/$pkg/src/index.ts" <<EOF2
export const packageName = '${pkg}';
EOF2
done

# Common page generator helper
make_worker_app () {
  local appdir="$1"
  local workername="$2"
  local routehost="$3"
  mkdir -p "$appdir/src/api" "$appdir/src/types" "$appdir/src/db/migrations"
  cat > "$appdir/package.json" <<JSON
{
  "name": "@ih/${workername}",
  "private": true,
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "dev": "wrangler dev",
    "build": "echo build complete",
    "deploy": "wrangler deploy"
  },
  "dependencies": {
    "hono": "^4.3.0",
    "zod": "^3.23.0",
    "@hono/zod-validator": "^0.2.2"
  }
}
JSON
  cat > "$appdir/tsconfig.json" <<'JSON'
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "strict": true,
    "types": ["@cloudflare/workers-types"]
  }
}
JSON
  cat > "$appdir/wrangler.toml" <<EOF2
name = "${workername}"
main = "src/worker.ts"
compatibility_date = "2025-04-01"

[observability]
enabled = true

routes = [{ pattern = "${routehost}/*", zone_name = "insighthunter.app" }]
EOF2
  cat > "$appdir/src/types/env.ts" <<'EOF2'
export interface Env {
  JWT_SECRET: string;
}
EOF2
  cat > "$appdir/src/worker.ts" <<'EOF2'
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import type { Env } from './types/env';

const app = new Hono<{ Bindings: Env }>();

app.use('*', cors({
  origin: ['https://insighthunter.app'],
  allowHeaders: ['Content-Type', 'Authorization', 'Cookie'],
  allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  credentials: true,
}));

app.get('/health', (c) => c.json({ status: 'ok' }));
app.get('/', (c) => c.json({ app: 'ready' }));

export default app;
EOF2
  cat > "$appdir/src/db/migrations/0001_init.sql" <<'EOF2'
-- org_id first on every tenant-scoped table
CREATE TABLE IF NOT EXISTS records (
  org_id TEXT NOT NULL,
  id TEXT NOT NULL,
  name TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (org_id, id)
);
EOF2
}

# Main Astro site
mkdir -p apps/insighthunter-main/src/{pages/{dashboard,auth,features},layouts,components/{marketing,dashboard},data,middleware}
cat > apps/insighthunter-main/package.json <<'JSON'
{
  "name": "insighthunter-main",
  "private": true,
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "dev": "astro dev",
    "build": "astro build",
    "deploy": "wrangler pages deploy dist --project-name ih-main"
  },
  "dependencies": {
    "astro": "^4.8.0",
    "@astrojs/cloudflare": "^11.0.0",
    "@astrojs/svelte": "^5.0.0",
    "svelte": "^5.0.0"
  }
}
JSON
cat > apps/insighthunter-main/astro.config.mjs <<'EOF2'
import { defineConfig } from 'astro/config';
import cloudflare from '@astrojs/cloudflare';
import svelte from '@astrojs/svelte';

export default defineConfig({
  output: 'server',
  adapter: cloudflare({ mode: 'directory' }),
  integrations: [svelte()]
});
EOF2
cat > apps/insighthunter-main/wrangler.toml <<'EOF2'
name = "ih-main"
compatibility_date = "2025-04-01"
pages_build_output_dir = "dist"

[observability]
enabled = true
EOF2
cat > apps/insighthunter-main/src/layouts/MarketingLayout.astro <<'EOF2'
---
const { title = 'Insight Hunter' } = Astro.props;
---
<!doctype html>
<html lang="en" data-theme="dark">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>{title}</title>
    <link rel="preconnect" href="https://api.fontshare.com" />
    <link href="https://api.fontshare.com/v2/css?f[]=general-sans@700,500&f[]=satoshi@400,500&display=swap" rel="stylesheet" />
    <style>
      :root{--bg:#0d0d0d;--bg-navy:#141522;--surface:#141414;--surface2:#1a1a1a;--card:#1c1b19;--gold:#C9A84C;--white:#fff;--muted:#999;--r:16px;--font-display:'General Sans','Inter',sans-serif;--font-body:'Satoshi','Inter',sans-serif}
      *{box-sizing:border-box;margin:0;padding:0}body{font-family:var(--font-body);background:var(--bg);color:var(--white)}a{text-decoration:none;color:inherit}.container{max-width:1200px;margin:0 auto;padding:0 24px}
      .btn{display:inline-block;padding:14px 22px;border-radius:10px;font-weight:700}.btn-gold{background:var(--gold);color:#111}.btn-outline{border:1px solid rgba(255,255,255,.18)}
      .card{background:var(--card);border:1px solid rgba(255,255,255,.07);border-radius:var(--r)}
    </style>
  </head>
  <body>
    <slot />
  </body>
</html>
EOF2
cat > apps/insighthunter-main/src/components/marketing/Nav.astro <<'EOF2'
<nav style="position:sticky;top:0;background:rgba(13,13,13,.88);backdrop-filter:blur(12px);border-bottom:1px solid rgba(255,255,255,.06)">
  <div class="container" style="height:68px;display:flex;align-items:center;justify-content:space-between;gap:24px">
    <a href="/" style="display:flex;align-items:center;gap:10px;font-family:var(--font-display);font-weight:700">
      <svg width="28" height="28" viewBox="0 0 40 40" fill="none"><path d="M20 4C20 4 12 12 12 20C12 25.5 15.6 30 20 30C24.4 30 28 25.5 28 20C28 15 26 11 26 11C26 11 25 16 20 16C15 16 17 10 20 4Z" fill="#C9A84C"/></svg>
      <span>Insight Hunter</span>
    </a>
    <div style="display:flex;gap:20px;color:var(--muted)">
      <a href="/features">Features</a><a href="/pricing">Pricing</a><a href="/about">About</a>
    </div>
    <div style="display:flex;gap:12px"><a class="btn btn-outline" href="/auth/login">Sign In</a><a class="btn btn-gold" href="/auth/register">Start Free</a></div>
  </div>
</nav>
EOF2
cat > apps/insighthunter-main/src/pages/index.astro <<'EOF2'
---
import MarketingLayout from '../layouts/MarketingLayout.astro';
import Nav from '../components/marketing/Nav.astro';
---
<MarketingLayout title="Insight Hunter — Stop Flying Blind">
  <Nav />
  <section style="padding:96px 0;background:radial-gradient(circle at top, rgba(201,168,76,.08), transparent 40%), var(--bg-navy)">
    <div class="container" style="text-align:center;max-width:860px">
      <div style="display:inline-block;padding:8px 16px;border:1px solid rgba(201,168,76,.35);border-radius:999px;color:var(--gold);font-size:12px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;margin-bottom:18px">AI-Powered Financial Intelligence</div>
      <h1 style="font-family:var(--font-display);font-size:clamp(2.5rem,6vw,4.8rem);line-height:1.08;margin-bottom:18px">Stop Flying Blind.<br /><span style="color:var(--gold)">Know Your Numbers.</span></h1>
      <p style="max-width:680px;margin:0 auto 28px;color:var(--muted);font-size:1.08rem">Bookkeeping, payroll, business formation, reporting, PBX, and AI CFO insights built Cloudflare-native for small businesses.</p>
      <div style="display:flex;gap:12px;justify-content:center;flex-wrap:wrap"><a class="btn btn-gold" href="/auth/register">Start Free</a><a class="btn btn-outline" href="/pricing">See Pricing</a></div>
    </div>
  </section>
  <section class="container" style="padding:72px 24px">
    <h2 style="font-family:var(--font-display);font-size:2rem;margin-bottom:20px">Platform Pages</h2>
    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:18px">
      {['Bookkeeping','BizForma','Payroll','PBX','Report','Scout','White Label'].map((name) => (
        <a href={`/features/${name.toLowerCase().replace(/ /g,'-')}`} class="card" style="padding:24px;display:block">
          <div style="font-family:var(--font-display);font-weight:700">Insight Hunter</div>
          <div style="color:var(--gold);font-size:.85rem;font-weight:700;text-transform:uppercase;letter-spacing:.08em;margin-top:6px">{name}</div>
          <p style="color:var(--muted);margin-top:12px">Production-ready page scaffold for {name}.</p>
        </a>
      ))}
    </div>
  </section>
</MarketingLayout>
EOF2
for page in pricing about contact 404; do
cat > "apps/insighthunter-main/src/pages/${page}.astro" <<EOF2
---
import MarketingLayout from '../layouts/MarketingLayout.astro';
import Nav from '../components/marketing/Nav.astro';
---
<MarketingLayout title="${page^}">
  <Nav />
  <section class="container" style="padding:80px 24px">
    <h1 style="font-family:var(--font-display);font-size:2.5rem;margin-bottom:14px">${page^}</h1>
    <p style="color:var(--muted);max-width:720px">This page is scaffolded and ready for your GitHub repository. Replace this body with your production copy.</p>
  </section>
</MarketingLayout>
EOF2
done
for feature in bookkeeping bizforma insight-lite insight-standard insight-pro scout pbx payroll website-services report whitelabel; do
mkdir -p apps/insighthunter-main/src/pages/features
cat > "apps/insighthunter-main/src/pages/features/${feature}.astro" <<EOF2
---
import MarketingLayout from '../../layouts/MarketingLayout.astro';
import Nav from '../../components/marketing/Nav.astro';
---
<MarketingLayout title="${feature}">
  <Nav />
  <section class="container" style="padding:80px 24px">
    <h1 style="font-family:var(--font-display);font-size:2.5rem;margin-bottom:14px">${feature}</h1>
    <p style="color:var(--muted);max-width:720px">Feature page scaffold for ${feature}. Brand palette, typography, and dark card system already applied.</p>
  </section>
</MarketingLayout>
EOF2
done
for page in index reports forecast bookkeeping bizforma insights settings upgrade; do
mkdir -p apps/insighthunter-main/src/pages/dashboard
cat > "apps/insighthunter-main/src/pages/dashboard/${page}.astro" <<EOF2
---
import MarketingLayout from '../../layouts/MarketingLayout.astro';
---
<MarketingLayout title="Dashboard ${page}">
  <section class="container" style="padding:60px 24px">
    <h1 style="font-family:var(--font-display);font-size:2rem;margin-bottom:12px">Dashboard ${page}</h1>
    <p style="color:var(--muted)">Authenticated dashboard scaffold ready for API wiring.</p>
  </section>
</MarketingLayout>
EOF2
done
for page in login register forgot-password callback; do
mkdir -p apps/insighthunter-main/src/pages/auth
cat > "apps/insighthunter-main/src/pages/auth/${page}.astro" <<EOF2
---
import MarketingLayout from '../../layouts/MarketingLayout.astro';
---
<MarketingLayout title="${page}">
  <section class="container" style="padding:80px 24px;max-width:520px">
    <div class="card" style="padding:32px">
      <h1 style="font-family:var(--font-display);font-size:2rem;margin-bottom:12px">${page}</h1>
      <p style="color:var(--muted)">Auth page scaffold for ${page}.</p>
    </div>
  </section>
</MarketingLayout>
EOF2
done

# Worker apps
make_worker_app apps/insighthunter-auth ih-auth-worker auth.insighthunter.app
make_worker_app apps/insighthunter-bizforma ih-bizforma-worker bizforma.insighthunter.app
make_worker_app apps/insighthunter-payroll ih-payroll-worker payroll.insighthunter.app
make_worker_app apps/insighthunter-pbx ih-pbx-worker pbx.insighthunter.app
make_worker_app apps/insighthunter-bookkeeping ih-bookkeeping-worker bookkeeping.insighthunter.app
make_worker_app apps/insighthunter-report ih-report-worker report.insighthunter.app
make_worker_app apps/insighthunter-scout ih-scout-worker scout.insighthunter.app
make_worker_app apps/insighthunter-whitelabel ih-whitelabel-worker whitelabel.insighthunter.app
make_worker_app apps/ih-platform-worker ih-platform-worker api.insighthunter.app
make_worker_app apps/ih-tenant-template tenant-template workers.insighthunter.app

# Platform-specific worker docs
cat > apps/ih-platform-worker/src/worker.ts <<'EOF2'
import { Hono } from 'hono';

const app = new Hono();
app.post('/api/provision', async (c) => c.json({ success: true, message: 'Tenant provision endpoint scaffolded' }));
app.all('/tenant/*', async (c) => c.json({ success: true, message: 'Dispatch namespace router scaffolded' }));
app.get('/health', (c) => c.json({ status: 'ok', worker: 'ih-platform-worker' }));
export default app;
EOF2
cat > apps/ih-tenant-template/src/worker.ts <<'EOF2'
import { Hono } from 'hono';
const app = new Hono();
app.get('/health', (c) => c.json({ status: 'ok', worker: 'tenant-template' }));
app.get('/api/data/profile', (c) => c.json({ orgScoped: true }));
export default app;
EOF2

# README for execution
cat > README.md <<'EOF2'
# InsightHunter scaffold

## Build the repo
```bash
bash build-insighthunter.sh my-insighthunter
cd my-insighthunter
npm install
```

## What this script creates
- Marketing Astro site with major pages
- Cloudflare Worker app folders for each product
- Shared packages
- Root Turborepo files
- wrangler.toml files for upload to GitHub and later deployment
EOF2

printf 'Scaffold created at %s\n' "$PWD"
