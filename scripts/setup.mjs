#!/usr/bin/env node
/**
 * InsightHunter Monorepo Bootstrap
 * ─────────────────────────────────
 * Usage:
 *   node setup.mjs            # scaffold only
 *   node setup.mjs --install  # scaffold + npm install each app
 *
 * Creates:  ./insighthunter/
 *   apps/insighthunter-main          (Astro + Svelte dashboard/marketing)
 *   apps/insighthunter-bookkeeping   (Hono Worker — D1/R2/KV/AE)
 *   apps/insighthunter-bizforma      (Hono Worker — formation/EIN/compliance)
 */

import { mkdirSync, writeFileSync } from 'fs';
import { execSync } from 'child_process';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const ROOT   = join(process.cwd(), 'insighthunter');
const INSTALL = process.argv.includes('--install');
let   written = 0;

function w(path, content) {
  const full = join(ROOT, path);
  mkdirSync(dirname(full), { recursive: true });
  writeFileSync(full, content.replace(/^\\n/, ''));
  written++;
  process.stdout.write(`  ✓  ${path}\\n`);
}

console.log('\\n🚀  InsightHunter Monorepo Bootstrap\\n');

// ══════════════════════════════════════════════════════════════
//  ROOT
// ══════════════════════════════════════════════════════════════

w('package.json', `\\
{
  "name": "insighthunter",
  "private": true,
  "workspaces": ["apps/*"],
  "scripts": {
    "dev:main": "npm run dev -w apps/insighthunter-main",
    "dev:bk":   "npm run dev -w apps/insighthunter-bookkeeping",
    "dev:biz":  "npm run dev -w apps/insighthunter-bizforma",
    "build":    "npm run build --workspaces --if-present",
    "deploy":   "npm run deploy --workspaces --if-present"
  }
}
`);

w('.gitignore', `\\
node_modules
dist
.wrangler
.output
.cache
.env
*.env.local
`);

w('README.md', `\\
# InsightHunter Monorepo

| App | Purpose | Stack |
|-----|---------|-------|
| insighthunter-main | Marketing + Dashboard frontend | Astro, Svelte, SCSS |
| insighthunter-bookkeeping | Double-entry bookkeeping API | Hono, D1, R2, KV |
| insighthunter-bizforma | Business formation + compliance | Hono, D1, DO |

## Quick Start
\\`\\`\\`bash
node setup.mjs --install
cd insighthunter
npm run dev:main
\\`\\`\\`

## Deploy
\\`\\`\\`bash
npm run deploy
\\`\\`\\`
`);

// ══════════════════════════════════════════════════════════════
//  APP: insighthunter-bookkeeping
// ══════════════════════════════════════════════════════════════

console.log('\\n📒  insighthunter-bookkeeping\\n');

w('apps/insighthunter-bookkeeping/package.json', `\\
{
  "name": "insighthunter-bookkeeping",
  "version": "1.0.0",
  "private": true,
  "scripts": {
    "dev":    "wrangler dev",
    "deploy": "wrangler deploy",
    "db:migrate": "wrangler d1 execute insighthunter-bookkeeping --file=src/db/schema.sql"
  },
  "dependencies": {
    "hono": "^4.4.0"
  },
  "devDependencies": {
    "@cloudflare/workers-types": "^4.20240529.0",
    "typescript": "^5.4.5",
    "wrangler": "^3.57.0"
  }
}
`);

w('apps/insighthunter-bookkeeping/tsconfig.json', `\\
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ES2022",
    "moduleResolution": "bundler",
    "lib": ["ES2022"],
    "types": ["@cloudflare/workers-types"],
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "skipLibCheck": true
  },
  "include": ["src/**/*.ts"]
}
`);

w('apps/insighthunter-bookkeeping/wrangler.jsonc', `\\
{
  "name": "insighthunter-bookkeeping",
  "main": "src/index.ts",
  "compatibility_date": "2025-03-07",
  "compatibility_flags": ["nodejs_compat"],
  "observability": { "enabled": true, "head_sampling_rate": 1 },

  "d1_databases": [{
    "binding": "DB",
    "database_name": "insighthunter-bookkeeping",
    "database_id": "REPLACE_WITH_D1_ID"
  }],

  "r2_buckets": [{
    "binding": "RECEIPTS",
    "bucket_name": "ih-receipts"
  }],

  "kv_namespaces": [{
    "binding": "REPORT_CACHE",
    "id": "REPLACE_WITH_KV_ID"
  }],

  "analytics_engine_datasets": [{
    "binding": "BOOKKEEPING_EVENTS",
    "dataset": "ih_bookkeeping_events"
  }],

  "vars": { "ENVIRONMENT": "production" },

  // wrangler secret put JWT_SECRET
  "secrets": ["JWT_SECRET"]
}
`);

w('apps/insighthunter-bookkeeping/src/db/schema.sql', `\\
-- Chart of Accounts
CREATE TABLE IF NOT EXISTS bookkeeping_accounts (
  id          TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  org_id      TEXT NOT NULL,
  code        TEXT,
  name        TEXT NOT NULL,
  type        TEXT NOT NULL CHECK(type IN ('ASSET','LIABILITY','EQUITY','REVENUE','EXPENSE')),
  subtype     TEXT,
  description TEXT,
  parent_id   TEXT REFERENCES bookkeeping_accounts(id),
  is_active   INTEGER NOT NULL DEFAULT 1,
  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_bk_acct_org  ON bookkeeping_accounts(org_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_bk_acct_code ON bookkeeping_accounts(org_id, code) WHERE code IS NOT NULL;

-- Journal transaction headers
CREATE TABLE IF NOT EXISTS transactions (
  id          TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  org_id      TEXT NOT NULL,
  date        TEXT NOT NULL,
  description TEXT NOT NULL,
  reference   TEXT,
  status      TEXT NOT NULL DEFAULT 'DRAFT' CHECK(status IN ('DRAFT','POSTED','VOID')),
  created_by  TEXT,
  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_txn_org_date   ON transactions(org_id, date);
CREATE INDEX IF NOT EXISTS idx_txn_org_status ON transactions(org_id, status);

-- Double-entry lines
CREATE TABLE IF NOT EXISTS transaction_lines (
  id             TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  transaction_id TEXT NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
  account_id     TEXT NOT NULL REFERENCES bookkeeping_accounts(id),
  debit          REAL NOT NULL DEFAULT 0 CHECK(debit  >= 0),
  credit         REAL NOT NULL DEFAULT 0 CHECK(credit >= 0),
  memo           TEXT,
  created_at     TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_lines_txn     ON transaction_lines(transaction_id);
CREATE INDEX IF NOT EXISTS idx_lines_account ON transaction_lines(account_id);

-- R2 receipt attachments metadata
CREATE TABLE IF NOT EXISTS attachments (
  id             TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  org_id         TEXT NOT NULL,
  transaction_id TEXT REFERENCES transactions(id) ON DELETE SET NULL,
  r2_key         TEXT NOT NULL,
  filename       TEXT NOT NULL,
  size           INTEGER,
  created_at     TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_attach_txn ON attachments(transaction_id);
`);

