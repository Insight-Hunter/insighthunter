// apps/insighthunter-bills/src/routes/attachments.ts
import { Hono } from 'hono';
import type { Env } from '../index.js';
import { getSession } from '../index.js';

export const attachmentRoutes = new Hono<{ Bindings: Env }>();

attachmentRoutes.get('/', async (c) => {
  const session = getSession(c.req.raw);
  if (!session) return c.json({ error: 'unauthorized' }, 401);

  const billId = c.req.query('bill_id');
  if (!billId) return c.json({ error: 'bill_id required' }, 400);

  const result = await c.env.DB.prepare(`
    SELECT id, bill_id, file_name, content_type, size_bytes, r2_key, created_at
    FROM bill_attachments
    WHERE org_id = ?1 AND bill_id = ?2
    ORDER BY created_at DESC
  `).bind(session.orgId, billId).all();

  return c.json({ attachments: result.results ?? [] });
});
