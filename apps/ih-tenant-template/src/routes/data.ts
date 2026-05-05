import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import type { Env } from '../worker';

const data = new Hono<{ Bindings: Env }>();

// Generic KV get/set for tenant-scoped config
data.get('/config/:key', async (c) => {
  const orgId = c.get('orgId' as never) as string;
  const key = c.req.param('key');
  const value = await c.env.IH_TENANT_KV.get(`org:${orgId}:config:${key}`);
  if (!value) return c.json({ error: 'Not found', code: 'NOT_FOUND' }, 404);
  return c.json({ key, value: JSON.parse(value) });
});

data.put(
  '/config/:key',
  zValidator('json', z.object({ value: z.unknown() })),
  async (c) => {
    const orgId = c.get('orgId' as never) as string;
    const key = c.req.param('key');
    const { value } = c.req.valid('json');
    await c.env.IH_TENANT_KV.put(`org:${orgId}:config:${key}`, JSON.stringify(value));
    return c.json({ success: true });
  }
);

// Tenant profile
data.get('/profile', async (c) => {
  const orgId = c.get('orgId' as never) as string;
  const row = await c.env.IH_TENANT_DB.prepare(
    `SELECT * FROM org_profile WHERE org_id = ?1 LIMIT 1`
  ).bind(orgId).first();
  return c.json(row || {});
});

data.put(
  '/profile',
  zValidator('json', z.object({
    business_name: z.string().max(200).optional(),
    industry: z.string().max(100).optional(),
    timezone: z.string().max(50).optional(),
  })),
  async (c) => {
    const orgId = c.get('orgId' as never) as string;
    const body = c.req.valid('json');
    await c.env.IH_TENANT_DB.prepare(
      `INSERT INTO org_profile (org_id, business_name, industry, timezone, updated_at)
       VALUES (?1, ?2, ?3, ?4, datetime('now'))
       ON CONFLICT(org_id) DO UPDATE SET
         business_name = excluded.business_name,
         industry = excluded.industry,
         timezone = excluded.timezone,
         updated_at = excluded.updated_at`
    ).bind(orgId, body.business_name ?? null, body.industry ?? null, body.timezone ?? 'UTC').run();
    return c.json({ success: true });
  }
);

export default data;