w('apps/insighthunter-bookkeeping/src/index.ts', `\\
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { jwt } from 'hono/jwt';

export interface Env {
  DB: D1Database;
  RECEIPTS: R2Bucket;
  REPORT_CACHE: KVNamespace;
  BOOKKEEPING_EVENTS: AnalyticsEngineDataset;
  JWT_SECRET: string;
  ENVIRONMENT: string;
}

interface OrgCtx { orgId: string; userId: string; }

type AccountType = 'ASSET' | 'LIABILITY' | 'EQUITY' | 'REVENUE' | 'EXPENSE';

interface AccountRow {
  id: string; org_id: string; code: string | null; name: string;
  type: AccountType; subtype: string | null; description: string | null;
  parent_id: string | null; is_active: number; created_at: string; updated_at: string;
}

interface TxnRow {
  id: string; org_id: string; date: string; description: string;
  reference: string | null; status: 'DRAFT' | 'POSTED' | 'VOID';
  created_by: string | null; created_at: string; updated_at: string;
}

interface LineRow {
  id: string; transaction_id: string; account_id: string;
  account_name: string; account_code: string | null; account_type: string;
  debit: number; credit: number; memo: string | null;
}

const DEFAULT_COA: Array<{ code: string; name: string; type: AccountType; subtype: string }> = [
  { code: '1000', name: 'Cash',                    type: 'ASSET',     subtype: 'Current'   },
  { code: '1010', name: 'Checking Account',         type: 'ASSET',     subtype: 'Current'   },
  { code: '1020', name: 'Savings Account',          type: 'ASSET',     subtype: 'Current'   },
  { code: '1100', name: 'Accounts Receivable',      type: 'ASSET',     subtype: 'Current'   },
  { code: '1200', name: 'Prepaid Expenses',         type: 'ASSET',     subtype: 'Current'   },
  { code: '1500', name: 'Equipment',                type: 'ASSET',     subtype: 'Fixed'     },
  { code: '1510', name: 'Accumulated Depreciation', type: 'ASSET',     subtype: 'Fixed'     },
  { code: '2000', name: 'Accounts Payable',         type: 'LIABILITY', subtype: 'Current'   },
  { code: '2100', name: 'Credit Card Payable',      type: 'LIABILITY', subtype: 'Current'   },
  { code: '2200', name: 'Sales Tax Payable',        type: 'LIABILITY', subtype: 'Current'   },
  { code: '2300', name: 'Payroll Liabilities',      type: 'LIABILITY', subtype: 'Current'   },
  { code: '2500', name: 'Long-Term Debt',           type: 'LIABILITY', subtype: 'LongTerm'  },
  { code: '3000', name: "Owner\\'s Equity",           type: 'EQUITY',    subtype: 'Equity'    },
  { code: '3100', name: "Owner\\'s Draw",             type: 'EQUITY',    subtype: 'Equity'    },
  { code: '3200', name: 'Retained Earnings',        type: 'EQUITY',    subtype: 'Equity'    },
  { code: '4000', name: 'Revenue',                  type: 'REVENUE',   subtype: 'Operating' },
  { code: '4100', name: 'Service Revenue',          type: 'REVENUE',   subtype: 'Operating' },
  { code: '4200', name: 'Product Revenue',          type: 'REVENUE',   subtype: 'Operating' },
  { code: '4900', name: 'Other Income',             type: 'REVENUE',   subtype: 'Other'     },
  { code: '5000', name: 'Cost of Goods Sold',       type: 'EXPENSE',   subtype: 'COGS'      },
  { code: '6000', name: 'Rent Expense',             type: 'EXPENSE',   subtype: 'Operating' },
  { code: '6100', name: 'Utilities',                type: 'EXPENSE',   subtype: 'Operating' },
  { code: '6200', name: 'Payroll Expense',          type: 'EXPENSE',   subtype: 'Operating' },
  { code: '6300', name: 'Professional Services',    type: 'EXPENSE',   subtype: 'Operating' },
  { code: '6400', name: 'Marketing & Advertising',  type: 'EXPENSE',   subtype: 'Operating' },
  { code: '6500', name: 'Software & Subscriptions', type: 'EXPENSE',   subtype: 'Operating' },
  { code: '6600', name: 'Office Supplies',          type: 'EXPENSE',   subtype: 'Operating' },
  { code: '6700', name: 'Travel & Meals',           type: 'EXPENSE',   subtype: 'Operating' },
  { code: '6800', name: 'Bank Fees',                type: 'EXPENSE',   subtype: 'Operating' },
  { code: '6900', name: 'Depreciation Expense',     type: 'EXPENSE',   subtype: 'Operating' },
  { code: '7000', name: 'Interest Expense',         type: 'EXPENSE',   subtype: 'Other'     },
  { code: '7100', name: 'Income Tax Expense',       type: 'EXPENSE',   subtype: 'Other'     },
];

function track(env: Env, orgId: string, event: string, meta: Record<string, string> = {}): void {
  env.BOOKKEEPING_EVENTS.writeDataPoint({
    blobs: [event, orgId, meta.status ?? '', meta.type ?? ''],
    doubles: [1],
    indexes: [orgId],
  });
}

function validateLines(lines: Array<{ debit: number; credit: number }>): boolean {
  const d = lines.reduce((s, l) => s + (l.debit  ?? 0), 0);
  const c = lines.reduce((s, l) => s + (l.credit ?? 0), 0);
  return Math.abs(d - c) < 0.001;
}

function ck(orgId: string, report: string, params: string): string {
  return 'report:' + orgId + ':' + report + ':' + params;
}

const app = new Hono<{ Bindings: Env; Variables: { org: OrgCtx } }>();

app.use('*', cors({
  origin: (o) => o ?? '*',
  allowHeaders: ['Authorization', 'Content-Type'],
  allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  credentials: true,
}));

app.use('*', async (c, next) => {
  if (c.req.path === '/seed') {
    if (c.req.header('X-Internal-Secret') !== c.env.JWT_SECRET) return c.json({ error: 'Unauthorized' }, 401);
    c.set('org', { orgId: c.req.header('X-Org-Id') ?? '', userId: 'system' });
    return next();
  }
  const auth = c.req.header('Authorization');
  if (!auth?.startsWith('Bearer ')) return c.json({ error: 'Unauthorized' }, 401);
  try {
    return await jwt({ secret: c.env.JWT_SECRET })(c, next as never) as never;
  } catch {
    return c.json({ error: 'Invalid token' }, 401);
  }
});

// ── Seed CoA (called by BizForma on formation COMPLETE) ───────────────────────
app.post('/seed', async (c) => {
  const { orgId } = c.get('org');
  if (!orgId) return c.json({ error: 'org_id required' }, 400);
  const existing = await c.env.DB.prepare('SELECT COUNT(*) as cnt FROM bookkeeping_accounts WHERE org_id = ?')
    .bind(orgId).first<{ cnt: number }>();
  if ((existing?.cnt ?? 0) > 0) return c.json({ message: 'Already seeded', seeded: false });
  await c.env.DB.batch(DEFAULT_COA.map(({ code, name, type, subtype }) =>
    c.env.DB.prepare('INSERT INTO bookkeeping_accounts (org_id,code,name,type,subtype) VALUES (?,?,?,?,?)')
      .bind(orgId, code, name, type, subtype)
  ));
  track(c.env, orgId, 'coa_seeded');
  return c.json({ message: 'CoA seeded', count: DEFAULT_COA.length, seeded: true });
});

// ── Chart of Accounts ────────────────────────────────────────────────────────
app.get('/accounts', async (c) => {
  const { orgId } = c.get('org');
  const type = c.req.query('type');
  const activeOnly = c.req.query('active') !== 'false';
  let sql = 'SELECT * FROM bookkeeping_accounts WHERE org_id = ?';
  const p: unknown[] = [orgId];
  if (type) { sql += ' AND type = ?'; p.push(type); }
  if (activeOnly) sql += ' AND is_active = 1';
  sql += ' ORDER BY code, name';
  const { results } = await c.env.DB.prepare(sql).bind(...p).all<AccountRow>();
  return c.json({ accounts: results });
});

app.post('/accounts', async (c) => {
  const { orgId } = c.get('org');
  const b = await c.req.json<Partial<AccountRow>>();
  if (!b.name || !b.type) return c.json({ error: 'name and type required' }, 400);
  const valid: AccountType[] = ['ASSET','LIABILITY','EQUITY','REVENUE','EXPENSE'];
  if (!valid.includes(b.type as AccountType)) return c.json({ error: 'Invalid type' }, 400);
  const row = await c.env.DB.prepare(
    'INSERT INTO bookkeeping_accounts (org_id,code,name,type,subtype,description,parent_id) VALUES (?,?,?,?,?,?,?) RETURNING *'
  ).bind(orgId, b.code ?? null, b.name, b.type, b.subtype ?? null, b.description ?? null, b.parent_id ?? null)
   .first<AccountRow>();
  track(c.env, orgId, 'account_created', { type: b.type });
  return c.json({ account: row }, 201);
});

app.patch('/accounts/:id', async (c) => {
  const { orgId } = c.get('org');
  const { id } = c.req.param();
  const b = await c.req.json<Partial<AccountRow>>();
  const ex = await c.env.DB.prepare('SELECT id FROM bookkeeping_accounts WHERE id=? AND org_id=?').bind(id, orgId).first();
  if (!ex) return c.json({ error: 'Not found' }, 404);
  const fields: string[] = []; const vals: unknown[] = [];
  if (b.name        != null) { fields.push('name=?');        vals.push(b.name); }
  if (b.code        != null) { fields.push('code=?');        vals.push(b.code); }
  if (b.description != null) { fields.push('description=?'); vals.push(b.description); }
  if (b.subtype     != null) { fields.push('subtype=?');     vals.push(b.subtype); }
  if (b.is_active   != null) { fields.push('is_active=?');   vals.push(b.is_active); }
  if (!fields.length) return c.json({ error: 'Nothing to update' }, 400);
  fields.push("updated_at=datetime('now')"); vals.push(id, orgId);
  const row = await c.env.DB.prepare(
    'UPDATE bookkeeping_accounts SET ' + fields.join(',') + ' WHERE id=? AND org_id=? RETURNING *'
  ).bind(...vals).first<AccountRow>();
  return c.json({ account: row });
});

app.delete('/accounts/:id', async (c) => {
  const { orgId } = c.get('org');
  const { id } = c.req.param();
  const used = await c.env.DB.prepare(
    "SELECT COUNT(*) as cnt FROM transaction_lines tl JOIN transactions t ON t.id=tl.transaction_id WHERE tl.account_id=? AND t.org_id=? AND t.status='POSTED'"
  ).bind(id, orgId).first<{ cnt: number }>();
  if ((used?.cnt ?? 0) > 0) {
    await c.env.DB.prepare("UPDATE bookkeeping_accounts SET is_active=0,updated_at=datetime('now') WHERE id=? AND org_id=?").bind(id, orgId).run();
    return c.json({ message: 'Deactivated', deactivated: true });
  }
  await c.env.DB.prepare('DELETE FROM bookkeeping_accounts WHERE id=? AND org_id=?').bind(id, orgId).run();
  return c.json({ message: 'Deleted' });
});

// ── Transactions ─────────────────────────────────────────────────────────────
app.get('/transactions', async (c) => {
  const { orgId } = c.get('org');
  const { status, from, to, account, search, page = '1', limit = '50' } = c.req.query();
  const pg = Math.max(1, parseInt(page, 10));
  const lim = Math.min(200, Math.max(1, parseInt(limit, 10)));
  const offset = (pg - 1) * lim;
  let sql = 'SELECT t.*,COUNT(tl.id) as line_count,SUM(tl.debit) as total_debit,SUM(tl.credit) as total_credit FROM transactions t LEFT JOIN transaction_lines tl ON tl.transaction_id=t.id WHERE t.org_id=?';
  const p: unknown[] = [orgId];
  if (status)  { sql += ' AND t.status=?';  p.push(status); }
  if (from)    { sql += ' AND t.date>=?';   p.push(from); }
  if (to)      { sql += ' AND t.date<=?';   p.push(to); }
  if (search)  { sql += ' AND (t.description LIKE ? OR t.reference LIKE ?)'; p.push('%'+search+'%','%'+search+'%'); }
  if (account) { sql = sql.replace('WHERE t.org_id=?','JOIN transaction_lines tf ON tf.transaction_id=t.id AND tf.account_id=? WHERE t.org_id=?'); p.unshift(account); }
  sql += ' GROUP BY t.id ORDER BY t.date DESC,t.created_at DESC LIMIT ' + lim + ' OFFSET ' + offset;
  const { results } = await c.env.DB.prepare(sql).bind(...p).all();
  const ct = await c.env.DB.prepare('SELECT COUNT(DISTINCT id) as total FROM transactions WHERE org_id=?').bind(orgId).first<{ total: number }>();
  return c.json({ transactions: results, pagination: { page: pg, limit: lim, total: ct?.total ?? 0 } });
});

app.get('/transactions/:id', async (c) => {
  const { orgId } = c.get('org');
  const { id } = c.req.param();
  const txn = await c.env.DB.prepare('SELECT * FROM transactions WHERE id=? AND org_id=?').bind(id, orgId).first<TxnRow>();
  if (!txn) return c.json({ error: 'Not found' }, 404);
  const { results: lines } = await c.env.DB.prepare(
    'SELECT tl.*,ba.name as account_name,ba.code as account_code,ba.type as account_type FROM transaction_lines tl JOIN bookkeeping_accounts ba ON ba.id=tl.account_id WHERE tl.transaction_id=? ORDER BY tl.rowid'
  ).bind(id).all<LineRow>();
  const { results: attachments } = await c.env.DB.prepare('SELECT * FROM attachments WHERE transaction_id=?').bind(id).all();
  return c.json({ transaction: txn, lines, attachments });
});

app.post('/transactions', async (c) => {
  const { orgId, userId } = c.get('org');
  const b = await c.req.json<{ date: string; description: string; reference?: string; lines: Array<{ account_id: string; debit: number; credit: number; memo?: string }> }>();
  if (!b.date || !b.description) return c.json({ error: 'date and description required' }, 400);
  if (!Array.isArray(b.lines) || b.lines.length < 2) return c.json({ error: 'At least 2 lines required' }, 400);
  if (!validateLines(b.lines)) return c.json({ error: 'Debits must equal credits' }, 422);
  const ids = [...new Set(b.lines.map((l) => l.account_id))];
  const ph = ids.map(() => '?').join(',');
  const { results: accts } = await c.env.DB.prepare('SELECT id FROM bookkeeping_accounts WHERE id IN (' + ph + ') AND org_id=? AND is_active=1').bind(...ids, orgId).all<{ id: string }>();
  if (accts.length !== ids.length) return c.json({ error: 'Invalid accounts' }, 400);
  const txn = await c.env.DB.prepare('INSERT INTO transactions (org_id,date,description,reference,created_by) VALUES (?,?,?,?,?) RETURNING *')
    .bind(orgId, b.date, b.description, b.reference ?? null, userId).first<TxnRow>();
  if (!txn) return c.json({ error: 'Failed' }, 500);
  await c.env.DB.batch(b.lines.map((l) =>
    c.env.DB.prepare('INSERT INTO transaction_lines (transaction_id,account_id,debit,credit,memo) VALUES (?,?,?,?,?)').bind(txn.id, l.account_id, l.debit ?? 0, l.credit ?? 0, l.memo ?? null)
  ));
  track(c.env, orgId, 'transaction_created', { status: 'DRAFT' });
  return c.json({ transaction: txn }, 201);
});

app.patch('/transactions/:id', async (c) => {
  const { orgId } = c.get('org');
  const { id } = c.req.param();
  const b = await c.req.json<{ date?: string; description?: string; reference?: string; lines?: Array<{ account_id: string; debit: number; credit: number; memo?: string }> }>();
  const txn = await c.env.DB.prepare('SELECT * FROM transactions WHERE id=? AND org_id=?').bind(id, orgId).first<TxnRow>();
  if (!txn) return c.json({ error: 'Not found' }, 404);
  if (txn.status !== 'DRAFT') return c.json({ error: 'Only DRAFT editable' }, 409);
  const fields: string[] = []; const vals: unknown[] = [];
  if (b.date)        { fields.push('date=?');        vals.push(b.date); }
  if (b.description) { fields.push('description=?'); vals.push(b.description); }
  if (b.reference != null) { fields.push('reference=?'); vals.push(b.reference); }
  const stmts: D1PreparedStatement[] = [];
  if (fields.length) { fields.push("updated_at=datetime('now')"); vals.push(id, orgId); stmts.push(c.env.DB.prepare('UPDATE transactions SET ' + fields.join(',') + ' WHERE id=? AND org_id=?').bind(...vals)); }
  if (b.lines) {
    if (!validateLines(b.lines)) return c.json({ error: 'Unbalanced' }, 422);
    stmts.push(c.env.DB.prepare('DELETE FROM transaction_lines WHERE transaction_id=?').bind(id));
    b.lines.forEach((l) => stmts.push(c.env.DB.prepare('INSERT INTO transaction_lines (transaction_id,account_id,debit,credit,memo) VALUES (?,?,?,?,?)').bind(id, l.account_id, l.debit, l.credit, l.memo ?? null)));
  }
  if (stmts.length) await c.env.DB.batch(stmts);
  return c.json({ transaction: await c.env.DB.prepare('SELECT * FROM transactions WHERE id=?').bind(id).first() });
});

app.post('/transactions/:id/post', async (c) => {
  const { orgId } = c.get('org');
  const { id } = c.req.param();
  const txn = await c.env.DB.prepare('SELECT * FROM transactions WHERE id=? AND org_id=?').bind(id, orgId).first<TxnRow>();
  if (!txn) return c.json({ error: 'Not found' }, 404);
  if (txn.status !== 'DRAFT') return c.json({ error: 'Cannot post ' + txn.status }, 409);
  await c.env.DB.prepare("UPDATE transactions SET status='POSTED',updated_at=datetime('now') WHERE id=?").bind(id).run();
  await c.env.REPORT_CACHE.delete('report:' + orgId + ':pl:');
  track(c.env, orgId, 'transaction_posted');
  return c.json({ message: 'Posted' });
});

app.post('/transactions/:id/void', async (c) => {
  const { orgId } = c.get('org');
  const { id } = c.req.param();
  const txn = await c.env.DB.prepare('SELECT * FROM transactions WHERE id=? AND org_id=?').bind(id, orgId).first<TxnRow>();
  if (!txn) return c.json({ error: 'Not found' }, 404);
  if (txn.status === 'VOID') return c.json({ error: 'Already void' }, 409);
  await c.env.DB.prepare("UPDATE transactions SET status='VOID',updated_at=datetime('now') WHERE id=?").bind(id).run();
  track(c.env, orgId, 'transaction_voided');
  return c.json({ message: 'Voided' });
});

// ── Attachments ───────────────────────────────────────────────────────────────
app.post('/attachments/:txnId', async (c) => {
  const { orgId } = c.get('org');
  const { txnId } = c.req.param();
  const txn = await c.env.DB.prepare('SELECT id FROM transactions WHERE id=? AND org_id=?').bind(txnId, orgId).first();
  if (!txn) return c.json({ error: 'Transaction not found' }, 404);
  const fd = await c.req.formData();
  const file = fd.get('file') as File | null;
  if (!file) return c.json({ error: 'No file' }, 400);
  const key = 'receipts/' + orgId + '/' + txnId + '/' + crypto.randomUUID() + '-' + file.name;
  await c.env.RECEIPTS.put(key, await file.arrayBuffer(), { httpMeta: { contentType: file.type }, customMeta: { orgId, txnId } });
  const row = await c.env.DB.prepare('INSERT INTO attachments (org_id,transaction_id,r2_key,filename,size) VALUES (?,?,?,?,?) RETURNING *').bind(orgId, txnId, key, file.name, file.size).first();
  return c.json({ attachment: row }, 201);
});

app.get('/attachments/:id/download', async (c) => {
  const { orgId } = c.get('org');
  const { id } = c.req.param();
  const att = await c.env.DB.prepare('SELECT * FROM attachments WHERE id=? AND org_id=?').bind(id, orgId).first<{ r2_key: string; filename: string }>();
  if (!att) return c.json({ error: 'Not found' }, 404);
  const obj = await c.env.RECEIPTS.get(att.r2_key);
  if (!obj) return c.json({ error: 'File missing' }, 404);
  return new Response(obj.body, {
    headers: { 'Content-Type': obj.httpMetadata?.contentType ?? 'application/octet-stream', 'Content-Disposition': 'attachment; filename="' + att.filename + '"' },
  });
});

// ── Import (CSV batch) ────────────────────────────────────────────────────────
app.post('/import', async (c) => {
  const { orgId, userId } = c.get('org');
  const b = await c.req.json<{ rows: Array<{ date: string; description: string; debit_account_id: string; credit_account_id: string; amount: number; reference?: string }> }>();
  if (!Array.isArray(b.rows) || !b.rows.length) return c.json({ error: 'rows required' }, 400);
  const stmts: D1PreparedStatement[] = [];
  const ids: string[] = [];
  for (const row of b.rows) {
    const txnId = crypto.randomUUID(); ids.push(txnId);
    stmts.push(c.env.DB.prepare('INSERT INTO transactions (id,org_id,date,description,reference,created_by) VALUES (?,?,?,?,?,?)').bind(txnId, orgId, row.date, row.description, row.reference ?? null, userId));
    stmts.push(c.env.DB.prepare('INSERT INTO transaction_lines (transaction_id,account_id,debit,credit) VALUES (?,?,?,0)').bind(txnId, row.debit_account_id, row.amount));
    stmts.push(c.env.DB.prepare('INSERT INTO transaction_lines (transaction_id,account_id,debit,credit) VALUES (?,?,0,?)').bind(txnId, row.credit_account_id, row.amount));
  }
  await c.env.DB.batch(stmts);
  track(c.env, orgId, 'import_completed', { type: String(b.rows.length) });
  return c.json({ imported: b.rows.length, ids });
});

// ── Reports ───────────────────────────────────────────────────────────────────
app.get('/reports/trial-balance', async (c) => {
  const { orgId } = c.get('org');
  const as_of = c.req.query('as_of') ?? new Date().toISOString().slice(0, 10);
  const key = ck(orgId, 'tb', as_of);
  const cached = await c.env.REPORT_CACHE.get(key, 'json');
  if (cached) return c.json(cached);
  const { results } = await c.env.DB.prepare(
    'SELECT ba.id,ba.code,ba.name,ba.type,ba.subtype,COALESCE(SUM(tl.debit),0) as total_debit,COALESCE(SUM(tl.credit),0) as total_credit,COALESCE(SUM(tl.debit),0)-COALESCE(SUM(tl.credit),0) as balance FROM bookkeeping_accounts ba LEFT JOIN transaction_lines tl ON tl.account_id=ba.id LEFT JOIN transactions t ON t.id=tl.transaction_id AND t.status=\\'POSTED\\' AND t.date<=? AND t.org_id=? WHERE ba.org_id=? AND ba.is_active=1 GROUP BY ba.id ORDER BY ba.code,ba.name'
  ).bind(as_of, orgId, orgId).all();
  const report = { as_of, generated_at: new Date().toISOString(), rows: results };
  await c.env.REPORT_CACHE.put(key, JSON.stringify(report), { expirationTtl: 300 });
  return c.json(report);
});

app.get('/reports/pl', async (c) => {
  const { orgId } = c.get('org');
  const now = new Date();
  const from = c.req.query('from') ?? now.getFullYear() + '-01-01';
  const to   = c.req.query('to')   ?? now.toISOString().slice(0, 10);
  const key = ck(orgId, 'pl', from + ':' + to);
  const cached = await c.env.REPORT_CACHE.get(key, 'json');
  if (cached) return c.json(cached);
  const { results } = await c.env.DB.prepare(
    "SELECT ba.type,ba.subtype,ba.code,ba.name,COALESCE(SUM(tl.credit),0)-COALESCE(SUM(tl.debit),0) as amount FROM bookkeeping_accounts ba JOIN transaction_lines tl ON tl.account_id=ba.id JOIN transactions t ON t.id=tl.transaction_id AND t.status='POSTED' AND t.date BETWEEN ? AND ? AND t.org_id=? WHERE ba.org_id=? AND ba.type IN ('REVENUE','EXPENSE') GROUP BY ba.id ORDER BY ba.type,ba.code"
  ).bind(from, to, orgId, orgId).all<{ type: string; subtype: string; code: string; name: string; amount: number }>();
  const revenue  = results.filter((r) => r.type === 'REVENUE');
  const expenses = results.filter((r) => r.type === 'EXPENSE');
  const totalRevenue  = revenue.reduce((s, r) => s + r.amount, 0);
  const totalExpenses = expenses.reduce((s, r) => s + Math.abs(r.amount), 0);
  const report = { period: { from, to }, generated_at: new Date().toISOString(), revenue, expenses, totalRevenue, totalExpenses, netIncome: totalRevenue - totalExpenses };
  await c.env.REPORT_CACHE.put(key, JSON.stringify(report), { expirationTtl: 300 });
  track(c.env, orgId, 'report_pl_viewed');
  return c.json(report);
});

app.get('/reports/balance-sheet', async (c) => {
  const { orgId } = c.get('org');
  const as_of = c.req.query('as_of') ?? new Date().toISOString().slice(0, 10);
  const { results } = await c.env.DB.prepare(
    "SELECT ba.type,ba.subtype,ba.code,ba.name,COALESCE(SUM(tl.debit),0)-COALESCE(SUM(tl.credit),0) as balance FROM bookkeeping_accounts ba LEFT JOIN transaction_lines tl ON tl.account_id=ba.id LEFT JOIN transactions t ON t.id=tl.transaction_id AND t.status='POSTED' AND t.date<=? AND t.org_id=? WHERE ba.org_id=? AND ba.type IN ('ASSET','LIABILITY','EQUITY') GROUP BY ba.id ORDER BY ba.type,ba.code"
  ).bind(as_of, orgId, orgId).all<{ type: string; subtype: string; code: string; name: string; balance: number }>();
  const assets = results.filter((r) => r.type === 'ASSET');
  const liabs  = results.filter((r) => r.type === 'LIABILITY');
  const equity = results.filter((r) => r.type === 'EQUITY');
  const ta = assets.reduce((s, r) => s + r.balance, 0);
  const tl = liabs.reduce((s, r)  => s + Math.abs(r.balance), 0);
  const te = equity.reduce((s, r) => s + Math.abs(r.balance), 0);
  return c.json({ as_of, generated_at: new Date().toISOString(), assets, liabilities: liabs, equity, totalAssets: ta, totalLiabilities: tl, totalEquity: te, balanced: Math.abs(ta - (tl + te)) < 0.01 });
});

export default app;
`);

