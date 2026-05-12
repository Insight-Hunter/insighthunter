#!/usr/bin/env bash
# InsightHunter — rebuild apps/ folder
set -euo pipefail

mkdir -p apps/{insighthunter-auth,insighthunter-advisor,insighthunter-bizforma,insighthunter-bookkeeping,insighthunter-payroll,insighthunter-pbx,insighthunter-main}/src
mkdir -p apps/insighthunter-auth/migrations
mkdir -p apps/insighthunter-advisor/migrations
mkdir -p apps/insighthunter-bizforma/migrations
mkdir -p apps/insighthunter-bookkeeping/migrations
mkdir -p apps/insighthunter-payroll/migrations
mkdir -p apps/insighthunter-pbx/migrations
mkdir -p apps/insighthunter-main/src/{layouts,pages/{auth,dashboard,features},middleware}

echo "Folders created."

# ── Root package.json ────────────────────────────────────────────
cat > package.json << 'PKGJSON'
{
  "name": "insighthunter",
  "private": true,
  "type": "module",
  "workspaces": ["apps/*"],
  "scripts": {
    "deploy:auth":       "cd apps/insighthunter-auth && wrangler deploy",
    "deploy:advisor":    "cd apps/insighthunter-advisor && wrangler deploy",
    "deploy:bizforma":   "cd apps/insighthunter-bizforma && wrangler deploy",
    "deploy:bookkeeping":"cd apps/insighthunter-bookkeeping && wrangler deploy",
    "deploy:payroll":    "cd apps/insighthunter-payroll && wrangler deploy",
    "deploy:pbx":        "cd apps/insighthunter-pbx && wrangler deploy",
    "deploy:main":       "cd apps/insighthunter-main && npm run build && wrangler pages deploy dist --project-name ih-main"
  },
  "devDependencies": { "wrangler": "^3.60.0", "typescript": "^5.4.0" }
}
PKGJSON

cat > .gitignore << 'GITIGNORE'
node_modules
dist
.wrangler
.env
*.local
GITIGNORE

# ══════════════════════════════════════════════════════════
# AUTH
# ══════════════════════════════════════════════════════════
cat > apps/insighthunter-auth/wrangler.toml << 'EOF'
name = "insighthunter-auth"
main = "src/index.ts"
compatibility_date = "2025-05-10"
compatibility_flags = ["nodejs_compat"]
[observability]
enabled = true
[[d1_databases]]
binding = "AUTH_DB"
database_name = "insighthunter-auth"
database_id   = "REPLACE_WITH_D1_ID"
[[kv_namespaces]]
binding = "SESSIONS"
id      = "REPLACE_WITH_KV_ID"
[[kv_namespaces]]
binding = "RATE_LIMIT"
id      = "REPLACE_WITH_KV_RATELIMIT_ID"
[vars]
ENVIRONMENT = "production"
APP_URL     = "https://insighthunter.app"
routes = [{ pattern = "auth.insighthunter.app/*", custom_domain = true }]
EOF

cat > apps/insighthunter-auth/package.json << 'EOF'
{ "name":"@ih/auth","private":true,"version":"1.0.0","type":"module",
  "scripts":{"dev":"wrangler dev --port 8788","deploy":"wrangler deploy"},
  "dependencies":{"hono":"^4.3.0","zod":"^3.23.0","@hono/zod-validator":"^0.2.2"},
  "devDependencies":{"@cloudflare/workers-types":"^4.20240524.0","typescript":"^5.4.0","wrangler":"^3.60.0"}}
EOF

cat > apps/insighthunter-auth/tsconfig.json << 'EOF'
{"compilerOptions":{"target":"ES2022","module":"ESNext","moduleResolution":"Bundler","strict":true,"types":["@cloudflare/workers-types"]}}
EOF

cat > apps/insighthunter-auth/migrations/0001_init.sql << 'EOF'
CREATE TABLE IF NOT EXISTS organizations (
  id TEXT PRIMARY KEY, name TEXT NOT NULL, tier TEXT NOT NULL DEFAULT 'lite',
  stripe_id TEXT, created_at TEXT NOT NULL DEFAULT (datetime('now')), updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY, org_id TEXT NOT NULL REFERENCES organizations(id),
  email TEXT NOT NULL UNIQUE, name TEXT NOT NULL, password_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'member', created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_org ON users(org_id);
CREATE TABLE IF NOT EXISTS audit_log (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  org_id TEXT NOT NULL, user_id TEXT, action TEXT NOT NULL, metadata TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
EOF

cat > apps/insighthunter-auth/src/index.ts << 'EOF'
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';

export interface Env {
  AUTH_DB: D1Database; SESSIONS: KVNamespace; RATE_LIMIT: KVNamespace;
  JWT_SECRET?: string; ENVIRONMENT?: string;
}

async function rateLimit(kv: KVNamespace, key: string, limit = 10, ttl = 60): Promise<boolean> {
  const n = parseInt(await kv.get(key) || '0');
  if (n >= limit) return false;
  await kv.put(key, String(n + 1), { expirationTtl: ttl });
  return true;
}

async function signJWT(payload: Record<string, unknown>, secret: string): Promise<string> {
  const h = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const b = btoa(JSON.stringify({ ...payload, iat: Math.floor(Date.now() / 1000) }));
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(`${h}.${b}`));
  return `${h}.${b}.${btoa(String.fromCharCode(...new Uint8Array(sig)))}`;
}

async function verifyJWT(token: string, secret: string): Promise<Record<string, unknown> | null> {
  try {
    const [h, b, sig] = token.split('.');
    const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['verify']);
    const ok = await crypto.subtle.verify('HMAC', key, Uint8Array.from(atob(sig), c => c.charCodeAt(0)), new TextEncoder().encode(`${h}.${b}`));
    return ok ? JSON.parse(atob(b)) : null;
  } catch { return null; }
}

const app = new Hono<{ Bindings: Env }>();
app.use('*', cors({ origin: ['https://insighthunter.app', 'https://advisor.insighthunter.app', 'https://bizforma.insighthunter.app', 'https://bookkeeping.insighthunter.app', 'https://payroll.insighthunter.app', 'https://pbx.insighthunter.app'], allowHeaders: 
