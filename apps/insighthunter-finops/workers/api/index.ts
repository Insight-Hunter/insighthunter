// apps/insighthunter-finops/workers/api/index.ts
import { Hono } from 'hono';
import { logger } from 'hono/logger';
import { sessionValidator } from '../../../../shared/middleware/session-validator';
import type { FinopsEnv, Session } from '../../../../shared/types';

type Variables = { session: Session };

type AccountRow = {
  id: string;
  name: string;
  accountType: string;
  status: string;
  availableBalance: number;
  currentBalance: number;
};

type AlertRow = {
  id: string;
  severity: 'success' | 'warning' | 'danger';
  title: string;
  body: string;
};

const app = new Hono<{ Bindings: FinopsEnv; Variables: Variables }>();
app.use('*', logger());

async function ensureSchema(db: D1Database) {
  await db.batch([
    db.prepare(`
      CREATE TABLE IF NOT EXISTS finops_mercury_accounts (
        id TEXT PRIMARY KEY,
        org_id TEXT NOT NULL,
        name TEXT NOT NULL,
        account_type TEXT NOT NULL,
        status TEXT NOT NULL,
        available_balance REAL NOT NULL,
        current_balance REAL NOT NULL,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `),
    db.prepare(`
      CREATE TABLE IF NOT EXISTS finops_mercury_transactions (
        id TEXT PRIMARY KEY,
        org_id TEXT NOT NULL,
        posted_at TEXT NOT NULL,
        description TEXT NOT NULL,
        direction TEXT NOT NULL,
        amount REAL NOT NULL,
        status TEXT NOT NULL,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `),
    db.prepare(`
      CREATE TABLE IF NOT EXISTS finops_alerts (
        id TEXT PRIMARY KEY,
        org_id TEXT NOT NULL,
        severity TEXT NOT NULL,
        title TEXT NOT NULL,
        body TEXT NOT NULL,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `)
  ]);
}

async function seedDemo(db: D1Database, orgId: string) {
  const existing = await db
    .prepare(`SELECT id FROM finops_mercury_accounts WHERE org_id = ? LIMIT 1`)
    .bind(orgId)
    .first();

  if (existing) return;

  await db.batch([
    db.prepare(`
      INSERT INTO finops_mercury_accounts
      (id, org_id, name, account_type, status, available_balance, current_balance)
      VALUES
      ('acct_operating', ?, 'Operating', 'Checking', 'active', 121337.14, 127801.79),
      ('acct_tax', ?, 'Tax Reserve', 'Savings', 'active', 40112.25, 40112.25),
      ('acct_payroll', ?, 'Payroll Buffer', 'Checking', 'active', 24970.73, 24970.73)
    `).bind(orgId, orgId, orgId),
    db.prepare(`
      INSERT INTO finops_mercury_transactions
      (id, org_id, posted_at, description, direction, amount, status)
      VALUES
      ('txn_1', ?, '2026-04-28', 'Client payment - Apex Advisory', 'credit', 18500.00, 'posted'),
      ('txn_2', ?, '2026-04-27', 'AWS infrastructure', 'debit', 892.14, 'posted'),
      ('txn_3', ?, '2026-04-26', 'Contractor payout', 'debit', 4200.00, 'posted'),
      ('txn_4', ?, '2026-04-25', 'Mercury card settlement', 'debit', 1388.63, 'posted'),
      ('txn_5', ?, '2026-04-25', 'Interest credit', 'credit', 42.91, 'posted')
    `).bind(orgId, orgId, orgId, orgId, orgId),
    db.prepare(`
      INSERT INTO finops_alerts
      (id, org_id, severity, title, body)
      VALUES
      ('alert_1', ?, 'warning', '7-day outflows elevated', 'Outflows increased 18% versus the prior 7-day period.'),
      ('alert_2', ?, 'success', 'Mercury sync healthy', 'Last sync completed successfully with no rejected records.')
    `).bind(orgId, orgId)
  ]);
}

app.get('/health', async (c) => {
  await ensureSchema(c.env.DB);
  return c.json({ ok: true, service: 'ih-finops-api' });
});

app.use('/v1/*', sessionValidator);

