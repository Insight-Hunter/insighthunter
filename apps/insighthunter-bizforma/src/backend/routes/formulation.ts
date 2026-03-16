// apps/insighthunter-bizforma/src/backend/routes/formation.ts
import type { Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';
import type { Env, FormationCase, Paginated } from '../types';
import { bookkeepingHandoffService } from '../services/bookkeepingHandoffService';

export function registerFormationRoutes(
  app: Hono<{ Bindings: Env; Variables: { userId?: string } }>
) {
  const base = '/api/formation';

  app.get(`${base}`, async (c) => {
    const userId = c.var.userId!;
    const page = Number(c.req.query('page') ?? '1');
    const pageSize = Number(c.req.query('pageSize') ?? '20');
    const offset = (page - 1) * pageSize;

    const list = await c.env.DB.prepare(
      `SELECT * FROM formation_cases WHERE user_id = ? ORDER BY created_at DESC LIMIT ? OFFSET ?`
    )
      .bind(userId, pageSize, offset)
      .all<FormationCase>();

    const count = await c.env.DB.prepare(
      `SELECT COUNT(*) as total FROM formation_cases WHERE user_id = ?`
    )
      .bind(userId)
      .first<{ total: number }>();

    return c.json<Paginated<FormationCase>>({
      items: list.results ?? [],
      total: count?.total ?? 0,
    });
  });

  app.post(`${base}`, async (c) => {
    const userId = c.var.userId!;
    const body = await c.req.json<{ entityType?: string; state?: string }>().catch(() => ({}));

    const id = crypto.randomUUID();
    const now = new Date().toISOString();

    await c.env.DB.prepare(
      `INSERT INTO formation_cases (id, user_id, status, entity_type, state, created_at, updated_at)
       VALUES (?, ?, 'NEW', ?, ?, ?, ?)`
    )
      .bind(id, userId, body.entityType ?? null, body.state ?? null, now, now)
      .run();

    const row = await c.env.DB.prepare(
      `SELECT * FROM formation_cases WHERE id = ? AND user_id = ?`
    )
      .bind(id, userId)
      .first<FormationCase>();

    return c.json(row, 201);
  });

  app.get(`${base}/:id`, async (c) => {
    const userId = c.var.userId!;
    const id = c.req.param('id');

    const row = await c.env.DB.prepare(
      `SELECT * FROM formation_cases WHERE id = ? AND user_id = ?`
    )
      .bind(id, userId)
      .first<FormationCase>();

    if (!row) throw new HTTPException(404, { message: 'Formation case not found' });
    return c.json(row);
  });

  app.patch(`${base}/:id`, async (c) => {
    const userId = c.var.userId!;
    const id = c.req.param('id');
    const body = (await c.req.json().catch(() => ({}))) as Partial<FormationCase>;

    const now = new Date().toISOString();
    await c.env.DB.prepare(
      `UPDATE formation_cases
       SET status = COALESCE(?, status),
           entity_type = COALESCE(?, entity_type),
           state = COALESCE(?, state),
           updated_at = ?
       WHERE id = ? AND user_id = ?`
    )
      .bind(body.status ?? null, body.entityType ?? null, body.state ?? null, now, id, userId)
      .run();

    const updated = await c.env.DB.prepare(
      `SELECT * FROM formation_cases WHERE id = ? AND user_id = ?`
    )
      .bind(id, userId)
      .first<FormationCase>();

    if (!updated) throw new HTTPException(404, { message: 'Formation case not found after update' });

    // If formation completed, trigger bookkeeping seed
    if (updated.status === 'COMPLETE') {
      c.executionCtx.waitUntil(bookkeepingHandoffService.onFormationComplete(c.env, updated));
    }

    return c.json(updated);
  });
}
