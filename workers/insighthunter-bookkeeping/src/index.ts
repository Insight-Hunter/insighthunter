import { Hono } from 'hono';
import type { AuthUser } from '@ih/types';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Env {
  DB: D1Database;
  RECEIPTS: R2Bucket;
  REPORT_CACHE: KVNamespace;
  BOOKKEEPING_EVENTS: AnalyticsEngineDataset;
  JWT_SECRET: string;
}

interface IHLocals {
  user: AuthUser;
}

// ─── Default Chart of Accounts seed data ─────────────────────────────────────

const DEFAULT_COA = [
  { code: '1000', name: 'Cash',                        type: 'ASSET',     subtype: 'Current' },
  { code: '1010', name: 'Checking Account',            type: 'ASSET',     subtype: 'Current' },
  { code: '1020', name: 'Savings Account',             type: 'ASSET',     subtype: 'Current' },
  { code: '1100', name: 'Accounts Receivable',         type: 'ASSET',     subtype: 'Current' },
  { code: '1200', name: 'Prepaid Expenses',            type: 'ASSET',     subtype: 'Current' },
  { code: '1500', name: 'Equipment',                   type: 'ASSET',     subtype: 'Fixed' },
  { code: '1510', name: 'Accumulated Depreciation',    type: 'ASSET',     subtype: 'Fixed' },
  { code: '2000', name: 'Accounts Payable',            type: 'LIABILITY', subtype: 'Current' },
  { code: '2100', name: 'Credit Card Payable',         type: 'LIABILITY', subtype: 'Current' },
  { code: '2200', name: 'Sales Tax Payable',           type: 'LIABILITY', subtype: 'Current' },
  { code: '2300', name: 'Payroll Liabilities',         type: 'LIABILITY', subtype: 'Current' },
  { code: '2500', name: 'Long-Term Debt',              type: 'LIABILITY', subtype: 'LongTerm' },
  { code: '3000', name: 'Owners Equity',               type: 'EQUITY',    subtype: 'Equity' },
  { code: '3100', name: 'Owners Draw',                 type: 'EQUITY',    subtype: 'Equity' },
  { code: '3200', name: 'Retained Earnings',           type: 'EQUITY',    subtype: 'Equity' },
  { code: '4000', name: 'Revenue',                     type: 'REVENUE',   subtype: 'Operating' },
  { code: '4100', name: 'Service Revenue',             type: 'REVENUE',   subtype: 'Operating' },
  { code: '4200', name: 'Product Revenue',             type: 'REVENUE',   subtype: 'Operating' },
  { code: '4900', name: 'Other Income',                type: 'REVENUE',   subtype: 'Other' },
  { code: '5000', name: 'Cost of Goods Sold',          type: 'EXPENSE',   subtype: 'COGS' },
  { code: '6000', name: 'Rent Expense',                type: 'EXPENSE',   subtype: 'Operating' },
  { code: '6100', name: 'Utilities',                   type: 'EXPENSE',   subtype: 'Operating' },
  { code: '6200', name: 'Payroll Expense',             type: 'EXPENSE',   subtype: 'Operating' },
  { code: '6300', name: 'Professional Services',       type: 'EXPENSE',   subtype: 'Operating' },
  { code: '6400', name: 'Marketing and Advertising',   type: 'EXPENSE',   subtype: 'Operating' },
  { code: '6500', name: 'Software and Subscriptions',  type: 'EXPENSE',   subtype: 'Operating' },
  { code: '6600', name: 'Office Supplies',             type: 'EXPENSE',   subtype: 'Operating' },
  { code: '6700', name: 'Travel and Meals',            type: 'EXPENSE',   subtype: 'Operating' },
  { code: '6800', name: 'Bank Fees',                   type: 'EXPENSE',   subtype: 'Operating' },
  { code: '6900', name: 'Depreciation Expense',        type: 'EXPENSE',   subtype: 'Operating' },
  { code: '7000', name: 'Interest Expense',            type: 'EXPENSE',   subtype: 'Other' },
  { code: '7100', name: 'Income Tax Expense',          type: 'EXPENSE',   subtype: 'Other' },
] as const;

