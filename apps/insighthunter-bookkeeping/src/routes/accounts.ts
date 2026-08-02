// routes/accounts.ts
// Chart of accounts management — CRUD on the accounts table.

import { Hono } from 'hono';
import type { Env } from '../index.js';
import { getSession } from '../index.js';

export const accountRoutes = new Hono<{ Bindings: Env }>();

const VALID_TYPES = ['ASSET', 'LIABILITY', 'EQUITY', 'REVENUE', 'EXPENSE'];

type AccountRow = {
  id: string; organization_id: string; code: string;
  name: string; type: string; archived: number; created_at: string;
};

// GET /api/accounts
accountRoutes.get('/', async (c) => {
  const session = getSession(c.req.raw);
  if (!session) return c.json({ error: 'unauthorized' }, 401);
  const showArchived = c.req.query('archived') === 'true';
  const sql = showArchived
    ? `SELECT * FROM accounts WHERE organization_id = ?1 ORDER BY type, code`
    : `SELECT * FROM accounts WHERE organization_id = ?1 AND archived = 0 ORDER BY type, code`;
  const result = await c.env.DB.prepare(sql).bind(session.orgId).all<AccountRow>();
  return c.json({ accounts: result.results ?? [] });
});

// POST /api/accounts
accountRoutes.post('/', async (c) => {
  const session = getSession(c.req.raw);
  if (!session) return c.json({ error: 'unauthorized' }, 401);
  if (!['owner', 'admin'].includes(session.role)) return c.json({ error: 'forbidden' }, 403);

  const body = await c.req.json<{ code: string; name: string; type: string }>();
  if (!body.code || !body.name || !body.type) return c.json({ error: 'code, name, type required' }, 400);
  if (!VALID_TYPES.includes(body.type)) return c.json({ error: `type must be one of: ${VALID_TYPES.join(', ')}` }, 400);

  // Check unique code within org
  const existing = await c.env.DB.prepare(`SELECT id FROM accounts WHERE organization_id = ?1 AND code = ?2`)
    .bind(session.orgId, body.code).first();
  if (existing) return c.json({ error: 'Account code already exists' }, 409);

  const id = crypto.randomUUID();
  await c.env.DB.prepare(
    `INSERT INTO accounts (id, organization_id, code, name, type, archived, created_at)
     VALUES (?1, ?2, ?3, ?4, ?5, 0, datetime('now'))`
  ).bind(id, session.orgId, body.code, body.name, body.type).run();

  return c.json({ id, code: body.code, name: body.name, type: body.type, archived: false }, 201);
});

// PATCH /api/accounts/:id
accountRoutes.patch('/:id', async (c) => {
  const session = getSession(c.req.raw);
  if (!session) return c.json({ error: 'unauthorized' }, 401);
  if (!['owner', 'admin'].includes(session.role)) return c.json({ error: 'forbidden' }, 403);

  const body = await c.req.json<{ name?: string; archived?: boolean }>();
  const sets: string[] = [];
  const binds: (string | number)[] = [];
  let p = 1;

  if (body.name !== undefined)     { sets.push(`name = ?${p++}`);     binds.push(body.name); }
  if (body.archived !== undefined) { sets.push(`archived = ?${p++}`); binds.push(body.archived ? 1 : 0); }
  if (!sets.length) return c.json({ error: 'Nothing to update' }, 400);

  binds.push(c.req.param('id'), session.orgId);
  await c.env.DB.prepare(`UPDATE accounts SET ${sets.join(', ')} WHERE id = ?${p++} AND organization_id = ?${p++}`)
    .bind(...binds).run();

  return c.json({ ok: true });
});
