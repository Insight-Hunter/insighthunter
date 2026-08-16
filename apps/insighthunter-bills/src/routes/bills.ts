// apps/insighthunter-bills/src/routes/bills.ts
import { Hono } from 'hono';
import type { Env } from '../index.js';
import { getSession } from '../index.js';
import { writeBillJournalEntry } from '../services/bill-journal-writer.js';

export const billRoutes = new Hono<{ Bindings: Env }>();

billRoutes.get('/', async (c) => {
  const session = getSession(c.req.raw);
  if (!session) return c.json({ error: 'unauthorized' }, 401);

  const result = await c.env.DB.prepare(`
    SELECT
      b.*,
      COALESCE(SUM(bl.amount), 0) AS line_total
    FROM bills b
    LEFT JOIN bill_lines bl ON bl.bill_id = b.id
    WHERE b.org_id = ?1
    GROUP BY b.id
    ORDER BY b.created_at DESC
  `).bind(session.orgId).all();

  return c.json({ bills: result.results ?? [] });
});

billRoutes.get('/:id', async (c) => {
  const session = getSession(c.req.raw);
  if (!session) return c.json({ error: 'unauthorized' }, 401);

  const bill = await c.env.DB.prepare(`
    SELECT * FROM bills WHERE id = ?1 AND org_id = ?2
  `).bind(c.req.param('id'), session.orgId).first();

  if (!bill) return c.json({ error: 'Not found' }, 404);

  const lines = await c.env.DB.prepare(`
    SELECT * FROM bill_lines WHERE bill_id = ?1 ORDER BY position ASC
  `).bind(c.req.param('id')).all();

  return c.json({ bill, lines: lines.results ?? [] });
});

billRoutes.post('/', async (c) => {
  const session = getSession(c.req.raw);
  if (!session) return c.json({ error: 'unauthorized' }, 401);
  if (!['owner', 'admin', 'bookkeeper'].includes(session.role)) return c.json({ error: 'forbidden' }, 403);

  const body = await c.req.json<{
    vendor_id?: string;
    bill_number?: string;
    issue_date: string;
    due_date: string;
    memo?: string;
    total_amount: number;
    lines?: { description: string; amount: number; account_code?: string }[];
    auto_post?: boolean;
  }>();

  if (!body.issue_date || !body.due_date) return c.json({ error: 'issue_date and due_date required' }, 400);
  if (!body.total_amount || body.total_amount <= 0) return c.json({ error: 'total_amount must be positive' }, 400);

  let vendorName = 'Unknown Vendor';
  if (body.vendor_id) {
    const vendor = await c.env.DB.prepare(`
      SELECT name FROM vendors WHERE id = ?1 AND org_id = ?2
    `).bind(body.vendor_id, session.orgId).first<{ name: string }>();
    if (!vendor) return c.json({ error: 'vendor not found' }, 404);
    vendorName = vendor.name;
  }

  const id = crypto.randomUUID();
  const billNumber = body.bill_number?.trim() || `BILL-${Date.now().toString().slice(-6)}`;
  const balanceDue = body.total_amount;

  const billStmt = c.env.DB.prepare(`
    INSERT INTO bills (
      id, org_id, vendor_id, vendor_name, bill_number, issue_date, due_date,
      memo, total_amount, amount_paid, balance_due, status, created_at, updated_at
    ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, 0, ?9, 'received', datetime('now'), datetime('now'))
  `).bind(id, session.orgId, body.vendor_id ?? null, vendorName, billNumber, body.issue_date, body.due_date, body.memo ?? null, body.total_amount);

  const lineStmts = (body.lines?.length ? body.lines : [{
    description: body.memo ?? `Bill ${billNumber}`,
    amount: body.total_amount,
    account_code: '6000',
  }]).map((line, idx) => c.env.DB.prepare(`
    INSERT INTO bill_lines (
      id, bill_id, position, description, amount, account_code, created_at
    ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, datetime('now'))
  `).bind(crypto.randomUUID(), id, idx + 1, line.description, line.amount, line.account_code ?? '6000'));

  await c.env.DB.batch([billStmt, ...lineStmts]);

  try {
    await writeBillJournalEntry({
      db: c.env.DB,
      orgId: session.orgId,
      billId: id,
      totalAmount: body.total_amount,
      memo: body.memo ?? `Bill ${billNumber}`,
      postedAt: body.issue_date,
    });
  } catch (err) {
    console.error('[bills] journal post failed', err);
  }

  if (body.auto_post) {
    await c.env.DB.prepare(`
      UPDATE bills SET status = 'approved', approved_at = datetime('now'), updated_at = datetime('now')
      WHERE id = ?1
    `).bind(id).run();
  }

  return c.json({ id, bill_number: billNumber, balance_due: balanceDue }, 201);
});

billRoutes.post('/:id/approve', async (c) => {
  const session = getSession(c.req.raw);
  if (!session) return c.json({ error: 'unauthorized' }, 401);
  if (!['owner', 'admin', 'bookkeeper'].includes(session.role)) return c.json({ error: 'forbidden' }, 403);

  const bill = await c.env.DB.prepare(`
    SELECT * FROM bills WHERE id = ?1 AND org_id = ?2
  `).bind(c.req.param('id'), session.orgId).first<any>();
  if (!bill) return c.json({ error: 'Not found' }, 404);
  if (bill.status === 'void') return c.json({ error: 'Cannot approve void bill' }, 409);

  await c.env.DB.prepare(`
    UPDATE bills SET status = 'approved', approved_at = datetime('now'), updated_at = datetime('now')
    WHERE id = ?1
  `).bind(bill.id).run();

  return c.json({ ok: true });
});

billRoutes.post('/:id/void', async (c) => {
  const session = getSession(c.req.raw);
  if (!session) return c.json({ error: 'unauthorized' }, 401);
  if (!['owner', 'admin'].includes(session.role)) return c.json({ error: 'forbidden' }, 403);

  await c.env.DB.prepare(`
    UPDATE bills SET status = 'void', updated_at = datetime('now') WHERE id = ?1 AND org_id = ?2
  `).bind(c.req.param('id'), session.orgId).run();

  return c.json({ ok: true });
});
