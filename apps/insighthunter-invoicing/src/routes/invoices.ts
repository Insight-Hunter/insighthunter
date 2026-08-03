// routes/invoices.ts
// Invoice CRUD, line items, status machine, PDF generation trigger, send action.

import { Hono } from 'hono';
import type { Env } from '../index.js';
import { getSession } from '../index.js';
import { nextInvoiceNumber } from '../services/number-sequence.js';
import { generateInvoicePdf } from '../services/invoice-pdf.js';

export const invoiceRoutes = new Hono<{ Bindings: Env }>();

type InvoiceRow = {
  id: string; org_id: string; client_id: string | null; number: string;
  status: string; issue_date: string; due_date: string | null;
  subtotal: number; tax_rate: number; tax_amount: number; total_amount: number;
  amount_paid: number; memo: string | null; paid_at: string | null;
  created_at: string; updated_at: string;
};

type LineItemRow = {
  id: string; invoice_id: string; description: string;
  quantity: number; unit_price: number; amount: number; sort_order: number;
};

// ── List ──────────────────────────────────────────────────────────────────────
invoiceRoutes.get('/', async (c) => {
  const session = getSession(c.req.raw);
  if (!session) return c.json({ error: 'unauthorized' }, 401);

  const status = c.req.query('status') ?? '';
  const clientId = c.req.query('client_id') ?? '';
  const limit  = Math.min(Number(c.req.query('limit') ?? 50), 200);
  const offset = Number(c.req.query('offset') ?? 0);

  let sql = `
    SELECT i.*, c.name AS client_name
    FROM invoices i LEFT JOIN clients c ON i.client_id = c.id
    WHERE i.org_id = ?1`;
  const binds: (string | number)[] = [session.orgId];
  let p = 2;

  if (status)   { sql += ` AND i.status = ?${p++}`;    binds.push(status); }
  if (clientId) { sql += ` AND i.client_id = ?${p++}`; binds.push(clientId); }
  sql += ` ORDER BY i.created_at DESC LIMIT ?${p++} OFFSET ?${p++}`;
  binds.push(limit, offset);

  const result = await c.env.DB.prepare(sql).bind(...binds).all();
  return c.json({ invoices: result.results ?? [], limit, offset });
});

// ── Get single ────────────────────────────────────────────────────────────────
invoiceRoutes.get('/:id', async (c) => {
  const session = getSession(c.req.raw);
  if (!session) return c.json({ error: 'unauthorized' }, 401);

  const inv = await c.env.DB.prepare(`
    SELECT i.*, c.name AS client_name, c.email AS client_email,
           c.address AS client_address
    FROM invoices i LEFT JOIN clients c ON i.client_id = c.id
    WHERE i.id = ?1 AND i.org_id = ?2
  `).bind(c.req.param('id'), session.orgId).first<InvoiceRow & { client_name: string; client_email: string; client_address: string }>();

  if (!inv) return c.json({ error: 'Not found' }, 404);

  const lines = await c.env.DB.prepare(
    `SELECT * FROM invoice_line_items WHERE invoice_id = ?1 ORDER BY sort_order ASC`
  ).bind(inv.id).all<LineItemRow>();

  const payments = await c.env.DB.prepare(
    `SELECT * FROM invoice_payments WHERE invoice_id = ?1 ORDER BY paid_at ASC`
  ).bind(inv.id).all();

  return c.json({ invoice: inv, lineItems: lines.results ?? [], payments: payments.results ?? [] });
});

// ── Create ─────────────────────────────────────────────────────────────────────
invoiceRoutes.post('/', async (c) => {
  const session = getSession(c.req.raw);
  if (!session) return c.json({ error: 'unauthorized' }, 401);

  const body = await c.req.json<{
    client_id?: string;
    issue_date: string;
    due_date?: string;
    memo?: string;
    tax_rate?: number;
    line_items: { description: string; quantity: number; unit_price: number }[];
  }>();

  if (!body.issue_date) return c.json({ error: 'issue_date required' }, 400);
  if (!body.line_items?.length) return c.json({ error: 'At least one line item required' }, 400);

  const id     = crypto.randomUUID();
  const number = await nextInvoiceNumber(c.env.DB, session.orgId);
  const taxRate = body.tax_rate ?? 0;

  const subtotal = body.line_items.reduce((s, l) => s + l.quantity * l.unit_price, 0);
  const taxAmount = parseFloat((subtotal * (taxRate / 100)).toFixed(2));
  const total     = parseFloat((subtotal + taxAmount).toFixed(2));

  const stmts = [
    c.env.DB.prepare(`
      INSERT INTO invoices (id, org_id, client_id, number, status, issue_date, due_date,
        subtotal, tax_rate, tax_amount, total_amount, amount_paid, memo, created_at, updated_at)
      VALUES (?1,?2,?3,?4,'draft',?5,?6,?7,?8,?9,?10,0,?11,datetime('now'),datetime('now'))
    `).bind(id, session.orgId, body.client_id ?? null, number, body.issue_date,
        body.due_date ?? null, subtotal, taxRate, taxAmount, total, body.memo ?? null),
    ...body.line_items.map((l, i) =>
      c.env.DB.prepare(`
        INSERT INTO invoice_line_items (id, invoice_id, description, quantity, unit_price, amount, sort_order)
        VALUES (?1,?2,?3,?4,?5,?6,?7)
      `).bind(crypto.randomUUID(), id, l.description, l.quantity, l.unit_price,
          parseFloat((l.quantity * l.unit_price).toFixed(2)), i)
    ),
  ];

  await c.env.DB.batch(stmts);
  return c.json({ id, number, status: 'draft', total }, 201);
});