// ══════════════════════════════════════════════════════════════
//  APP: insighthunter-bizforma
// ══════════════════════════════════════════════════════════════

console.log('\\n🏢  insighthunter-bizforma\\n');

w('apps/insighthunter-bizforma/package.json', `\\
{
  "name": "insighthunter-bizforma",
  "version": "1.0.0",
  "private": true,
  "scripts": {
    "dev":        "wrangler dev",
    "deploy":     "wrangler deploy",
    "db:migrate": "wrangler d1 execute insighthunter-bizforma --file=src/db/schema.sql"
  },
  "dependencies": {
    "hono": "^4.4.0"
  },
  "devDependencies": {
    "@cloudflare/workers-types": "^4.20240529.0",
    "typescript": "^5.4.5",
    "wrangler": "^3.57.0"
  }
}
`);

w('apps/insighthunter-bizforma/tsconfig.json', `\\
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ES2022",
    "moduleResolution": "bundler",
    "lib": ["ES2022"],
    "types": ["@cloudflare/workers-types"],
    "strict": true,
    "skipLibCheck": true
  },
  "include": ["src/**/*.ts"]
}
`);

w('apps/insighthunter-bizforma/wrangler.jsonc', `\\
{
  "name": "insighthunter-bizforma",
  "main": "src/index.ts",
  "compatibility_date": "2025-03-07",
  "compatibility_flags": ["nodejs_compat"],
  "observability": { "enabled": true, "head_sampling_rate": 1 },

  "d1_databases": [{
    "binding": "DB",
    "database_name": "insighthunter-bizforma",
    "database_id": "REPLACE_WITH_D1_ID"
  }],

  "r2_buckets": [{
    "binding": "DOCUMENTS",
    "bucket_name": "ih-bizforma-docs"
  }],

  "kv_namespaces": [{
    "binding": "CACHE",
    "id": "REPLACE_WITH_KV_ID"
  }],

  "analytics_engine_datasets": [{
    "binding": "BIZ_EVENTS",
    "dataset": "ih_bizforma_events"
  }],

  "durable_objects": {
    "bindings": [
      { "name": "FORMATION_AGENT", "class_name": "FormationAgent" },
      { "name": "COMPLIANCE_AGENT", "class_name": "ComplianceAgent" }
    ]
  },
  "migrations": [{ "tag": "v1", "new_classes": ["FormationAgent", "ComplianceAgent"] }],

  "vars": {
    "ENVIRONMENT": "production",
    "BOOKKEEPING_WORKER_URL": "https://insighthunter-bookkeeping.REPLACE.workers.dev"
  },

  "secrets": ["JWT_SECRET", "WORKERS_AI_TOKEN"]
}
`);

