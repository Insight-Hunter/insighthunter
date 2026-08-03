import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { reportRoutes } from './routes/reports.js';

export interface Env {
  DB: D1Database;
  AUTH_URL: string;
  DASHBOARD_URL: string;
  ENVIRONMENT: string;
}

export interface Session {
  userId: string;
  orgId: string;
  email: string;
  name: string;
  role: string;
  orgName: string;
  orgPlan: string;
}

export function getSession(req: Request): Session | null {
  const userId = req.headers.get('X-User-Id');
  const orgId = req.headers.get('X-Org-Id');
  const role = req.headers.get('X-User-Role');
  const email = req.headers.get('X-User-Email');
  if (!userId || !orgId || !role || !email) return null;

  return {
    userId,
    orgId,
    role,
    email,
    name: req.headers.get('X-User-Name') ?? email,
    orgName: req.headers.get('X-Org-Name') ?? 'My Org',
    orgPlan: req.headers.get('X-Org-Plan') ?? 'starter',
  };
}

const app = new Hono<{ Bindings: Env }>();

app.use('*', async (c, next) => {
  await next();
  c.header('X-Frame-Options', 'DENY');
  c.header('X-Content-Type-Options', 'nosniff');
  c.header('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
});

app.use('/api/*', cors({
  origin: (o) => (o?.endsWith('.insighthunter.app') ? o : null),
  credentials: true,
}));

app.use('/*', async (c, next) => {
  if (c.req.path === '/health') return next();
  const session = getSession(c.req.raw);
  if (!session) {
    const isHtml = (c.req.header('Accept') ?? '').includes('text/html');
    if (isHtml) return c.redirect(`${c.env.AUTH_URL}/login?redirect=${encodeURIComponent(c.req.url)}`, 302);
    return c.json({ error: 'unauthorized' }, 401);
  }
  return next();
});

app.get('/health', (c) =>
  c.json({ ok: true, service: 'insighthunter-report', ts: Date.now(), env: c.env.ENVIRONMENT }),
);

app.route('/api/reports', reportRoutes);

app.get('/', async (c) => {
  const session = getSession(c.req.raw);
  if (!session) return c.json({ error: 'unauthorized' }, 401);

  const asOf = new Date().toISOString().slice(0, 10);

  const [
    cashFlow,
    apAging,
    trialBalance,
    profitLoss,
    balanceSheet,
  ] = await Promise.all([
    c.env.DB.prepare(`
      SELECT
        COALESCE(SUM(CASE WHEN a.type = 'ASSET' THEN jl.credit - jl.debit ELSE 0 END), 0) AS inflows,
        COALESCE(SUM(CASE WHEN a.type = 'ASSET' THEN jl.debit - jl.credit ELSE 0 END), 0) AS outflows
      FROM journal_lines jl
      JOIN journal_entries je ON je.id = jl.journal_entry_id
      JOIN accounts a ON a.id = jl.account_id
      WHERE je.organization_id = ?1
        AND a.organization_id = ?1
        AND je.posted_at >= date('now', '-30 day')
    `).bind(session.orgId).first<{ inflows: number; outflows: number }>(),
    c.env.DB.prepare(`
      SELECT
        COALESCE(SUM(b.balance_due), 0) AS total_open_ap,
        COALESCE(COUNT(*), 0) AS open_bills
      FROM bills b
      WHERE b.org_id = ?1 AND b.balance_due > 0 AND b.status IN ('received','approved','scheduled','overdue')
    `).bind(session.orgId).first<{ total_open_ap: number; open_bills: number }>(),
    c.env.DB.prepare(`
      SELECT a.code, a.name, a.type,
             COALESCE(SUM(jl.debit), 0)  AS total_debit,
             COALESCE(SUM(jl.credit), 0) AS total_credit
      FROM accounts a
      LEFT JOIN journal_lines jl ON jl.account_id = a.id
      LEFT JOIN journal_entries je ON je.id = jl.journal_entry_id
        AND je.organization_id = ?1
      WHERE a.organization_id = ?1
      GROUP BY a.id, a.code, a.name, a.type
      ORDER BY a.code ASC
    `).bind(session.orgId).all(),
    c.env.DB.prepare(`
      SELECT a.name, a.type,
             COALESCE(SUM(jl.credit - jl.debit), 0) AS amount
      FROM accounts a
      JOIN journal_lines jl ON jl.account_id = a.id
      JOIN journal_entries je ON je.id = jl.journal_entry_id
      WHERE je.organization_id = ?1
        AND a.organization_id  = ?1
        AND je.posted_at BETWEEN date('now', '-30 day') AND date('now')
        AND a.type IN ('REVENUE', 'EXPENSE')
      GROUP BY a.id, a.name, a.type
      ORDER BY a.type DESC, a.name ASC
    `).bind(session.orgId).all(),
    c.env.DB.prepare(`
      SELECT a.name, a.type,
             COALESCE(SUM(jl.debit - jl.credit), 0) AS balance
      FROM accounts a
      JOIN journal_lines jl ON jl.account_id = a.id
      JOIN journal_entries je ON je.id = jl.journal_entry_id
      WHERE je.organization_id = ?1
        AND a.organization_id  = ?1
        AND je.posted_at <= ?2
        AND a.type IN ('ASSET', 'LIABILITY', 'EQUITY')
      GROUP BY a.id, a.name, a.type
      ORDER BY a.type, a.name
    `).bind(session.orgId, asOf).all(),
  ]);

  return c.json({
    as_of: asOf,
    cash_flow: cashFlow ?? { inflows: 0, outflows: 0 },
    ap_aging: apAging ?? { total_open_ap: 0, open_bills: 0 },
    trial_balance: trialBalance.results ?? [],
    profit_loss: profitLoss.results ?? [],
    balance_sheet: balanceSheet.results ?? [],
  });
});

export default app;
