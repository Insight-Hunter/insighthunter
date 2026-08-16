// apps/insighthunter-bills/src/routes/vendors.ts
import { Hono } from 'hono';
import type { Env, Session } from '../index.js';
import { getSession } from '../index.js';

export const vendorRoutes = new Hono<{ Bindings: Env }>();

vendorRoutes.get('/', async (c) => {
  const session = getSession(c.req.raw);
  if (!session) return c.json({ error: 'unauthorized' }, 401);

  const result = await c.env.DB.prepare(`
    SELECT id, name, email, payment_terms, status, created_at, updated_at
    FROM vendors
    WHERE org_id = ?1
    ORDER BY name ASC
  `).bind(session.orgId).all();

  return c.json({ vendors: result.results ?? [] });
});

vendorRoutes.post('/', async (c) => {
  const session = getSession(c.req.raw);
  if (!session) return c.json({ error: 'unauthorized' }, 401);
  if (!['owner', 'admin'].includes(session.role)) return c.json({ error: 'forbidden' }, 403);

  const body = await c.req.json<{
    name: string;
    email?: string | null;
    payment_terms?: string;
  }>();

  if (!body.name?.trim()) return c.json({ error: 'name required' }, 400);

  const id = crypto.randomUUID();
  await c.env.DB.prepare(`
    INSERT INTO vendors (id, org_id, name, email, payment_terms, status, created_at, updated_at)
    VALUES (?1, ?2, ?3, ?4, ?5, 'active', datetime('now'), datetime('now'))
  `).bind(id, session.orgId, body.name.trim(), body.email ?? null, body.payment_terms ?? 'Net 30').run();

  return c.json({ id, name: body.name.trim() }, 201);
});

vendorRoutes.patch('/:id', async (c) => {
  const session = getSession(c.req.raw);
  if (!session) return c.json({ error: 'unauthorized' }, 401);
  if (!['owner', 'admin'].includes(session.role)) return c.json({ error: 'forbidden' }, 403);

  const body = await c.req.json<{ name?: string; email?: string | null; payment_terms?: string; status?: string }>();
  const sets: string[] = ['updated_at = datetime(\'now\')'];
  const binds: (string | null)[] = [];
  let p = 1;

  if (body.name !== undefined) { sets.push(`name = ?${p++}`); binds.push(body.name); }
  if (body.email !== undefined) { sets.push(`email = ?${p++}`); binds.push(body.email); }
  if (body.payment_terms !== undefined) { sets.push(`payment_terms = ?${p++}`); binds.push(body.payment_terms); }
  if (body.status !== undefined) { sets.push(`status = ?${p++}`); binds.push(body.status); }

  binds.push(c.req.param('id'));
  binds.push(session.orgId);
  await c.env.DB.prepare(`UPDATE vendors SET ${sets.join(', ')} WHERE id = ?${p++} AND org_id = ?${p++}`)
    .bind(...binds).run();

  return c.json({ ok: true });
});
