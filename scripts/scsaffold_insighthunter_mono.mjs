#!/usr/bin/env node
import { mkdirSync, existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

const ROOT = process.argv[2] || process.cwd();

function ensureDir(path) {
  mkdirSync(path, { recursive: true });
}

function ensureFile(path, content) {
  ensureDir(dirname(path));

  if (!existsSync(path)) {
    writeFileSync(path, content, 'utf8');
    console.log(`created: ${path}`);
    return;
  }

  const current = readFileSync(path, 'utf8');
  if (!current.trim()) {
    writeFileSync(path, content, 'utf8');
    console.log(`filled-empty: ${path}`);
    return;
  }

  console.log(`exists: ${path}`);
}

const files = {
  'package.json': `{
  "name": "insighthunter",
  "private": true,
  "packageManager": "pnpm@10.0.0",
  "scripts": {
    "dev:main": "pnpm --filter insighthunter-main dev",
    "dev:auth": "pnpm --filter insighthunter-auth dev",
    "build": "pnpm -r build",
    "typecheck": "pnpm -r typecheck"
  }
}
`,
  'pnpm-workspace.yaml': `packages:
  - apps/*
  - packages/*
`,
  'tsconfig.base.json': `{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "strict": true,
    "verbatimModuleSyntax": true,
    "allowSyntheticDefaultImports": true,
    "resolveJsonModule": true,
    "skipLibCheck": true,
    "types": ["@cloudflare/workers-types"]
  }
}
`,
  'turbo.json': `{
  "$schema": "https://turbo.build/schema.json",
  "tasks": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": ["dist/**", ".astro/**"]
    },
    "typecheck": {
      "dependsOn": ["^typecheck"]
    },
    "dev": {
      "cache": false,
      "persistent": true
    }
  }
}
`,
  'apps/insighthunter-main/package.json': `{
  "name": "insighthunter-main",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "wrangler dev",
    "build": "wrangler deploy --dry-run",
    "deploy": "wrangler deploy",
    "typecheck": "tsc -p tsconfig.json --noEmit"
  },
  "dependencies": {
    "@astrojs/cloudflare": "^14.1.2",
    "astro": "^7.0.6",
    "hono": "^4.6.10",
    "@insighthunter/auth-shared": "workspace:*"
  },
  "devDependencies": {
    "@cloudflare/workers-types": "^4.20250701.0"
  }
}
`,
  'apps/insighthunter-main/wrangler.jsonc': `{
  "$schema": "node_modules/wrangler/config-schema.json",
  "name": "insighthunter-main",
  "main": "src/index.ts",
  "compatibility_date": "2026-07-25",
  "observability": { "enabled": true },
  "vars": {
    "APP_NAME": "Insight Hunter",
    "MAIN_BASE_URL": "https://insighthunter.app",
    "AUTH_BASE_URL": "https://auth.insighthunter.app"
  }
}
`,
  'apps/insighthunter-main/astro.config.mjs': `import { defineConfig } from 'astro/config';
import cloudflare from '@astrojs/cloudflare';

export default defineConfig({
  output: 'server',
  adapter: cloudflare(),
});
`,
  'apps/insighthunter-main/tsconfig.json': `{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "jsx": "preserve"
  },
  "include": ["src/**/*.ts", "src/**/*.astro"]
}
`,
  'apps/insighthunter-main/src/index.ts': `import { Hono } from 'hono';

const app = new Hono();

app.get('/api/health', (c) => c.json({ ok: true, service: 'insighthunter-main' }));

export default app;
`,
  'apps/insighthunter-main/src/layouts/MarketingLayout.astro': `---
export interface Props { title: string; description?: string; }
const { title, description = 'Insight Hunter' } = Astro.props;
---
<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width,initial-scale=1" />
    <title>{title}</title>
    <meta name="description" content={description} />
  </head>
  <body>
    <slot />
  </body>
</html>
`,
  'apps/insighthunter-main/src/pages/index.astro': `---
import MarketingLayout from '../layouts/MarketingLayout.astro';
---
<MarketingLayout title="Insight Hunter">
  <main>
    <h1>Insight Hunter</h1>
    <p>Cloudflare-native finance intelligence platform.</p>
  </main>
</MarketingLayout>
`,
  'apps/insighthunter-main/src/pages/pricing.astro': `---
import MarketingLayout from '../layouts/MarketingLayout.astro';
---
<MarketingLayout title="Pricing | Insight Hunter">
  <main>
    <h1>Pricing</h1>
    <p>Starter, Growth, and Pro plans for organization-based access.</p>
  </main>
</MarketingLayout>
`,
  'apps/insighthunter-main/src/pages/dashboard/index.astro': `---
import MarketingLayout from '../../layouts/MarketingLayout.astro';
---
<MarketingLayout title="Dashboard | Insight Hunter">
  <main>
    <h1>Dashboard</h1>
    <p>Authenticated organization launcher shell.</p>
  </main>
</MarketingLayout>
`,
  'apps/insighthunter-main/migrations/0001_init.sql': `PRAGMA foreign_keys = ON;
CREATE TABLE IF NOT EXISTS organizations (id TEXT PRIMARY KEY, name TEXT NOT NULL, created_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS subscriptions (id TEXT PRIMARY KEY, organization_id TEXT NOT NULL, plan_code TEXT NOT NULL, status TEXT NOT NULL, created_at TEXT NOT NULL, updated_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS entitlements (id TEXT PRIMARY KEY, organization_id TEXT NOT NULL, feature_key TEXT NOT NULL, created_at TEXT NOT NULL);
`,
  'apps/insighthunter-auth/package.json': `{
  "name": "insighthunter-auth",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "wrangler dev",
    "build": "wrangler deploy --dry-run",
    "deploy": "wrangler deploy",
    "typecheck": "tsc -p tsconfig.json --noEmit"
  },
  "dependencies": {
    "hono": "^4.6.10"
  },
  "devDependencies": {
    "@cloudflare/workers-types": "^4.20250701.0"
  }
}
`,
  'apps/insighthunter-auth/wrangler.jsonc': `{
  "$schema": "node_modules/wrangler/config-schema.json",
  "name": "insighthunter-auth",
  "main": "src/index.ts",
  "compatibility_date": "2026-07-25",
  "observability": { "enabled": true }
}
`,
  'apps/insighthunter-auth/tsconfig.json': `{
  "extends": "../../tsconfig.base.json",
  "include": ["src/**/*.ts"]
}
`,
  'apps/insighthunter-auth/src/index.ts': `import { Hono } from 'hono';

const app = new Hono();

app.get('/health', (c) => c.json({ ok: true, service: 'insighthunter-auth' }));
app.get('/session/:token', (c) => c.json({
  ok: true,
  session: {
    token: c.req.param('token'),
    user: { subject: 'demo-user', email: 'demo@insighthunter.app' },
    expiresAt: new Date(Date.now() + 3600000).toISOString()
  }
}));

export default app;
`,
  'packages/auth-shared/package.json': `{
  "name": "@insighthunter/auth-shared",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "exports": {
    ".": "./src/index.ts"
  }
}
`,
  'packages/auth-shared/src/index.ts': `export function extractSessionToken(request: Request): string | null {
  const cookie = request.headers.get('cookie') ?? '';
  const match = cookie.match(/(?:^|;\\s*)(?:session|sessiontoken)=([^;]+)/);
  return match?.[1] ?? null;
}

export function getLoginRedirectUrl(authBaseUrl: string, returnTo: string): string {
  return \`\${authBaseUrl.replace(/\\/$/, '')}/login?returnTo=\${encodeURIComponent(returnTo)}\`;
}

export function getRegisterRedirectUrl(authBaseUrl: string, returnTo: string): string {
  return \`\${authBaseUrl.replace(/\\/$/, '')}/register?returnTo=\${encodeURIComponent(returnTo)}\`;
}
`,
  'packages/org-shared/package.json': `{
  "name": "@insighthunter/org-shared",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "exports": {
    ".": "./src/index.ts"
  }
}
`,
  'packages/org-shared/src/index.ts': `export type Organization = { id: string; name: string };
export type Subscription = { id: string; organizationId: string; planCode: string; status: string };
export type Entitlement = { id: string; organizationId: string; featureKey: string };
`,
  'docs/architecture/README.md': `# Insight Hunter architecture

Monorepo with Astro main site, Cloudflare Worker services, and organization-based entitlements.
`
};

for (const [relativePath, content] of Object.entries(files)) {
  ensureFile(join(ROOT, relativePath), content);
}

console.log(`\\nScaffold check complete at: ${ROOT}`);
