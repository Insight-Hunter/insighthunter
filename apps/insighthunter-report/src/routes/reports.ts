// routes/reports.ts
// All financial report endpoints — derived from shared D1 journal data.
// Reports: trial-balance, profit-loss, balance-sheet, cash-flow, ar-aging, ap-aging.

import { Hono } from 'hono';
import type { Env } from '../index.js';
import { getSession } from '../index.js';

export const reportRoutes = new Hono<{ Bindings: Env }>();

// ── Trial Balance ─────────────────────────────────────────────────────────────
reportRoutes.get('/trial-balance', async (c) => {
  const session = getSession(c.req.raw);
  if (!session) return c.json({ error: 'unauthorized' }, 401);

  const { results } = await c.env.DB.prepare(`
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
  `).bind(session.orgId).all<{ code: string; name: string; type: string; total_debit: number; total_credit: number }>();

  const totals = (results ?? []).reduce(
    (acc, r) => ({ debit: acc.debit + r.total_debit, credit: acc.credit + r.total_credit }),
    { debit: 0, credit: 0 },
  );

  return c.json({ items: results ?? [], totals });
});

// ── Profit & Loss ─────────────────────────────────────────────────────────────
reportRoutes.get('/profit-loss', async (c) => {
  const session = getSession(c.req.raw);
  if (!session) return c.json({ error: 'unauthorized' }, 401);

  const from = c.req.query('from') ?? `${new Date().getFullYear()}-01-01`;
  const to   = c.req.query('to')   ?? new Date().toISOString().slice(0, 10);

  const { results } = await c.env.DB.prepare(`
    SELECT a.name, a.type,
           COALESCE(SUM(jl.credit - jl.debit), 0) AS amount
    FROM accounts a
    JOIN journal_lines jl ON jl.account_id = a.id
    JOIN journal_entries je ON je.id = jl.journal_entry_id
    WHERE je.organization_id = ?1
      AND a.organization_id  = ?1
      AND je.posted_at BETWEEN ?2 AND ?3
      AND a.type IN ('REVENUE', 'EXPENSE')
    GROUP BY a.id, a.name, a.type
    ORDER BY a.type DESC, a.name ASC
  `).bind(session.orgId, from, to).all<{ name: string; type: string; amount: number }>();

  const revenue  = (results ?? []).filter(r => r.type === 'REVENUE');
  const expenses = (results ?? []).filter(r => r.type === 'EXPENSE').map(r => ({ ...r, amount: Math.abs(r.amount) }));

  const total_revenue  = revenue.reduce((s, r) => s + r.amount, 0);
  const total_expenses = expenses.reduce((s, r) => s + r.amount, 0);
  const net_income = total_revenue - total_expenses;

  return c.json({ period: `${from} — ${to}`, revenue, expenses, total_revenue, total_expenses, net_income });
});

// ── Balance Sheet ─────────────────────────────────────────────────────────────
reportRoutes.get('/balance-sheet', async (c) => {
  const session = getSession(c.req.raw);
  if (!session) return c.json({ error: 'unauthorized' }, 401);

  const as_of = c.req.query('as_of') ?? new Date().toISOString().slice(0, 10);

  const { results } = await c.env.DB.prepare(`
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
  `).bind(session.orgId, as_of).all<{ name: string; type: string; balance: number }>();

  const assets      = (results ?? []).filter(r => r.type === 'ASSET');
  const liabilities = (results ?? []).filter(r => r.type === 'LIABILITY').map(r => ({ ...r, balance: Math.abs(r.balance) }));
  const equity      = (results ?? []).filter(r => r.type === 'EQUITY').map(r => ({ ...r, balance: Math.abs(r.balance) }));

  return c.json({
    as_of,
    assets, liabilities, equity,
    total_assets:      assets.reduce((s, r) => s + r.balance, 0),
    total_liabilities: liabilities.reduce((s, r) => s + r.balance, 0),
    total_equity:      equity.reduce((s, r) => s + r.balance, 0),
  });
});

