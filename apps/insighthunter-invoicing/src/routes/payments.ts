// routes/payments.ts
// Record payments against invoices. Supports partial payments.
// On full payment: marks invoice paid, writes revenue journal entry.

import { Hono } from 'hono';
import type { Env } from '../index.js';
import { getSession } from '../index.js';
import { writeRevenueJournalEntry } from '../services/journal-writer.js';

export const paymentRoutes = new Hono<{ Bindings: Env }>();

// POST /api/payments
// Body: { invoice_id, amount, method, paid_at?, reference? }
paymentRoutes.post('/', async (c) => {
  const session = getSession(c.req.raw);
  if (!session) return c.json({ error: 'unauthorized' }, 401);

  const body = await c.req.json<{
    invoice_id: string;
    amount: number;
    method?: string;  // bank_transfer | check | card | cash | other
    paid_at?: string;
    reference?: string;
  }>();

  if (!body.invoice_id) return c.json({ error: 'invoice_id required' }, 400);
  if (!body.amount || body.amount <= 0) return c.json({ error: 'amount must be positive' }, 400);

  // Fetch invoice — must belong to this org and be in a payable state
  const inv = await c.env.DB.prepare(
    `SELECT id, org_id, total_amount, amount_paid, status, number FROM invoices WHERE id = ?1 AND org_id = ?2`
  ).bind(body.invoice_id, session.orgId).first<{
    id: string; org_id: string; total_amount: number;
    amount_paid: number; status: string; number: string;
  }>();
  if (!inv) return c.json({ error: 'Invoice not found' }, 404);
  if (['void', 'draft'].includes(inv.status)) return c.json({ error: 'Cannot apply payment to a draft or voided invoice' }, 409);

  const remaining = parseFloat((inv.total_amount - inv.amount_paid).toFixed(2));
  const applying  = Math.min(body.amount, remaining); // cap at remaining balance
  const newPaid   = parseFloat((inv.amount_paid + applying).toFixed(2));
  const isFullyPaid = newPaid >= inv.total_amount - 0.001;

  const paymentId = crypto.randomUUID();
  const paidAt    = body.paid_at ?? new Date().toISOString().slice(0, 10);

  const stmts = [
    // Record payment
    c.env.DB.prepare(`
      INSERT INTO invoice_payments (id, invoice_id, org_id, amount, method, paid_at, reference, created_at)
      VALUES (?1,?2,?3,?4,?5,?6,?7,datetime('now'))
    `).bind(paymentId, inv.id, session.orgId, applying,
        body.method ?? 'other', paidAt, body.reference ?? null),

    // Update invoice amount_paid + status
    c.env.DB.prepare(`
      UPDATE invoices
      SET amount_paid = ?1,
          status = ?2,
          paid_at = CASE WHEN ?3 = 1 THEN ?4 ELSE paid_at END,
          updated_at = datetime('now')
      WHERE id = ?5
    `).bind(newPaid, isFullyPaid ? 'paid' : inv.status, isFullyPaid ? 1 : 0, paidAt, inv.id),
  ];

  await c.env.DB.batch(stmts);

  // On full payment: write double-entry revenue journal entry
  if (isFullyPaid) {
    try {
      await writeRevenueJournalEntry({
        db: c.env.DB,
        orgId: session.orgId,
        amount: inv.total_amount,
        memo: `Invoice ${inv.number} — payment received`,
        postedAt: paidAt,
      });
    } catch (err) {
      // Non-fatal: log but don't fail the payment recording
      console.error('[invoicing] journal entry write failed', err);
    }
  }

  return c.json({
    ok: true,
    paymentId,
    applying,
    newPaid,
    remaining: parseFloat((inv.total_amount - newPaid).toFixed(2)),
    invoiceStatus: isFullyPaid ? 'paid' : inv.status,
  });
});

// GET /api/payments?invoice_id=
paymentRoutes.get('/', async (c) => {
  const session = getSession(c.req.raw);
  if (!session) return c.json({ error: 'unauthorized' }, 401);
  const invoiceId = c.req.query('invoice_id') ?? '';
  if (!invoiceId) return c.json({ error: 'invoice_id query param required' }, 400);

  const result = await c.env.DB.prepare(
    `SELECT * FROM invoice_payments WHERE invoice_id = ?1 AND org_id = ?2 ORDER BY paid_at ASC`
  ).bind(invoiceId, session.orgId).all();

  return c.json({ payments: result.results ?? [] });
});