w('apps/insighthunter-bizforma/src/db/schema.sql', `\\
CREATE TABLE IF NOT EXISTS formation_cases (
  id            TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  org_id        TEXT NOT NULL,
  user_id       TEXT NOT NULL,
  status        TEXT NOT NULL DEFAULT 'QUESTIONNAIRE'
                  CHECK(status IN ('QUESTIONNAIRE','ENTITY_SELECTED','EIN_PENDING','EIN_COMPLETE','STATE_PENDING','STATE_COMPLETE','TAX_SETUP','COMPLETE')),
  entity_type   TEXT CHECK(entity_type IN ('SOLE_PROP','LLC','S_CORP','C_CORP','PARTNERSHIP','NONPROFIT')),
  business_name TEXT,
  state         TEXT,
  created_at    TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at    TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_fc_org ON formation_cases(org_id);

CREATE TABLE IF NOT EXISTS questionnaire_answers (
  id         TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  case_id    TEXT NOT NULL REFERENCES formation_cases(id) ON DELETE CASCADE,
  question   TEXT NOT NULL,
  answer     TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS ein_applications (
  id           TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  case_id      TEXT NOT NULL REFERENCES formation_cases(id),
  status       TEXT NOT NULL DEFAULT 'PENDING' CHECK(status IN ('PENDING','SUBMITTED','APPROVED','REJECTED')),
  ein          TEXT,
  submitted_at TEXT,
  approved_at  TEXT,
  created_at   TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS state_registrations (
  id           TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  case_id      TEXT NOT NULL REFERENCES formation_cases(id),
  state        TEXT NOT NULL,
  status       TEXT NOT NULL DEFAULT 'PENDING' CHECK(status IN ('PENDING','FILED','APPROVED','REJECTED')),
  filing_fee   REAL,
  filed_at     TEXT,
  approved_at  TEXT,
  created_at   TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS compliance_events (
  id          TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  org_id      TEXT NOT NULL,
  case_id     TEXT REFERENCES formation_cases(id),
  type        TEXT NOT NULL,
  title       TEXT NOT NULL,
  due_date    TEXT NOT NULL,
  status      TEXT NOT NULL DEFAULT 'PENDING' CHECK(status IN ('PENDING','COMPLETE','WAIVED','OVERDUE')),
  notes       TEXT,
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_ce_org_due ON compliance_events(org_id, due_date);
`);