// ── Cash Flow (indirect method approximation) ─────────────────────────────────
reportRoutes.get('/cash-flow', async (c) => {
  const session = getSession(c.req.raw);
  if (!session) return c.json({ error: 'unauthorized' }, 401);

  const from = c.req.query('from') ?? `${new Date().getFullYear()}-01-01`;
  const to   = c.req.query('to')   ?? new Date().toISOString().slice(0, 10);

  const cashInRows = await c.env.DB.prepare(`
    SELECT COALESCE(SUM(jl.credit), 0) AS cash_in,
           COALESCE(SUM(jl.debit),  0) AS cash_out
    FROM journal_lines jl
    JOIN journal_entries je ON je.id = jl.journal_entry_id
    JOIN accounts a ON a.id = jl.account_id
    WHERE je.organization_id = ?1
      AND a.organization_id  = ?1
      AND je.posted_at BETWEEN ?2 AND ?3
      AND a.type = 'ASSET' AND a.code LIKE '1%'
  `).bind(session.orgId, from, to).first<{ cash_in: number; cash_out: number }>();

  const revenue_collected = cashInRows?.cash_in  ?? 0;
  const expenses_paid     = cashInRows?.cash_out ?? 0;
  const net_operating     = revenue_collected - expenses_paid;

  return c.json({
    period: `${from} — ${to}`,
    operating: [
      { label: 'Revenue collected', amount:  revenue_collected },
      { label: 'Expenses paid',     amount: -expenses_paid },
    ],
    investing: [],
    financing: [],
    net_operating,
    net_investing: 0,
    net_financing: 0,
    net_change: net_operating,
  });
});

// ── AR Aging ──────────────────────────────────────────────────────────────────
reportRoutes.get('/ar-aging', async (c) => {
  const session = getSession(c.req.raw);
  if (!session) return c.json({ error: 'unauthorized' }, 401);

  const today = new Date().toISOString().slice(0, 10);

  const { results } = await c.env.DB.prepare(`
    SELECT
      c.name,
      COALESCE(SUM(CASE WHEN julianday(?2) - julianday(i.due_date) <= 0   THEN i.total_amount - i.amount_paid ELSE 0 END), 0) AS current,
      COALESCE(SUM(CASE WHEN julianday(?2) - julianday(i.due_date) BETWEEN 1  AND 30  THEN i.total_amount - i.amount_paid ELSE 0 END), 0) AS days_30,
      COALESCE(SUM(CASE WHEN julianday(?2) - julianday(i.due_date) BETWEEN 31 AND 60  THEN i.total_amount - i.amount_paid ELSE 0 END), 0) AS days_60,
      COALESCE(SUM(CASE WHEN julianday(?2) - julianday(i.due_date) > 60               THEN i.total_amount - i.amount_paid ELSE 0 END), 0) AS days_90_plus,
      COALESCE(SUM(i.total_amount - i.amount_paid), 0) AS total
    FROM invoices i
    LEFT JOIN clients c ON c.id = i.client_id
    WHERE i.org_id = ?1 AND i.status IN ('sent','overdue')
    GROUP BY c.id, c.name
    ORDER BY total DESC
  `).bind(session.orgId, today).all<{
    name: string; current: number; days_30: number;
    days_60: number; days_90_plus: number; total: number;
  }>();

  return c.json({ as_of: today, items: results ?? [] });
});

// ── AP Aging (stub — wires to bills module when built) ────────────────────────
reportRoutes.get('/ap-aging', async (c) => {
  const session = getSession(c.req.raw);
  if (!session) return c.json({ error: 'unauthorized' }, 401);
  const today = new Date().toISOString().slice(0, 10);
  return c.json({ as_of: today, items: [], note: 'Requires bills module — coming soon' });
});
