// routes/transactions.ts
// CRUD for committed transaction records.

import { Hono } from 'hono';
import type { Env } from '../index.js';
import { getSession } from '../index.js';

export const transactionRoutes = new Hono<{ Bindings: Env }>();

type TxnRow = {
  id: string; org_id: string; date: string;
  description: string; amount: number; category: string; status: string; created_at: string;
};

// GET /api/transactions?limit=50&offset=0&category=&status=
transactionRoutes.get('/', async (c) => {
  const session = getSession(c.req.raw);
  if (!session) return c.json({ error: 'unauthorized' }, 401);

  const limit    = Math.min(Number(c.req.query('limit')  ?? 50), 200);
  const offset   = Number(c.req.query('offset') ?? 0);
  const category = c.req.query('category') ?? '';
  const status   = c.req.query('status')   ?? '';
  const search   = c.req.query('q')        ?? '';

  let sql = `SELECT * FROM transactions WHERE org_id = ?1`;
  const binds: (string | number)[] = [session.orgId];
  let p = 2;

  if (category) { sql += ` AND category = ?${p++}`; binds.push(category); }
  if (status)   { sql += ` AND status = ?${p++}`;   binds.push(status); }
  if (search)   { sql += ` AND description LIKE ?${p++}`; binds.push(`%${search}%`); }

  sql += ` ORDER BY date DESC, created_at DESC LIMIT ?${p++} OFFSET ?${p++}`;
  binds.push(limit, offset);

  const result = await c.env.DB.prepare(sql).bind(...binds).all<TxnRow>();
  const total  = await c.env.DB.prepare(`SELECT COUNT(*) as n FROM transactions WHERE org_id = ?1`)
    .bind(session.orgId).first<{ n: number }>();

  return c.json({ transactions: result.results ?? [], total: total?.n ?? 0, limit, offset });
});

// GET /api/transactions/:id
transactionRoutes.get('/:id', async (c) => {
  const session = getSession(c.req.raw);
  if (!session) return c.json({ error: 'unauthorized' }, 401);
  const row = await c.env.DB.prepare(`SELECT * FROM transactions WHERE id = ?1 AND org_id = ?2`)
    .bind(c.req.param('id'), session.orgId).first<TxnRow>();
  if (!row) return c.json({ error: 'Not found' }, 404);
  return c.json({ transaction: row });
});

// PATCH /api/transactions/:id — update category or status
transactionRoutes.patch('/:id', async (c) => {
  const session = getSession(c.req.raw);
  if (!session) return c.json({ error: 'unauthorized' }, 401);
  const body = await c.req.json<{ category?: string; status?: string; description?: string }>();

  const sets: string[] = [];
  const binds: (string | number)[] = [];
  let p = 1;

  if (body.category)    { sets.push(`category = ?${p++}`);    binds.push(body.category); }
  if (body.status)      { sets.push(`status = ?${p++}`);      binds.push(body.status); }
  if (body.description) { sets.push(`description = ?${p++}`); binds.push(body.description); }
  if (!sets.length) return c.json({ error: 'Nothing to update' }, 400);

  sets.push(`updated_at = datetime('now')`);
  binds.push(c.req.param('id'), session.orgId);

  await c.env.DB.prepare(`UPDATE transactions SET ${sets.join(', ')} WHERE id = ?${p++} AND org_id = ?${p++}`)
    .bind(...binds).run();

  return c.json({ ok: true });
});

// DELETE /api/transactions/:id
transactionRoutes.delete('/:id', async (c) => {
  const session = getSession(c.req.raw);
  if (!session) return c.json({ error: 'unauthorized' }, 401);
  await c.env.DB.prepare(`DELETE FROM transactions WHERE id = ?1 AND org_id = ?2`)
    .bind(c.req.param('id'), session.orgId).run();
  return c.json({ ok: true });
});