// ─── App setup ────────────────────────────────────────────────────────────────

const app = new Hono<{ Bindings: Env; Variables: IHLocals }>();

// Parse X-IH-User header injected by dispatch on every request
app.use('*', async (c, next) => {
  // Allow internal seed endpoint without user header
  if (c.req.path === '/seed' && c.req.method === 'POST') return next();

  const raw = c.req.header('X-IH-User');
  if (!raw) return c.json({ error: 'Missing user context', code: 'NO_USER' }, 401);
  try {
    c.set('user', JSON.parse(raw) as AuthUser);
  } catch {
    return c.json({ error: 'Invalid user context', code: 'BAD_USER' }, 400);
  }
  return next();
});

// ─── Cache helpers ────────────────────────────────────────────────────────────

function reportCacheKey(orgId: string, report: string, params: string): string {
  return `report:${orgId}:${report}:${params}`;
}

async function bustReportCache(env: Env, orgId: string): Promise<void> {
  const list = await env.REPORT_CACHE.list({ prefix: `report:${orgId}:` });
  await Promise.all(list.keys.map(k => env.REPORT_CACHE.delete(k.name)));
}

// ─── Accounts ─────────────────────────────────────────────────────────────────

app.get('/accounts', async (c) => {
  const user = c.get('user');
  const { type, active } = c.req.query();
  let query = 'SELECT * FROM bookkeeping_accounts WHERE org_id = ?';
  const params: unknown[] = [user.orgId];
  if (type) { query += ' AND type = ?'; params.push(type.toUpperCase()); }
  if (active !== undefined) { query += ' AND is_active = ?'; params.push(active === 'true' ? 1 : 0); }
  query += ' ORDER BY code ASC';
  const { results } = await c.env.DB.prepare(query).bind(...params).all();
  return c.json(results);
});

