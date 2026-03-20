import { Hono } from 'hono';
import { cors } from 'hono/cors';

// Bindings injected per-user at deploy time by the provisioning worker
interface Env {
  USER_DB: D1Database;
  USER_KV: KVNamespace;
  USER_R2: R2Bucket;
  AI: Ai;
  OWNER_USER_ID: string; // injected as plain_text binding at provision time
  USER_PLAN: string;
}

const app = new Hono<{ Bindings: Env }>();

app.use('*', cors({ origin: '*', allowMethods: ['GET','POST','PUT','DELETE','PATCH','OPTIONS'] }));

// Guard: reject requests not belonging to this user's owner
app.use('/api/*', async (c, next) => {
  const requestUserId = c.req.header('X-User-ID');
  if (requestUserId !== c.env.OWNER_USER_ID) {
    return c.json({ error: 'Forbidden' }, 403);
  }
  return next();
});

// ── Accounts ──────────────────────────────────────────────────────────
app.get('/api/accounts', async (c) => {
  const { results } = await c.env.USER_DB
    .prepare('SELECT * FROM accounts ORDER BY type, name')
    .all();
  return c.json({ accounts: results });
});

app.post('/api/accounts', async (c) => {
  const body = await c.req.json<{ name: string; type: string; currency?: string }>();
  const id = crypto.randomUUID();
  await c.env.USER_DB
    .prepare('INSERT INTO accounts (id, name, type, currency) VALUES (?, ?, ?, ?)')
    .bind(id, body.name, body.type, body.currency ?? 'USD')
    .run();
  return c.json({ id }, 201);
});

// ── Transactions ──────────────────────────────────────────────────────
app.get('/api/transactions', async (c) => {
  const { from, to, category, limit = '50' } = c.req.query();
  let sql = 'SELECT * FROM transactions WHERE 1=1';
  const params: (string | number)[] = [];
  if (from)     { sql += ' AND date >= ?'; params.push(from); }
  if (to)       { sql += ' AND date <= ?'; params.push(to); }
  if (category) { sql += ' AND category = ?'; params.push(category); }
  sql += ' ORDER BY date DESC LIMIT ?';
  params.push(parseInt(limit));
  const { results } = await c.env.USER_DB.prepare(sql).bind(...params).all();
  return c.json({ transactions: results });
});

app.post('/api/transactions', async (c) => {
  const body = await c.req.json();
  const id = crypto.randomUUID();
  await c.env.USER_DB
    .prepare(`INSERT INTO transactions
              (id, date, description, amount, debit_account_id, credit_account_id, category, reference)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?)`)
    .bind(id, body.date, body.description, body.amount,
          body.debit_account_id, body.credit_account_id,
          body.category ?? null, body.reference ?? null)
    .run();
  // Bust KPI cache
  await c.env.USER_KV.delete('kpi:summary');
  return c.json({ id }, 201);
});

// ── KPI Dashboard ─────────────────────────────────────────────────────
app.get('/api/kpi', async (c) => {
  const cached = await c.env.USER_KV.get('kpi:summary', 'json');
  if (cached) return c.json(cached);

  const [revenue, expenses, ar, overdueCount] = await Promise.all([
    c.env.USER_DB.prepare(`
      SELECT COALESCE(SUM(amount), 0) AS total FROM transactions
      WHERE debit_account_id IN (SELECT id FROM accounts WHERE type='revenue')
      AND date >= date('now','-30 days')`).first<{ total: number }>(),
    c.env.USER_DB.prepare(`
      SELECT COALESCE(SUM(amount), 0) AS total FROM transactions
      WHERE debit_account_id IN (SELECT id FROM accounts WHERE type='expense')
      AND date >= date('now','-30 days')`).first<{ total: number }>(),
    c.env.USER_DB.prepare(`
      SELECT COALESCE(SUM(amount), 0) AS total FROM invoices
      WHERE status IN ('sent','overdue')`).first<{ total: number }>(),
    c.env.USER_DB.prepare(`
      SELECT COUNT(*) AS count FROM invoices WHERE status='overdue'`)
      .first<{ count: number }>(),
  ]);

  const kpi = {
    revenue_30d:        revenue?.total ?? 0,
    expenses_30d:       expenses?.total ?? 0,
    net_income_30d:     (revenue?.total ?? 0) - (expenses?.total ?? 0),
    accounts_receivable: ar?.total ?? 0,
    overdue_invoices:   overdueCount?.count ?? 0,
    generated_at:       new Date().toISOString(),
  };

  await c.env.USER_KV.put('kpi:summary', JSON.stringify(kpi), { expirationTtl: 300 });
  return c.json(kpi);
});