w('apps/insighthunter-bizforma/src/types.ts', `\\
export interface Env {
  DB: D1Database;
  DOCUMENTS: R2Bucket;
  CACHE: KVNamespace;
  BIZ_EVENTS: AnalyticsEngineDataset;
  FORMATION_AGENT: DurableObjectNamespace;
  COMPLIANCE_AGENT: DurableObjectNamespace;
  JWT_SECRET: string;
  BOOKKEEPING_WORKER_URL: string;
  WORKERS_AI_TOKEN: string;
  ENVIRONMENT: string;
}

export interface OrgCtx { orgId: string; userId: string; }

export interface FormationCase {
  id: string; org_id: string; user_id: string; status: string;
  entity_type: string | null; business_name: string | null; state: string | null;
  created_at: string; updated_at: string;
}

export interface ComplianceEvent {
  id: string; org_id: string; case_id: string | null; type: string;
  title: string; due_date: string; status: string; notes: string | null; created_at: string;
}
`);

w('apps/insighthunter-bizforma/src/utils/entityMatrix.ts', `\\
// Scoring weights for entity type recommendation
interface Answer { key: string; value: string; }

const WEIGHTS: Record<string, Record<string, Partial<Record<string, number>>>> = {
  revenue_expect: {
    under_50k:  { SOLE_PROP: 3, LLC: 2 },
    '50k_250k': { LLC: 3, S_CORP: 2 },
    over_250k:  { S_CORP: 3, C_CORP: 2 },
  },
  team_size: {
    just_me:      { SOLE_PROP: 3, LLC: 2 },
    small_team:   { LLC: 3, S_CORP: 2 },
    growing_fast: { C_CORP: 3, S_CORP: 2 },
  },
  liability_concern: {
    high:   { LLC: 3, S_CORP: 3, C_CORP: 3 },
    medium: { LLC: 2, S_CORP: 2 },
    low:    { SOLE_PROP: 2 },
  },
  investor_funding: {
    yes_vc:      { C_CORP: 5 },
    yes_angels:  { C_CORP: 3, S_CORP: 2 },
    no:          { LLC: 2, SOLE_PROP: 1 },
  },
};

export function scoreEntity(answers: Answer[]): Array<{ type: string; score: number }> {
  const scores: Record<string, number> = { SOLE_PROP: 0, LLC: 0, S_CORP: 0, C_CORP: 0, PARTNERSHIP: 0 };
  for (const { key, value } of answers) {
    const w = WEIGHTS[key]?.[value];
    if (w) Object.entries(w).forEach(([type, pts]) => { scores[type] = (scores[type] ?? 0) + (pts ?? 0); });
  }
  return Object.entries(scores).sort((a, b) => b[1] - a[1]).map(([type, score]) => ({ type, score }));
}
`);

w('apps/insighthunter-bizforma/src/utils/stateRules.ts', `\\
// Per-state filing fees and timelines
export interface StateRule {
  name: string; fee: number; timeline_days: number; annual_report: boolean; annual_fee: number;
}

export const STATE_RULES: Record<string, StateRule> = {
  DE: { name: 'Delaware',    fee: 90,  timeline_days: 5,  annual_report: true,  annual_fee: 300 },
  WY: { name: 'Wyoming',     fee: 100, timeline_days: 7,  annual_report: true,  annual_fee: 60  },
  NV: { name: 'Nevada',      fee: 425, timeline_days: 10, annual_report: true,  annual_fee: 350 },
  TX: { name: 'Texas',       fee: 300, timeline_days: 14, annual_report: false, annual_fee: 0   },
  FL: { name: 'Florida',     fee: 125, timeline_days: 7,  annual_report: true,  annual_fee: 138 },
  CA: { name: 'California',  fee: 70,  timeline_days: 15, annual_report: true,  annual_fee: 800 },
  NY: { name: 'New York',    fee: 200, timeline_days: 21, annual_report: true,  annual_fee: 9   },
  VA: { name: 'Virginia',    fee: 100, timeline_days: 7,  annual_report: true,  annual_fee: 50  },
  MD: { name: 'Maryland',    fee: 100, timeline_days: 14, annual_report: true,  annual_fee: 300 },
  IL: { name: 'Illinois',    fee: 150, timeline_days: 14, annual_report: true,  annual_fee: 75  },
};

export function getStateRule(code: string): StateRule | null {
  return STATE_RULES[code.toUpperCase()] ?? null;
}
`);

w('apps/insighthunter-bizforma/src/services/bookkeepingHandoffService.ts', `\\
import type { Env } from '../types';

export async function seedBookkeepingCoA(orgId: string, env: Env): Promise<void> {
  try {
    const res = await fetch(env.BOOKKEEPING_WORKER_URL + '/seed', {
      method: 'POST',
      headers: { 'X-Internal-Secret': env.JWT_SECRET, 'X-Org-Id': orgId, 'Content-Type': 'application/json' },
    });
    const data = await res.json<{ seeded: boolean; count?: number }>();
    console.log('[BookkeepingHandoff]', { orgId, ...data });
  } catch (e) {
    console.error('[BookkeepingHandoff] Failed', orgId, e);
  }
}
`);

w('apps/insighthunter-bizforma/src/agents/FormationAgent.ts', `\\
import { DurableObject } from 'cloudflare:workers';
import type { Env } from '../types';

interface FormationState {
  caseId: string;
  status: string;
  entityType: string | null;
  answers: Array<{ key: string; value: string }>;
  lastUpdated: string;
}

export class FormationAgent extends DurableObject<Env> {
  private state: FormationState = { caseId: '', status: 'QUESTIONNAIRE', entityType: null, answers: [], lastUpdated: '' };

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;

    if (request.method === 'GET' && path === '/state') {
      const stored = await this.ctx.storage.get<FormationState>('state');
      return Response.json(stored ?? this.state);
    }

    if (request.method === 'POST' && path === '/init') {
      const { caseId } = await request.json<{ caseId: string }>();
      this.state = { caseId, status: 'QUESTIONNAIRE', entityType: null, answers: [], lastUpdated: new Date().toISOString() };
      await this.ctx.storage.put('state', this.state);
      return Response.json({ ok: true });
    }

    if (request.method === 'POST' && path === '/advance') {
      const { status } = await request.json<{ status: string }>();
      const current = await this.ctx.storage.get<FormationState>('state') ?? this.state;
      current.status = status; current.lastUpdated = new Date().toISOString();
      await this.ctx.storage.put('state', current);
      return Response.json({ ok: true, status });
    }

    return Response.json({ error: 'Not found' }, { status: 404 });
  }
}
`);