app.post('/accounts', async (c) => {
  const user = c.get('user');
  const body = await c.req.json<{ code?: string; name: string; type: string; subtype?: string; description?: string; parent_id?: string }>();
  if (!body.name || !body.type) return c.json({ error: 'name and type required', code: 'MISSING_FIELDS' }, 400);
  const validTypes = ['ASSET', 'LIABILITY', 'EQUITY', 'REVENUE', 'EXPENSE'];
  if (!validTypes.includes(body.type.toUpperCase())) {
    return c.json({ error: `type must be one of ${validTypes.join(', ')}`, code: 'INVALID_TYPE' }, 400);
  }
  const id = crypto.randomUUID().replace(/-/g, '');
  await c.env.DB.prepare(`
    INSERT INTO bookkeeping_accounts (id, org_id, code, name, type, subtype, description, parent_id)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(id, user.orgId, body.code ?? null, body.name, body.type.toUpperCase(), body.subtype ?? null, body.description ?? null, body.parent_id ?? null).run();
  const account = await c.env.DB.prepare('SELECT * FROM bookkeeping_accounts WHERE id = ?').bind(id).first();
  return c.json(account, 201);
});

app.patch('/accounts/:id', async (c) => {
  const user = c.get('user');
  const body = await c.req.json<Record<string, unknown>>();
  const allowed = ['code', 'name', 'subtype', 'description', 'parent_id', 'is_active'];
  const updates: string[] = [];
  const vals: unknown[] = [];
  for (const key of allowed) {
    if (key in body) { updates.push(`${key} = ?`); vals.push(body[key]); }
  }
  if (updates.length === 0) return c.json({ error: 'No fields to update', code: 'NO_CHANGES' }, 400);
  updates.push("updated_at = datetime('now')");
  vals.push(c.req.param('id'), user.orgId);
  await c.env.DB.prepare(`UPDATE bookkeeping_accounts SET ${updates.join(', ')} WHERE id = ? AND org_id = ?`).bind(...vals).run();
  const account = await c.env.DB.prepare('SELECT * FROM bookkeeping_accounts WHERE id = ?').bind(c.req.param('id')).first();
  return c.json(account);
});

app.delete('/accounts/:id', async (c) => {
  const user = c.get('user');
  const id = c.req.param('id');
  // Check for posted transactions
  const posted = await c.env.DB.prepare(`
    SELECT COUNT(*) as cnt FROM transaction_lines tl
    JOIN transactions t ON t.id = tl.transaction_id
    WHERE tl.account_id = ? AND t.org_id = ? AND t.status = 'POSTED'
  `).bind(id, user.orgId).first<{ cnt: number }>();

  if ((posted?.cnt ?? 0) > 0) {
    // Soft delete
    await c.env.DB.prepare(`UPDATE bookkeeping_accounts SET is_active = 0, updated_at = datetime('now') WHERE id = ? AND org_id = ?`).bind(id, user.orgId).run();
    return c.json({ deleted: false, deactivated: true });
  }
  await c.env.DB.prepare('DELETE FROM bookkeeping_accounts WHERE id = ? AND org_id = ?').bind(id, user.orgId).run();
  return c.json({ deleted: true });
});

// ─── Transactions ─────────────────────────────────────────────────────────────

app.get('/transactions', async (c) => {
  const user = c.get('user');
  const { status, from, to, account, search, page = '1', limit = '50' } = c.req.query();
  const pageNum = Math.max(1, parseInt(page, 10));
  const limitNum = Math.min(200, Math.max(1, parseInt(limit, 10)));
  const offset = (pageNum - 1) * limitNum;

  let where = 'WHERE t.org_id = ?';
  const params: unknown[] = [user.orgId];

  if (status) { where += ' AND t.status = ?'; params.push(status.toUpperCase()); }
  if (from)   { where += ' AND t.date >= ?'; params.push(from); }
  if (to)     { where += ' AND t.date <= ?'; params.push(to); }
  if (search) { where += ' AND t.description LIKE ?'; params.push(`%${search}%`); }
  if (account) {
    where += ' AND t.id IN (SELECT transaction_id FROM transaction_lines WHERE account_id = ?)';
    params.push(account);
  }

  const countRow = await c.env.DB.prepare(`SELECT COUNT(*) as cnt FROM transactions t ${where}`).bind(...params).first<{ cnt: number }>();
  const total = countRow?.cnt ?? 0;

  const { results } = await c.env.DB.prepare(
    `SELECT t.* FROM transactions t ${where} ORDER BY t.date DESC, t.created_at DESC LIMIT ? OFFSET ?`
  ).bind(...params, limitNum, offset).all();

  return c.json({ items: results, total, page: pageNum, limit: limitNum, hasMore: offset + limitNum < total });
});

app.get('/transactions/:id', async (c) => {
  const user = c.get('user');
  const id = c.req.param('id');
  const txn = await c.env.DB.prepare('SELECT * FROM transactions WHERE id = ? AND org_id = ?').bind(id, user.orgId).first();
  if (!txn) return c.json({ error: 'Transaction not found', code: 'NOT_FOUND' }, 404);
  const { results: lines } = await c.env.DB.prepare(
    'SELECT tl.*, a.name as account_name, a.code as account_code FROM transaction_lines tl JOIN bookkeeping_accounts a ON a.id = tl.account_id WHERE tl.transaction_id = ?'
  ).bind(id).all();
  const { results: attachments } = await c.env.DB.prepare('SELECT * FROM attachments WHERE transaction_id = ?').bind(id).all();
  return c.json({ ...txn, lines, attachments });
});

app.post('/transactions', async (c) => {
  const user = c.get('user');
  const body = await c.req.json<{
    date: string; description: string; reference?: string; created_by?: string;
    lines: Array<{ account_id: string; debit: number; credit: number; memo?: string }>;
  }>();

  if (!body.date || !body.description || !body.lines?.length) {
    return c.json({ error: 'date, description, and lines required', code: 'MISSING_FIELDS' }, 400);
  }

  const totalDebit  = body.lines.reduce((s, l) => s + (l.debit  ?? 0), 0);
  const totalCredit = body.lines.reduce((s, l) => s + (l.credit ?? 0), 0);
  if (Math.abs(totalDebit - totalCredit) > 0.001) {
    return c.json({ error: 'Debits must equal credits', code: 'UNBALANCED' }, 400);
  }

  const txnId = crypto.randomUUID().replace(/-/g, '');
  const stmts = [
    c.env.DB.prepare(`INSERT INTO transactions (id, org_id, date, description, reference, created_by) VALUES (?, ?, ?, ?, ?, ?)`)
      .bind(txnId, user.orgId, body.date, body.description, body.reference ?? null, body.created_by ?? user.userId),
    ...body.lines.map(line => {
      const lineId = crypto.randomUUID().replace(/-/g, '');
      return c.env.DB.prepare(`INSERT INTO transaction_lines (id, transaction_id, account_id, debit, credit, memo) VALUES (?, ?, ?, ?, ?, ?)`)
        .bind(lineId, txnId, line.account_id, line.debit ?? 0, line.credit ?? 0, line.memo ?? null);
    }),
  ];

  await c.env.DB.batch(stmts);
  c.env.BOOKKEEPING_EVENTS.writeDataPoint({ blobs: ['create_transaction', txnId], indexes: [user.orgId] });

  const txn = await c.env.DB.prepare('SELECT * FROM transactions WHERE id = ?').bind(txnId).first();
  return c.json(txn, 201);
});

app.patch('/transactions/:id', async (c) => {
  const user = c.get('user');
  const id = c.req.param('id');
  const existing = await c.env.DB.prepare('SELECT * FROM transactions WHERE id = ? AND org_id = ?').bind(id, user.orgId).first<{ status: string }>();
  if (!existing) return c.json({ error: 'Transaction not found', code: 'NOT_FOUND' }, 404);
  if (existing.status !== 'DRAFT') return c.json({ error: 'Only DRAFT transactions can be edited', code: 'NOT_DRAFT' }, 400);

  const body = await c.req.json<{
    date?: string; description?: string; reference?: string;
    lines?: Array<{ account_id: string; debit: number; credit: number; memo?: string }>;
  }>();

  const stmts: D1PreparedStatement[] = [];

  const updates: string[] = [];
  const vals: unknown[] = [];
  if (body.date)        { updates.push('date = ?');        vals.push(body.date); }
  if (body.description) { updates.push('description = ?'); vals.push(body.description); }
  if (body.reference !== undefined) { updates.push('reference = ?'); vals.push(body.reference); }
  if (updates.length) {
    updates.push("updated_at = datetime('now')");
    vals.push(id, user.orgId);
    stmts.push(c.env.DB.prepare(`UPDATE transactions SET ${updates.join(', ')} WHERE id = ? AND org_id = ?`).bind(...vals));
  }

  if (body.lines?.length) {
    const totalDebit  = body.lines.reduce((s, l) => s + (l.debit  ?? 0), 0);
    const totalCredit = body.lines.reduce((s, l) => s + (l.credit ?? 0), 0);
    if (Math.abs(totalDebit - totalCredit) > 0.001) {
      return c.json({ error: 'Debits must equal credits', code: 'UNBALANCED' }, 400);
    }
    stmts.push(c.env.DB.prepare('DELETE FROM transaction_lines WHERE transaction_id = ?').bind(id));
    for (const line of body.lines) {
      const lineId = crypto.randomUUID().replace(/-/g, '');
      stmts.push(c.env.DB.prepare(`INSERT INTO transaction_lines (id, transaction_id, account_id, debit, credit, memo) VALUES (?, ?, ?, ?, ?, ?)`)
        .bind(lineId, id, line.account_id, line.debit ?? 0, line.credit ?? 0, line.memo ?? null));
    }
  }

  if (stmts.length) await c.env.DB.batch(stmts);
  const txn = await c.env.DB.prepare('SELECT * FROM transactions WHERE id = ?').bind(id).first();
  return c.json(txn);
});

app.post('/transactions/:id/post', async (c) => {
  const user = c.get('user');
  const id = c.req.param('id');
  const txn = await c.env.DB.prepare('SELECT * FROM transactions WHERE id = ? AND org_id = ?').bind(id, user.orgId).first<{ status: string }>();
  if (!txn) return c.json({ error: 'Transaction not found', code: 'NOT_FOUND' }, 404);
  if (txn.status !== 'DRAFT') return c.json({ error: 'Only DRAFT transactions can be posted', code: 'NOT_DRAFT' }, 400);

  await c.env.DB.prepare(`UPDATE transactions SET status = 'POSTED', updated_at = datetime('now') WHERE id = ?`).bind(id).run();
  await bustReportCache(c.env, user.orgId);
  c.env.BOOKKEEPING_EVENTS.writeDataPoint({ blobs: ['post_transaction', id], indexes: [user.orgId] });
  return c.json({ posted: true, id });
});

app.post('/transactions/:id/void', async (c) => {
  const user = c.get('user');
  const id = c.req.param('id');
  const txn = await c.env.DB.prepare('SELECT * FROM transactions WHERE id = ? AND org_id = ?').bind(id, user.orgId).first<{ status: string }>();
  if (!txn) return c.json({ error: 'Transaction not found', code: 'NOT_FOUND' }, 404);
  if (txn.status === 'VOID') return c.json({ error: 'Already voided', code: 'ALREADY_VOID' }, 400);

  await c.env.DB.prepare(`UPDATE transactions SET status = 'VOID', updated_at = datetime('now') WHERE id = ?`).bind(id).run();
  await bustReportCache(c.env, user.orgId);
  return c.json({ voided: true, id });
});

// ─── Attachments ──────────────────────────────────────────────────────────────

app.post('/attachments/:txnId', async (c) => {
  const user = c.get('user');
  const txnId = c.req.param('txnId');

  const txn = await c.env.DB.prepare('SELECT id FROM transactions WHERE id = ? AND org_id = ?').bind(txnId, user.orgId).first();
  if (!txn) return c.json({ error: 'Transaction not found', code: 'NOT_FOUND' }, 404);

  const formData = await c.req.formData();
  const file = formData.get('file') as File | null;
  if (!file) return c.json({ error: 'file field required', code: 'MISSING_FILE' }, 400);

  const r2Key = `receipts/${user.orgId}/${txnId}/${crypto.randomUUID()}-${file.name}`;
  await c.env.RECEIPTS.put(r2Key, file.stream(), {
    httpMetadata: { contentType: file.type },
    customMetadata: { orgId: user.orgId, txnId, filename: file.name },
  });

  const attachId = crypto.randomUUID().replace(/-/g, '');
  await c.env.DB.prepare(`INSERT INTO attachments (id, org_id, transaction_id, r2_key, filename, size) VALUES (?, ?, ?, ?, ?, ?)`)
    .bind(attachId, user.orgId, txnId, r2Key, file.name, file.size).run();

  return c.json({ id: attachId, r2_key: r2Key, filename: file.name }, 201);
});

app.get('/attachments/:id/download', async (c) => {
  const user = c.get('user');
  const attach = await c.env.DB.prepare('SELECT * FROM attachments WHERE id = ? AND org_id = ?')
    .bind(c.req.param('id'), user.orgId).first<{ r2_key: string; filename: string }>();
  if (!attach) return c.json({ error: 'Attachment not found', code: 'NOT_FOUND' }, 404);

  const obj = await c.env.RECEIPTS.get(attach.r2_key);
  if (!obj) return c.json({ error: 'File not found in storage', code: 'STORAGE_ERROR' }, 404);

  return new Response(obj.body, {
    headers: {
      'Content-Type': obj.httpMetadata?.contentType ?? 'application/octet-stream',
      'Content-Disposition': `attachment; filename="${attach.filename}"`,
    },
  });
});

// ─── Import ───────────────────────────────────────────────────────────────────

app.post('/import', async (c) => {
  const user = c.get('user');
  const body = await c.req.json<Array<{
    date: string; description: string; amount: number;
    debit_account_id: string; credit_account_id: string; reference?: string;
  }>>();

  if (!Array.isArray(body) || body.length === 0) {
    return c.json({ error: 'Array of import rows required', code: 'INVALID_BODY' }, 400);
  }

  const stmts: D1PreparedStatement[] = [];
  const created: string[] = [];

  for (const row of body) {
    const txnId = crypto.randomUUID().replace(/-/g, '');
    const amt = Math.abs(row.amount);
    created.push(txnId);
    stmts.push(c.env.DB.prepare(`INSERT INTO transactions (id, org_id, date, description, reference, created_by) VALUES (?, ?, ?, ?, ?, ?)`)
      .bind(txnId, user.orgId, row.date, row.description, row.reference ?? null, user.userId));
    stmts.push(c.env.DB.prepare(`INSERT INTO transaction_lines (id, transaction_id, account_id, debit, credit) VALUES (?, ?, ?, ?, 0)`)
      .bind(crypto.randomUUID().replace(/-/g, ''), txnId, row.debit_account_id, amt));
    stmts.push(c.env.DB.prepare(`INSERT INTO transaction_lines (id, transaction_id, account_id, debit, credit) VALUES (?, ?, ?, 0, ?)`)
      .bind(crypto.randomUUID().replace(/-/g, ''), txnId, row.credit_account_id, amt));
  }

  await c.env.DB.batch(stmts);
  return c.json({ imported: created.length, transaction_ids: created }, 201);
});

// ─── Seed (internal) ──────────────────────────────────────────────────────────

app.post('/seed', async (c) => {
  if (c.req.header('X-Internal-Secret') !== c.env.JWT_SECRET) {
    return c.json({ error: 'Forbidden', code: 'FORBIDDEN' }, 403);
  }
  const orgId = c.req.header('X-Org-Id');
  if (!orgId) return c.json({ error: 'X-Org-Id header required', code: 'MISSING_ORG' }, 400);

  const existing = await c.env.DB.prepare('SELECT COUNT(*) as cnt FROM bookkeeping_accounts WHERE org_id = ?').bind(orgId).first<{ cnt: number }>();
  if ((existing?.cnt ?? 0) > 0) return c.json({ message: 'Already seeded', seeded: 0 });

  const stmts = DEFAULT_COA.map(acct => {
    const id = crypto.randomUUID().replace(/-/g, '');
    return c.env.DB.prepare(`INSERT INTO bookkeeping_accounts (id, org_id, code, name, type, subtype) VALUES (?, ?, ?, ?, ?, ?)`)
      .bind(id, orgId, acct.code, acct.name, acct.type, acct.subtype);
  });

  await c.env.DB.batch(stmts);
  return c.json({ message: 'Seeded successfully', seeded: DEFAULT_COA.length });
});

// ─── Reports ──────────────────────────────────────────────────────────────────

app.get('/reports/trial-balance', async (c) => {
  const user = c.get('user');
  const asOf = c.req.query('as_of') ?? new Date().toISOString().slice(0, 10);
  const cacheKey = reportCacheKey(user.orgId, 'trial-balance', asOf);

  const cached = await c.env.REPORT_CACHE.get(cacheKey);
  if (cached) return c.json(JSON.parse(cached));

  const { results } = await c.env.DB.prepare(`
    SELECT a.code, a.name, a.type, a.subtype,
           COALESCE(SUM(tl.debit),  0) as total_debit,
           COALESCE(SUM(tl.credit), 0) as total_credit
    FROM bookkeeping_accounts a
    LEFT JOIN transaction_lines tl ON tl.account_id = a.id
    LEFT JOIN transactions t       ON t.id = tl.transaction_id
      AND t.status = 'POSTED' AND t.date <= ?
    WHERE a.org_id = ? AND a.is_active = 1
    GROUP BY a.id ORDER BY a.code ASC
  `).bind(asOf, user.orgId).all();

  const report = { as_of: asOf, accounts: results, generated_at: new Date().toISOString() };
  await c.env.REPORT_CACHE.put(cacheKey, JSON.stringify(report), { expirationTtl: 300 });
  return c.json(report);
});

app.get('/reports/pl', async (c) => {
  const user = c.get('user');
  const from = c.req.query('from') ?? new Date(new Date().getFullYear(), 0, 1).toISOString().slice(0, 10);
  const to   = c.req.query('to')   ?? new Date().toISOString().slice(0, 10);
  const cacheKey = reportCacheKey(user.orgId, 'pl', `${from}:${to}`);

  const cached = await c.env.REPORT_CACHE.get(cacheKey);
  if (cached) return c.json(JSON.parse(cached));

  const { results } = await c.env.DB.prepare(`
    SELECT a.code, a.name, a.type, a.subtype,
           COALESCE(SUM(tl.credit - tl.debit), 0) as net
    FROM bookkeeping_accounts a
    JOIN transaction_lines tl ON tl.account_id = a.id
    JOIN transactions t       ON t.id = tl.transaction_id
      AND t.status = 'POSTED' AND t.date BETWEEN ? AND ?
    WHERE a.org_id = ? AND a.type IN ('REVENUE','EXPENSE')
    GROUP BY a.id ORDER BY a.type, a.code
  `).bind(from, to, user.orgId).all<{ type: string; net: number }>();

  const revenue  = results.filter(r => r.type === 'REVENUE').reduce((s, r) => s + r.net, 0);
  const expenses = results.filter(r => r.type === 'EXPENSE').reduce((s, r) => s - r.net, 0);
  const report = { from, to, revenue, expenses, net_income: revenue - expenses, accounts: results, generated_at: new Date().toISOString() };
  await c.env.REPORT_CACHE.put(cacheKey, JSON.stringify(report), { expirationTtl: 300 });
  return c.json(report);
});

app.get('/reports/balance-sheet', async (c) => {
  const user = c.get('user');
  const asOf = c.req.query('as_of') ?? new Date().toISOString().slice(0, 10);
  const cacheKey = reportCacheKey(user.orgId, 'balance-sheet', asOf);

  const cached = await c.env.REPORT_CACHE.get(cacheKey);
  if (cached) return c.json(JSON.parse(cached));

  const { results } = await c.env.DB.prepare(`
    SELECT a.code, a.name, a.type, a.subtype,
           COALESCE(SUM(tl.debit - tl.credit), 0) as balance
    FROM bookkeeping_accounts a
    LEFT JOIN transaction_lines tl ON tl.account_id = a.id
    LEFT JOIN transactions t       ON t.id = tl.transaction_id
      AND t.status = 'POSTED' AND t.date <= ?
    WHERE a.org_id = ? AND a.type IN ('ASSET','LIABILITY','EQUITY') AND a.is_active = 1
    GROUP BY a.id ORDER BY a.type, a.code
  `).bind(asOf, user.orgId).all<{ type: string; balance: number }>();

  const totalAssets      = results.filter(r => r.type === 'ASSET').reduce((s, r) => s + r.balance, 0);
  const totalLiabilities = results.filter(r => r.type === 'LIABILITY').reduce((s, r) => s - r.balance, 0);
  const totalEquity      = results.filter(r => r.type === 'EQUITY').reduce((s, r) => s - r.balance, 0);

  const report = { as_of: asOf, total_assets: totalAssets, total_liabilities: totalLiabilities, total_equity: totalEquity, accounts: results, generated_at: new Date().toISOString() };
  await c.env.REPORT_CACHE.put(cacheKey, JSON.stringify(report), { expirationTtl: 300 });
  return c.json(report);
});

export default app;