app.get('/v1/mercury/bootstrap', async (c) => {
  await ensureSchema(c.env.DB);
  const session = c.get('session');
  await seedDemo(c.env.DB, session.org.orgId);

  return c.json({
    ok: true,
    app: 'finops',
    pages: [
      '/finops/overview',
      '/finops/accounts',
      '/finops/transactions',
      '/finops/alerts',
      '/finops/settings'
    ],
    orgId: session.org.orgId,
    authAuthority: c.env.AUTH_BASE_URL
  });
});

app.get('/v1/mercury/overview', async (c) => {
  await ensureSchema(c.env.DB);
  const session = c.get('session');
  await seedDemo(c.env.DB, session.org.orgId);

  const accounts = await c.env.DB
    .prepare(`
      SELECT id, name, account_type as accountType, status, available_balance as availableBalance, current_balance as currentBalance
      FROM finops_mercury_accounts
      WHERE org_id = ?
      ORDER BY name ASC
    `)
    .bind(session.org.orgId)
    .all<AccountRow>();

  const txIn = await c.env.DB
    .prepare(`SELECT COALESCE(SUM(amount),0) as total FROM finops_mercury_transactions WHERE org_id = ? AND direction = 'credit'`)
    .bind(session.org.orgId)
    .first<{ total: number }>();

  const txOut = await c.env.DB
    .prepare(`SELECT COALESCE(SUM(amount),0) as total FROM finops_mercury_transactions WHERE org_id = ? AND direction = 'debit'`)
    .bind(session.org.orgId)
    .first<{ total: number }>();

  const alerts = await c.env.DB
    .prepare(`SELECT id, severity, title, body FROM finops_alerts WHERE org_id = ? ORDER BY created_at DESC`)
    .bind(session.org.orgId)
    .all<AlertRow>();

  const availableCash = (accounts.results || []).reduce((sum, row) => sum + Number(row.availableBalance || 0), 0);
  const currentCash = (accounts.results || []).reduce((sum, row) => sum + Number(row.currentBalance || 0), 0);

  return c.json({
    metrics: {
      availableCash,
      currentCash,
      last30Inflows: Number(txIn?.total || 0),
      last30Outflows: Number(txOut?.total || 0),
      accountCount: (accounts.results || []).length
    },
    accounts: accounts.results || [],
    alerts: alerts.results || [],
    sync: {
      status: 'complete',
      at: new Date().toISOString()
    }
  });
});

app.get('/v1/mercury/accounts', async (c) => {
  const session = c.get('session');
  const rows = await c.env.DB
    .prepare(`
      SELECT id, name, account_type as accountType, status, available_balance as availableBalance, current_balance as currentBalance
      FROM finops_mercury_accounts
      WHERE org_id = ?
      ORDER BY name ASC
    `)
    .bind(session.org.orgId)
    .all<AccountRow>();

  return c.json({ items: rows.results || [] });
});

app.get('/v1/mercury/transactions', async (c) => {
  const session = c.get('session');
  const rows = await c.env.DB
    .prepare(`
      SELECT id, posted_at as postedAt, description, direction, amount, status
      FROM finops_mercury_transactions
      WHERE org_id = ?
      ORDER BY posted_at DESC
    `)
    .bind(session.org.orgId)
    .all();

  return c.json({ items: rows.results || [] });
});

app.get('/v1/mercury/alerts', async (c) => {
  const session = c.get('session');
  const rows = await c.env.DB
    .prepare(`
      SELECT id, severity, title, body
      FROM finops_alerts
      WHERE org_id = ?
      ORDER BY created_at DESC
    `)
    .bind(session.org.orgId)
    .all<AlertRow>();

  return c.json({ items: rows.results || [] });
});

app.get('/v1/mercury/settings', async (c) => {
  const session = c.get('session');
  return c.json({
    workspace: 'InsightHunter FinOps',
    module: 'Mercury Treasury',
    orgId: session.org.orgId,
    phase: 'Phase I',
    authAuthority: c.env.AUTH_BASE_URL,
    deployment: 'Cloudflare Workers + D1 + KV + Analytics Engine',
    syncMode: 'manual-now scheduled-later'
  });
});

export default app;