w('apps/insighthunter-bizforma/src/agents/ComplianceAgent.ts', `\\
import { DurableObject } from 'cloudflare:workers';
import type { Env } from '../types';

export class ComplianceAgent extends DurableObject<Env> {
  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    if (request.method === 'POST' && url.pathname === '/schedule') {
      const { orgId, dueDate, title, type } = await request.json<{ orgId: string; dueDate: string; title: string; type: string }>();
      const ms = new Date(dueDate).getTime() - Date.now();
      if (ms > 0) await this.ctx.storage.setAlarm(Date.now() + ms);
      await this.ctx.storage.put('pending', { orgId, dueDate, title, type });
      return Response.json({ scheduled: true });
    }
    return Response.json({ error: 'Not found' }, { status: 404 });
  }

  async alarm(): Promise<void> {
    const data = await this.ctx.storage.get<{ orgId: string; title: string }>('pending');
    if (data) console.log('[ComplianceAgent] Reminder due:', data.orgId, data.title);
  }
}
`);

w('apps/insighthunter-bizforma/src/index.ts', `\\
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { jwt } from 'hono/jwt';
import type { Env, OrgCtx, FormationCase } from './types';
import { scoreEntity } from './utils/entityMatrix';
import { getStateRule } from './utils/stateRules';
import { seedBookkeepingCoA } from './services/bookkeepingHandoffService';
export { FormationAgent } from './agents/FormationAgent';
export { ComplianceAgent } from './agents/ComplianceAgent';

const app = new Hono<{ Bindings: Env; Variables: { org: OrgCtx } }>();

app.use('*', cors({ origin: (o) => o ?? '*', allowHeaders: ['Authorization','Content-Type'], allowMethods: ['GET','POST','PUT','PATCH','DELETE','OPTIONS'], credentials: true }));

app.use('*', async (c, next) => {
  const auth = c.req.header('Authorization');
  if (!auth?.startsWith('Bearer ')) return c.json({ error: 'Unauthorized' }, 401);
  try { return await jwt({ secret: c.env.JWT_SECRET })(c, next as never) as never; }
  catch { return c.json({ error: 'Invalid token' }, 401); }
});

function track(env: Env, orgId: string, event: string): void {
  env.BIZ_EVENTS.writeDataPoint({ blobs: [event, orgId], doubles: [1], indexes: [orgId] });
}

// ── Formation Cases ───────────────────────────────────────────────────────────
app.get('/cases', async (c) => {
  const org = c.get('org');
  const { results } = await c.env.DB.prepare('SELECT * FROM formation_cases WHERE org_id=? ORDER BY created_at DESC').bind(org.orgId).all<FormationCase>();
  return c.json({ cases: results });
});

app.post('/cases', async (c) => {
  const { orgId, userId } = c.get('org');
  const b = await c.req.json<{ business_name?: string; state?: string }>();
  const row = await c.env.DB.prepare('INSERT INTO formation_cases (org_id,user_id,business_name,state) VALUES (?,?,?,?) RETURNING *')
    .bind(orgId, userId, b.business_name ?? null, b.state ?? null).first<FormationCase>();
  if (!row) return c.json({ error: 'Failed' }, 500);
  const id = c.env.FORMATION_AGENT.idFromName(row.id);
  await c.env.FORMATION_AGENT.get(id).fetch(new Request('https://agent/init', { method: 'POST', body: JSON.stringify({ caseId: row.id }) }));
  track(c.env, orgId, 'case_created');
  return c.json({ case: row }, 201);
});

app.get('/cases/:id', async (c) => {
  const { orgId } = c.get('org');
  const { id } = c.req.param();
  const row = await c.env.DB.prepare('SELECT * FROM formation_cases WHERE id=? AND org_id=?').bind(id, orgId).first<FormationCase>();
  if (!row) return c.json({ error: 'Not found' }, 404);
  const { results: answers } = await c.env.DB.prepare('SELECT * FROM questionnaire_answers WHERE case_id=?').bind(id).all();
  const { results: einApps } = await c.env.DB.prepare('SELECT * FROM ein_applications WHERE case_id=?').bind(id).all();
  const { results: stateRegs } = await c.env.DB.prepare('SELECT * FROM state_registrations WHERE case_id=?').bind(id).all();
  return c.json({ case: row, answers, ein_applications: einApps, state_registrations: stateRegs });
});

app.patch('/cases/:id', async (c) => {
  const { orgId } = c.get('org');
  const { id } = c.req.param();
  const b = await c.req.json<Partial<FormationCase>>();
  const existing = await c.env.DB.prepare('SELECT id,status FROM formation_cases WHERE id=? AND org_id=?').bind(id, orgId).first<{ id: string; status: string }>();
  if (!existing) return c.json({ error: 'Not found' }, 404);
  const fields: string[] = []; const vals: unknown[] = [];
  if (b.status)        { fields.push('status=?');        vals.push(b.status); }
  if (b.entity_type)   { fields.push('entity_type=?');   vals.push(b.entity_type); }
  if (b.business_name) { fields.push('business_name=?'); vals.push(b.business_name); }
  if (b.state)         { fields.push('state=?');         vals.push(b.state); }
  if (!fields.length) return c.json({ error: 'Nothing to update' }, 400);
  fields.push("updated_at=datetime('now')"); vals.push(id, orgId);
  const updated = await c.env.DB.prepare('UPDATE formation_cases SET ' + fields.join(',') + ' WHERE id=? AND org_id=? RETURNING *').bind(...vals).first<FormationCase>();
  // Trigger bookkeeping CoA seed when formation reaches COMPLETE
  if (b.status === 'COMPLETE') await seedBookkeepingCoA(orgId, c.env);
  // Sync agent state
  const agentId = c.env.FORMATION_AGENT.idFromName(id);
  if (b.status) await c.env.FORMATION_AGENT.get(agentId).fetch(new Request('https://agent/advance', { method: 'POST', body: JSON.stringify({ status: b.status }) }));
  track(c.env, orgId, 'case_updated');
  return c.json({ case: updated });
});

// ── Entity Determination (AI scoring) ────────────────────────────────────────
app.post('/cases/:id/answers', async (c) => {
  const { orgId } = c.get('org');
  const { id } = c.req.param();
  const b = await c.req.json<{ answers: Array<{ key: string; value: string }> }>();
  if (!Array.isArray(b.answers)) return c.json({ error: 'answers required' }, 400);
  await c.env.DB.batch(b.answers.map((a) =>
    c.env.DB.prepare('INSERT OR REPLACE INTO questionnaire_answers (case_id,question,answer) VALUES (?,?,?)').bind(id, a.key, a.value)
  ));
  const scores = scoreEntity(b.answers);
  return c.json({ scores, recommended: scores[0]?.type ?? 'LLC' });
});

// ── EIN Applications ──────────────────────────────────────────────────────────
app.post('/cases/:id/ein', async (c) => {
  const { orgId } = c.get('org');
  const { id } = c.req.param();
  const caseRow = await c.env.DB.prepare('SELECT * FROM formation_cases WHERE id=? AND org_id=?').bind(id, orgId).first<FormationCase>();
  if (!caseRow) return c.json({ error: 'Case not found' }, 404);
  if (!caseRow.entity_type) return c.json({ error: 'Entity type must be set first' }, 400);
  const existing = await c.env.DB.prepare("SELECT id FROM ein_applications WHERE case_id=? AND status NOT IN ('REJECTED')").bind(id).first();
  if (existing) return c.json({ error: 'EIN application already exists' }, 409);
  const row = await c.env.DB.prepare('INSERT INTO ein_applications (case_id) VALUES (?) RETURNING *').bind(id).first();
  await c.env.DB.prepare("UPDATE formation_cases SET status='EIN_PENDING',updated_at=datetime('now') WHERE id=?").bind(id).run();
  track(c.env, orgId, 'ein_applied');
  return c.json({ ein_application: row }, 201);
});

app.patch('/cases/:id/ein/:einId', async (c) => {
  const { orgId } = c.get('org');
  const { id, einId } = c.req.param();
  const b = await c.req.json<{ status: string; ein?: string }>();
  const caseRow = await c.env.DB.prepare('SELECT id FROM formation_cases WHERE id=? AND org_id=?').bind(id, orgId).first();
  if (!caseRow) return c.json({ error: 'Not found' }, 404);
  const row = await c.env.DB.prepare("UPDATE ein_applications SET status=?,ein=?,approved_at=CASE WHEN ?='APPROVED' THEN datetime('now') ELSE approved_at END WHERE id=? RETURNING *")
    .bind(b.status, b.ein ?? null, b.status, einId).first();
  if (b.status === 'APPROVED') await c.env.DB.prepare("UPDATE formation_cases SET status='EIN_COMPLETE',updated_at=datetime('now') WHERE id=?").bind(id).run();
  return c.json({ ein_application: row });
});

// ── State Registration ────────────────────────────────────────────────────────
app.post('/cases/:id/state-registration', async (c) => {
  const { orgId } = c.get('org');
  const { id } = c.req.param();
  const b = await c.req.json<{ state: string }>();
  const rule = getStateRule(b.state);
  if (!rule) return c.json({ error: 'Unknown state: ' + b.state }, 400);
  const row = await c.env.DB.prepare('INSERT INTO state_registrations (case_id,state,filing_fee) VALUES (?,?,?) RETURNING *').bind(id, b.state.toUpperCase(), rule.fee).first();
  await c.env.DB.prepare("UPDATE formation_cases SET status='STATE_PENDING',state=?,updated_at=datetime('now') WHERE id=?").bind(b.state.toUpperCase(), id).run();
  track(c.env, orgId, 'state_registration_filed');
  return c.json({ state_registration: row, rule }, 201);
});

app.get('/state-rules/:state', (c) => {
  const rule = getStateRule(c.req.param('state'));
  if (!rule) return c.json({ error: 'Not found' }, 404);
  return c.json({ rule });
});

// ── Compliance Events ─────────────────────────────────────────────────────────
app.get('/compliance', async (c) => {
  const { orgId } = c.get('org');
  const { from, to, status } = c.req.query();
  let sql = 'SELECT * FROM compliance_events WHERE org_id=?';
  const p: unknown[] = [orgId];
  if (from)   { sql += ' AND due_date>=?'; p.push(from); }
  if (to)     { sql += ' AND due_date<=?'; p.push(to); }
  if (status) { sql += ' AND status=?';    p.push(status); }
  sql += ' ORDER BY due_date ASC';
  const { results } = await c.env.DB.prepare(sql).bind(...p).all();
  return c.json({ events: results });
});

app.post('/compliance', async (c) => {
  const { orgId } = c.get('org');
  const b = await c.req.json<{ title: string; type: string; due_date: string; case_id?: string; notes?: string }>();
  if (!b.title || !b.type || !b.due_date) return c.json({ error: 'title, type, due_date required' }, 400);
  const row = await c.env.DB.prepare('INSERT INTO compliance_events (org_id,case_id,type,title,due_date,notes) VALUES (?,?,?,?,?,?) RETURNING *')
    .bind(orgId, b.case_id ?? null, b.type, b.title, b.due_date, b.notes ?? null).first();
  // Schedule reminder via ComplianceAgent
  const agentId = c.env.COMPLIANCE_AGENT.idFromName(orgId + ':' + b.due_date);
  await c.env.COMPLIANCE_AGENT.get(agentId).fetch(new Request('https://agent/schedule', { method: 'POST', body: JSON.stringify({ orgId, dueDate: b.due_date, title: b.title, type: b.type }) }));
  return c.json({ event: row }, 201);
});

app.patch('/compliance/:id', async (c) => {
  const { orgId } = c.get('org');
  const { id } = c.req.param();
  const b = await c.req.json<{ status?: string; notes?: string }>();
  const fields: string[] = []; const vals: unknown[] = [];
  if (b.status) { fields.push('status=?'); vals.push(b.status); }
  if (b.notes != null) { fields.push('notes=?'); vals.push(b.notes); }
  if (!fields.length) return c.json({ error: 'Nothing to update' }, 400);
  vals.push(id, orgId);
  const row = await c.env.DB.prepare('UPDATE compliance_events SET ' + fields.join(',') + ' WHERE id=? AND org_id=? RETURNING *').bind(...vals).first();
  if (!row) return c.json({ error: 'Not found' }, 404);
  return c.json({ event: row });
});

// ── Document Upload ───────────────────────────────────────────────────────────
app.post('/documents/upload', async (c) => {
  const { orgId } = c.get('org');
  const fd = await c.req.formData();
  const file = fd.get('file') as File | null;
  const caseId = fd.get('case_id') as string | null;
  if (!file) return c.json({ error: 'No file' }, 400);
  const key = 'docs/' + orgId + '/' + (caseId ?? 'general') + '/' + crypto.randomUUID() + '-' + file.name;
  await c.env.DOCUMENTS.put(key, await file.arrayBuffer(), { httpMeta: { contentType: file.type }, customMeta: { orgId, caseId: caseId ?? '' } });
  return c.json({ key, filename: file.name, size: file.size }, 201);
});

app.get('/documents/:key{.+}', async (c) => {
  const { orgId } = c.get('org');
  const key = c.req.param('key');
  if (!key.startsWith('docs/' + orgId + '/')) return c.json({ error: 'Forbidden' }, 403);
  const obj = await c.env.DOCUMENTS.get(key);
  if (!obj) return c.json({ error: 'Not found' }, 404);
  return new Response(obj.body, { headers: { 'Content-Type': obj.httpMetadata?.contentType ?? 'application/octet-stream' } });
});

export default app;
`);