// ── Update (draft only — prevent editing sent/paid) ────────────────────────────
invoiceRoutes.patch('/:id', async (c) => {
  const session = getSession(c.req.raw);
  if (!session) return c.json({ error: 'unauthorized' }, 401);

  const inv = await c.env.DB.prepare(`SELECT status FROM invoices WHERE id = ?1 AND org_id = ?2`)
    .bind(c.req.param('id'), session.orgId).first<{ status: string }>();
  if (!inv) return c.json({ error: 'Not found' }, 404);
  if (!['draft'].includes(inv.status)) return c.json({ error: 'Only draft invoices can be edited' }, 409);

  const body = await c.req.json<{ due_date?: string; memo?: string; tax_rate?: number }>();
  const sets: string[] = [`updated_at = datetime('now')`];
  const binds: (string | number | null)[] = [];
  let p = 1;

  if (body.due_date  !== undefined) { sets.push(`due_date = ?${p++}`);  binds.push(body.due_date); }
  if (body.memo      !== undefined) { sets.push(`memo = ?${p++}`);      binds.push(body.memo); }
  if (body.tax_rate  !== undefined) { sets.push(`tax_rate = ?${p++}`);  binds.push(body.tax_rate); }

  binds.push(c.req.param('id'), session.orgId);
  await c.env.DB.prepare(`UPDATE invoices SET ${sets.join(', ')} WHERE id = ?${p++} AND org_id = ?${p++}`)
    .bind(...binds).run();

  return c.json({ ok: true });
});

// ── Status transitions ─────────────────────────────────────────────────────────
// POST /api/invoices/:id/send       draft → sent
// POST /api/invoices/:id/void       draft|sent → void
// POST /api/invoices/:id/mark-overdue  sent → overdue (called by scheduled job or manually)

invoiceRoutes.post('/:id/send', async (c) => {
  const session = getSession(c.req.raw);
  if (!session) return c.json({ error: 'unauthorized' }, 401);

  const inv = await c.env.DB.prepare(`SELECT status FROM invoices WHERE id = ?1 AND org_id = ?2`)
    .bind(c.req.param('id'), session.orgId).first<{ status: string }>();
  if (!inv) return c.json({ error: 'Not found' }, 404);
  if (inv.status !== 'draft') return c.json({ error: 'Only draft invoices can be sent' }, 409);

  await c.env.DB.prepare(`UPDATE invoices SET status = 'sent', updated_at = datetime('now') WHERE id = ?1`)
    .bind(c.req.param('id')).run();

  return c.json({ ok: true, status: 'sent' });
});

invoiceRoutes.post('/:id/void', async (c) => {
  const session = getSession(c.req.raw);
  if (!session) return c.json({ error: 'unauthorized' }, 401);

  const inv = await c.env.DB.prepare(`SELECT status FROM invoices WHERE id = ?1 AND org_id = ?2`)
    .bind(c.req.param('id'), session.orgId).first<{ status: string }>();
  if (!inv) return c.json({ error: 'Not found' }, 404);
  if (['paid', 'void'].includes(inv.status)) return c.json({ error: 'Cannot void a paid or already voided invoice' }, 409);

  await c.env.DB.prepare(`UPDATE invoices SET status = 'void', updated_at = datetime('now') WHERE id = ?1`)
    .bind(c.req.param('id')).run();

  return c.json({ ok: true, status: 'void' });
});

// ── PDF generation ─────────────────────────────────────────────────────────────
// POST /api/invoices/:id/pdf  → renders HTML → Cloudflare Browser → R2, returns PDF URL
invoiceRoutes.post('/:id/pdf', async (c) => {
  const session = getSession(c.req.raw);
  if (!session) return c.json({ error: 'unauthorized' }, 401);

  const inv = await c.env.DB.prepare(`
    SELECT i.*, c.name AS client_name, c.email AS client_email, c.address AS client_address
    FROM invoices i LEFT JOIN clients c ON i.client_id = c.id
    WHERE i.id = ?1 AND i.org_id = ?2
  `).bind(c.req.param('id'), session.orgId).first<InvoiceRow & { client_name: string; client_email: string; client_address: string }>();
  if (!inv) return c.json({ error: 'Not found' }, 404);

  const lines = await c.env.DB.prepare(
    `SELECT * FROM invoice_line_items WHERE invoice_id = ?1 ORDER BY sort_order ASC`
  ).bind(inv.id).all<LineItemRow>();

  const pdfKey = await generateInvoicePdf({
    env: c.env,
    invoice: inv,
    lineItems: lines.results ?? [],
    orgName: session.orgName,
  });

  return c.json({ ok: true, pdfKey, url: `/invoices/${inv.id}/pdf` });
});