// ── AI CFO Insights ───────────────────────────────────────────────────
app.get('/api/insights', async (c) => {
  // 6-hour cache — AI inference is expensive on lite plan
  const cached = await c.env.USER_KV.get('insights:latest', 'json');
  if (cached) return c.json(cached);

  const [recentTxns, topExpenses, cashFlow] = await Promise.all([
    c.env.USER_DB.prepare(`SELECT date, description, amount, category FROM transactions
      ORDER BY date DESC LIMIT 20`).all(),
    c.env.USER_DB.prepare(`SELECT category, SUM(amount) AS total FROM transactions
      WHERE date >= date('now','-30 days')
      GROUP BY category ORDER BY total DESC LIMIT 5`).all(),
    c.env.USER_DB.prepare(`SELECT
        SUM(CASE WHEN debit_account_id IN (SELECT id FROM accounts WHERE type='revenue') THEN amount ELSE 0 END) AS inflow,
        SUM(CASE WHEN debit_account_id IN (SELECT id FROM accounts WHERE type='expense') THEN amount ELSE 0 END) AS outflow
      FROM transactions WHERE date >= date('now','-30 days')`)
      .first<{ inflow: number; outflow: number }>(),
  ]);

  const ctx = JSON.stringify({
    transactions: recentTxns.results.slice(0, 10),
    top_expense_categories: topExpenses.results,
    cash_flow_30d: cashFlow,
    plan: c.env.USER_PLAN,
  });

  const aiResp = await c.env.AI.run('@cf/meta/llama-3.1-8b-instruct', {
    messages: [
      {
        role: 'system',
        content: `You are an expert CFO assistant for a small business. Analyze the provided financial data.
Return ONLY valid JSON with shape:
{
  "insights": [{ "title": string, "description": string, "priority": "high"|"medium"|"low", "action": string }],
  "forecast":  { "next_30d_revenue": number, "next_30d_expenses": number, "cash_position": string },
  "alerts":    [{ "type": string, "message": string }]
}
Be specific, use real numbers, and keep descriptions under 2 sentences.`,
      },
      { role: 'user', content: `Financial data: ${ctx}` },
    ],
  });

  let parsed: unknown = { insights: [], forecast: {}, alerts: [] };
  try {
    const text = (aiResp as { response: string }).response;
    const match = text.match(/\{[\s\S]*\}/);
    if (match) parsed = JSON.parse(match[0]);
  } catch {
    parsed = { insights: [], raw: (aiResp as { response: string }).response };
  }

  const result = { ...(parsed as object), generated_at: new Date().toISOString() };
  await c.env.USER_KV.put('insights:latest', JSON.stringify(result), { expirationTtl: 21600 });
  return c.json(result);
});

// ── Cash Flow Forecast ────────────────────────────────────────────────
app.get('/api/forecast', async (c) => {
  const months = Math.min(parseInt(c.req.query('months') ?? '3'), 12);
  const { results } = await c.env.USER_DB.prepare(`
    SELECT
      strftime('%Y-%m', date) AS month,
      SUM(CASE WHEN debit_account_id IN (SELECT id FROM accounts WHERE type='revenue') THEN amount ELSE 0 END) AS revenue,
      SUM(CASE WHEN debit_account_id IN (SELECT id FROM accounts WHERE type='expense') THEN amount ELSE 0 END) AS expenses
    FROM transactions
    WHERE date >= date('now','-6 months')
    GROUP BY month ORDER BY month
  `).all<{ month: string; revenue: number; expenses: number }>();

  const avgRev = results.reduce((s, r) => s + r.revenue, 0) / (results.length || 1);
  const avgExp = results.reduce((s, r) => s + r.expenses, 0) / (results.length || 1);

  const forecast = Array.from({ length: months }, (_, i) => {
    const d = new Date();
    d.setMonth(d.getMonth() + i + 1);
    return {
      month:               d.toISOString().slice(0, 7),
      projected_revenue:   +avgRev.toFixed(2),
      projected_expenses:  +avgExp.toFixed(2),
      projected_net:       +(avgRev - avgExp).toFixed(2),
    };
  });

  return c.json({ historical: results, forecast });
});

// ── Invoices ──────────────────────────────────────────────────────────
app.get('/api/invoices', async (c) => {
  const { status } = c.req.query();
  const { results } = await c.env.USER_DB
    .prepare(status
      ? 'SELECT * FROM invoices WHERE status = ? ORDER BY created_at DESC'
      : 'SELECT * FROM invoices ORDER BY created_at DESC')
    .bind(...(status ? [status] : []))
    .all();
  return c.json({ invoices: results });
});

app.post('/api/invoices', async (c) => {
  const body = await c.req.json();
  const id = crypto.randomUUID();
  await c.env.USER_DB
    .prepare(`INSERT INTO invoices (id, client_name, amount, due_date, status, line_items)
              VALUES (?, ?, ?, ?, 'draft', ?)`)
    .bind(id, body.client_name, body.amount, body.due_date ?? null,
          JSON.stringify(body.line_items ?? []))
    .run();
  return c.json({ id }, 201);
});

app.patch('/api/invoices/:id/status', async (c) => {
  const { status } = await c.req.json<{ status: string }>();
  await c.env.USER_DB
    .prepare('UPDATE invoices SET status = ? WHERE id = ?')
    .bind(status, c.req.param('id'))
    .run();
  return c.json({ updated: true });
});

// ── Documents (R2) ───────────────────────────────────────────────────
app.post('/api/documents', async (c) => {
  const form = await c.req.formData();
  const file = form.get('file') as File | null;
  if (!file) return c.json({ error: 'No file provided' }, 400);

  const key = `docs/${Date.now()}-${file.name.replace(/[^a-z0-9._-]/gi, '_')}`;
  await c.env.USER_R2.put(key, file.stream(), {
    httpMetadata:   { contentType: file.type },
    customMetadata: { originalName: file.name, uploadedAt: new Date().toISOString() },
  });
  return c.json({ key, name: file.name }, 201);
});

app.get('/api/documents', async (c) => {
  const list = await c.env.USER_R2.list({ prefix: 'docs/' });
  return c.json({
    documents: list.objects.map((o) => ({
      key:      o.key,
      size:     o.size,
      uploaded: o.uploaded,
    })),
  });
});

export default app;