// ══════════════════════════════════════════════════════════════
//  APP: insighthunter-main (Astro + Svelte)
// ══════════════════════════════════════════════════════════════

console.log('\\n🌐  insighthunter-main\\n');

w('apps/insighthunter-main/package.json', `\\
{
  "name": "insighthunter-main",
  "version": "1.0.0",
  "private": true,
  "scripts": {
    "dev":   "astro dev",
    "build": "astro build",
    "deploy": "astro build && wrangler pages deploy dist"
  },
  "dependencies": {
    "@astrojs/cloudflare": "^11.0.0",
    "@astrojs/svelte": "^6.0.0",
    "astro": "^4.10.0",
    "svelte": "^5.0.0"
  },
  "devDependencies": {
    "@cloudflare/workers-types": "^4.20240529.0",
    "typescript": "^5.4.5",
    "wrangler": "^3.57.0",
    "sass": "^1.77.0"
  }
}
`);

w('apps/insighthunter-main/tsconfig.json', `\\
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ES2022",
    "moduleResolution": "bundler",
    "lib": ["ES2022", "DOM"],
    "types": ["@cloudflare/workers-types", "astro/client"],
    "strict": true,
    "skipLibCheck": true,
    "jsx": "preserve"
  },
  "include": ["src/**/*.ts", "src/**/*.tsx", "src/**/*.astro", "functions/**/*.ts"]
}
`);

w('apps/insighthunter-main/astro.config.mjs', `\\
import { defineConfig } from 'astro/config';
import cloudflare from '@astrojs/cloudflare';
import svelte from '@astrojs/svelte';

export default defineConfig({
  output: 'server',
  adapter: cloudflare({ mode: 'directory' }),
  integrations: [svelte()],
  vite: {
    css: { preprocessorOptions: { scss: { additionalData: '@use "./src/styles/theme" as *;' } } },
  },
});
`);

w('apps/insighthunter-main/wrangler.jsonc', `\\
{
  "name": "insighthunter-main",
  "pages_build_output_dir": "dist",
  "compatibility_date": "2025-03-07",
  "compatibility_flags": ["nodejs_compat"],
  "observability": { "enabled": true },
  "services": [
    { "binding": "BOOKKEEPING_WORKER", "service": "insighthunter-bookkeeping" },
    { "binding": "BIZFORMA_WORKER",    "service": "insighthunter-bizforma" }
  ],
  "kv_namespaces": [{ "binding": "SESSIONS", "id": "REPLACE_WITH_KV_ID" }],
  "vars": { "PUBLIC_APP_URL": "https://insighthunter.app" },
  "secrets": ["JWT_SECRET"]
}
`);

// ── Styles ───────────────────────────────────────────────────────────────────

w('apps/insighthunter-main/src/styles/theme.scss', `\\
// ─── Sandtaupe Palette ────────────────────────────────────────────────────────
:root {
  // Sand tones
  --color-sand-50:   #fdf8f0;
  --color-sand-100:  #faf0dc;
  --color-sand-200:  #f5e0b8;
  --color-sand-300:  #eeca87;
  --color-sand-400:  #e6b05a;
  --color-sand-500:  #d4943a;
  --color-sand-600:  #b87a2d;
  --color-sand-700:  #96611f;
  --color-sand-800:  #7a4e1a;
  --color-sand-900:  #5c3a12;

  // Taupe tones
  --color-taupe-50:  #fafaf9;
  --color-taupe-100: #f5f4f2;
  --color-taupe-200: #e8e6e2;
  --color-taupe-300: #d5d2cc;
  --color-taupe-400: #a9a49c;
  --color-taupe-500: #7d7870;
  --color-taupe-600: #625e57;
  --color-taupe-700: #4a4740;
  --color-taupe-800: #342f29;
  --color-taupe-900: #1e1b16;

  // Semantic
  --color-bg:        var(--color-taupe-50);
  --color-surface:   #ffffff;
  --color-border:    var(--color-taupe-200);
  --color-text:      var(--color-taupe-800);
  --color-muted:     var(--color-taupe-500);
  --color-primary:   var(--color-sand-600);
  --color-primary-hover: var(--color-sand-700);

  // Spacing scale
  --space-1:  4px;   --space-2:  8px;   --space-3:  12px;
  --space-4:  16px;  --space-5:  20px;  --space-6:  24px;
  --space-8:  32px;  --space-10: 40px;  --space-12: 48px;
  --space-16: 64px;

  // Typography
  --text-xs:   0.75rem;
  --text-sm:   0.875rem;
  --text-base: 1rem;
  --text-lg:   1.125rem;
  --text-xl:   1.25rem;
  --text-2xl:  1.5rem;
  --text-3xl:  1.875rem;
  --text-4xl:  2.25rem;

  // Radii
  --radius-sm: 4px;   --radius-md: 8px;
  --radius-lg: 12px;  --radius-xl: 16px;  --radius-full: 9999px;

  // Shadows
  --shadow-sm:  0 1px 2px rgba(0,0,0,0.05);
  --shadow-md:  0 4px 6px rgba(0,0,0,0.07);
  --shadow-lg:  0 10px 15px rgba(0,0,0,0.10);
  --shadow-xl:  0 20px 25px rgba(0,0,0,0.15);

  // Sidebar
  --sidebar-w:      240px;
  --topbar-h:       56px;
}
`);

