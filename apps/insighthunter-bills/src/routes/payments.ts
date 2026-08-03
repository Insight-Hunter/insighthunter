// apps/insighthunter-bills/src/routes/payments.ts
import { Hono } from 'hono';
import type { Env } from '../index.js';
import { getSession } from '../index.js';
import { writeBillPaymentJournalEntry } from '../services/bill-journal-writer.js';

export const paymentRoutes = new Hono<{ Bindings: Env }>();

paymentRoutes.get('/', async (c) => {
  const session = getSession(c.req.raw);
  if (!session) return c.json({ error: 'unauthorized' }, 401);

  const result = await c.env.DB.prepare(`
    SELECT p.*, b.bill_number, b.vendor_name
    FROM bill_payments p
    JOIN bills b ON b.id = p.bill_id
    WHERE p.org_id = ?1
    ORDER BY p.paid_at DESC
    LIMIT 100
  `).bind(session.orgId).all();

  return c.json({ payments: result.results ?? [] });
});

paymentRoutes.post('/', async (c) => {
  const session = getSession(c.req.raw);
  if (!session) return c.json({ error: 'unauthorized' }, 401);
  if (!['owner', 'admin', 'bookkeeper'].includes(session.role)) return c.json({ error: 'forbidden' }, 403);

  const body = await c.req.json<{
    bill_id: string;
    amount: number;
    method: string;
    paid_at: string;
    memo?: string;
  }>();

  if (!body.bill_id) return c.json({ error: 'bill_id required' }, 400);
  if (!body.amount || body.amount <= 0) return c.json({ error: 'amount must be positive' }, 400);

  const bill = await c.env.DB.prepare(`
    SELECT * FROM bills WHERE id = ?1 AND org_id = ?2
  `).bind(body.bill_id, session.orgId).first<any>();

  if (!bill) return c.json({ error: 'bill not found' }, 404);
  if (bill.status === 'void') return c.json({ error: 'Cannot pay void bill' }, 409);

  const applied = Math.min(body.amount, bill.balance_due);
  const remaining = Math.max(0, bill.balance_due - applied);
  const paymentId = crypto.randomUUID();

  await c.env.DB.batch([
    c.env.DB.prepare(`
      INSERT INTO bill_payments (
        id, org_id, bill_id, amount, method, paid_at, memo, created_at
      ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, datetime('now'))
    `).bind(paymentId, session.orgId, body.bill_id, applied, body.method, body.paid_at, body.memo ?? null),

    c.env.DB.prepare(`
      UPDATE bills
      SET amount_paid = amount_paid + ?1,
          balance_due = ?2,
          status = CASE
            WHEN ?2 <= 0.005 THEN 'paid'
            WHEN due_date < ?3 THEN 'overdue'
            ELSE 'scheduled'
          END,
          paid_at = CASE WHEN ?2 <= 0.005 THEN ?3 ELSE paid_at END,
          updated_at = datetime('now')
      WHERE id = ?4 AND org_id = ?5
    `).bind(applied, remaining, body.paid_at, body.bill_id, session.orgId),
  ]);

  try {
    await writeBillPaymentJournalEntry({
      db: c.env.DB,
      orgId: session.orgId,
      billId: body.bill_id,
      amount: applied,
      memo: body.memo ?? `Payment for bill ${bill.bill_number}`,
      postedAt: body.paid_at,
    });
  } catch (err) {
    console.error('[bills] payment journal failed', err);
  }

  return c.json({ ok: true, payment_id: paymentId, applied, remaining });
});