w('apps/insighthunter-main/src/styles/globals.scss', `\\
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

html { font-size: 16px; -webkit-font-smoothing: antialiased; }

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
  background: var(--color-bg);
  color: var(--color-text);
  line-height: 1.5;
}

a { color: var(--color-primary); text-decoration: none; }
a:hover { text-decoration: underline; }

button { font-family: inherit; }

input, select, textarea {
  font-family: inherit;
  outline: none;
}
input:focus, select:focus, textarea:focus {
  border-color: var(--color-sand-400) !important;
  box-shadow: 0 0 0 3px rgba(214,148,58,0.15);
}

/* Utility classes */
.sr-only { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0,0,0,0); }
.truncate { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
`);

// ── Types ────────────────────────────────────────────────────────────────────

w('apps/insighthunter-main/src/types/index.ts', `\\
export interface AuthUser {
  id: string;
  email: string;
  name: string;
  orgId: string;
  tier: 'free' | 'lite' | 'standard' | 'pro' | 'white_label';
}

export interface Session {
  user: AuthUser;
  accessToken: string;
  expiresAt: number;
}

export interface OrgContext {
  orgId: string;
  orgName: string;
  tier: string;
}

export interface AppDefinition {
  slug: string;
  name: string;
  description: string;
  icon: string;
  route: string;
  tier: string[];
}
`);

// ── App Data ─────────────────────────────────────────────────────────────────

w('apps/insighthunter-main/src/data/apps.ts', `\\
import type { AppDefinition } from '../types';

export const APPS: AppDefinition[] = [
  { slug: 'dashboard',   name: 'Dashboard',   description: 'Central command',    icon: '📊', route: '/dashboard',      tier: ['free', 'lite', 'standard', 'pro'] },
  { slug: 'bookkeeping', name: 'Bookkeeping', description: 'Financial records',  icon: '📚', route: '/bookkeeping',    tier: ['lite', 'standard', 'pro'] },
  { slug: 'payroll',     name: 'Payroll',     description: 'Manage employees',   icon: '💰', route: '/payroll',        tier: ['standard', 'pro'] },
  { slug: 'reports',     name: 'Reports',     description: 'Financial insights', icon: '📈', route: '/reports',        tier: ['standard', 'pro'] },
  { slug: 'bizforma',    name: 'BizForma',    description: 'Form a company',     icon: '🏢', route: '/bizforma/start', tier: ['free', 'lite', 'standard', 'pro'] },
  { slug: 'ai',          name: 'InsightAI',   description: 'AI assistant',       icon: '🤖', route: '/ai/chat',        tier: ['pro'] },
];
`);

// ── Marketing & Dashboard Pages ──────────────────────────────────────────────

w('apps/insighthunter-main/src/pages/index.astro', `\\
---
import MainLayout from '../layouts/MainLayout.astro';
---
<MainLayout title="InsightHunter">
  <h1>Welcome to InsightHunter</h1>
  <p>Business intelligence at your fingertips.</p>
  <a href="/dashboard">Go to Dashboard</a>
</MainLayout>
`);

w('apps/insighthunter-main/src/pages/dashboard/index.astro', `\\
---
import AppLayout from '../../layouts/AppLayout.astro';
import AppGrid from '../../components/AppGrid.svelte';
import { APPS } from '../../data/apps';
---
<AppLayout title="Dashboard">
  <h2>Applications</h2>
  <AppGrid apps={APPS} client:load />
</AppLayout>
`);

w('apps/insighthunter-main/src/layouts/MainLayout.astro', `\\
---
interface Props { title: string; }
const { title } = Astro.props;
import '../styles/globals.scss';
---
<!doctype html>
<html>
  <head>
    <title>{title}</title>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width" />
    <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
  </head>
  <body>
    <header>
      <nav>
        <a href="/">Home</a>
        <a href="/pricing">Pricing</a>
        <a href="/login">Login</a>
      </nav>
    </header>
    <main>
      <slot />
    </main>
  </body>
</html>
`);

w('apps/insighthunter-main/src/layouts/AppLayout.astro', `\\
---
interface Props { title: string; }
const { title } = Astro.props;
import '../styles/globals.scss';
import Sidebar from '../components/Sidebar.svelte';
---
<!doctype html>
<html>
  <head>
    <title>{title} | InsightHunter</title>
  </head>
  <body>
    <div class="app-container">
      <Sidebar client:load />
      <main class="app-content">
        <slot />
      </main>
    </div>
    <style>
      .app-container { display: flex; }
      .app-content { flex-grow: 1; padding: var(--space-8); }
    </style>
  </body>
</html>
`);

// ── Svelte Components ────────────────────────────────────────────────────────

w('apps/insighthunter-main/src/components/AppGrid.svelte', `\\
<script lang="ts">
  import type { AppDefinition } from '../types';
  export let apps: AppDefinition[];
</script>

<div class="grid">
  {#each apps as app}
    <a href={app.route} class="card">
      <span class="icon">{app.icon}</span>
      <h3>{app.name}</h3>
      <p>{app.description}</p>
    </a>
  {/each}
</div>

<style lang="scss">
.grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: var(--space-4);
}
.card {
  display: block;
  padding: var(--space-6);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  background: var(--color-surface);
  box-shadow: var(--shadow-sm);
  transition: all 0.2s;
  &:hover {
    box-shadow: var(--shadow-md);
    transform: translateY(-2px);
  }
}
.icon { font-size: var(--text-3xl); }
h3 { margin-top: var(--space-2); }
p { color: var(--color-muted); font-size: var(--text-sm); }
</style>
`);

w('apps/insighthunter-main/src/components/Sidebar.svelte', `\\
<script lang="ts">
  import { APPS } from '../data/apps';
</script>

<aside>
  <div class="logo">IH</div>
  <nav>
    {#each APPS as app}
      <a href={app.route}>
        <span class="icon">{app.icon}</span>
        {app.name}
      </a>
    {/each}
  </nav>
</aside>

<style lang="scss">
aside {
  width: var(--sidebar-w);
  min-height: 100vh;
  background: var(--color-surface);
  border-right: 1px solid var(--color-border);
  padding: var(--space-4);
}
.logo { font-size: var(--text-2xl); font-weight: bold; text-align: center; margin-bottom: var(--space-8); }
nav a {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-2) var(--space-4);
  border-radius: var(--radius-md);
  margin-bottom: var(--space-1);
  &:hover { background: var(--color-taupe-100); }
}
.icon { width: 24px; text-align: center; }
</style>
`);


// ── Cloudflare Functions (Middleware) ────────────────────────────────────────

w('apps/insighthunter-main/functions/_middleware.ts', `\\
import type { PagesFunction } from '@cloudflare/workers-types';
import { jwt } from 'hono/jwt'

// Protect all routes under /dashboard
export const onRequest: PagesFunction = async ({ request, next, env }) => {
  const url = new URL(request.url);
  if (url.pathname.startsWith('/dashboard')) {
    const token = request.headers.get('Authorization')?.replace('Bearer ', '');
    if (!token) return new Response('Unauthorized', { status: 401 });

    try {
      // In a real app, you'd verify the JWT and check permissions
      // const decoded = await jwt.verify(token, env.JWT_SECRET);
      return next();
    } catch (e) {
      return new Response('Invalid token', { status: 401 });
    }
  }
  return next();
};
`);


// ══════════════════════════════════════════════════════════════
//  FINAL STEPS
// ══════════════════════════════════════════════════════════════

if (INSTALL) {
  console.log('\\n📦  Installing dependencies (this may take a minute)...\\n');
  try {
    execSync('npm install', { cwd: ROOT, stdio: 'inherit' });
  } catch (e) {
    console.error('\\n❌  Dependency installation failed.');
    console.error('    Please run `npm install` inside the `insighthunter` directory manually.\\n');
  }
}

console.log(`\\n✅  ${written} files written in \`./insighthunter/\`\\n`);

if (INSTALL) {
  console.log('To start the main dashboard app:');
  console.log('  \\x1b[36mcd insighthunter');
  console.log('  npm run dev:main\\x1b[0m\\n');
} else {
  console.log('Next steps:');
  console.log('  \\x1b[36mcd insighthunter');
  console.log('  npm install');
  console.log('  npm run dev:main\\x1b[0m\\n');
}
