import { Hono } from 'hono';
import { cors } from 'hono/cors';

type Env = {
  DB: D1Database;
  ADVISOR_KV: KVNamespace;
  EMAIL_QUEUE: Queue;
  ANALYTICS: AnalyticsEngineDataset;
  AUTH_SERVICE_URL: string;
  ENVIRONMENT: string;
};

type AdvisorUser = {
  userId: string;
  email?: string;
};

type Variables = {
  auth: AdvisorUser;
};

const app = new Hono<{ Bindings: Env; Variables: Variables }>();

app.use('*', cors({
  origin: ['https://insighthunter.app', 'https://advisor.insighthunter.app'],
  allowHeaders: ['Content-Type', 'Authorization'],
  allowMethods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
  credentials: true,
}));

app.use('/api/*', async (c, next) => {
  const auth = await resolveAuth(c.req.raw, c.env);
  if (!auth) {
    return c.json({ error: 'unauthorized' }, 401);
  }
  c.set('auth', auth);
  await next();
});

app.get('/health', (c) =>
  c.json({ ok: true, service: 'insighthunter-advisor', env: c.env.ENVIRONMENT }),
);

app.post('/api/firms', async (c) => {
  const auth = c.get('auth');
  const body = await c.req.json<{ name?: string; plan?: string }>();
  if (!body.name?.trim()) {
    return c.json({ error: 'name is required' }, 400);
  }

  const firmId = crypto.randomUUID();
  const memberId = crypto.randomUUID();
  const now = nowEpoch();
  const plan = normalizePlan(body.plan);

  await c.env.DB.batch([
    c.env.DB.prepare(`
      INSERT INTO firms (id, name, owner_user_id, plan, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `).bind(firmId, body.name.trim(), auth.userId, plan, now, now),
    c.env.DB.prepare(`
      INSERT INTO firm_members (id, firm_id, user_id, role, accepted_at, created_at)
      VALUES (?, ?, ?, 'owner', ?, ?)
    `).bind(memberId, firmId, auth.userId, now, now),
  ]);

  track(c.env, 'advisor_firm_created', auth.userId, firmId, { plan });
  return c.json(
    { id: firmId, name: body.name.trim(), owner_user_id: auth.userId, plan, created_at: now },
    201,
  );
});

app.get('/api/firms/:firmId', async (c) => {
  const auth = c.get('auth');
  const firmId = c.req.param('firmId');
  const membership = await requireFirmAccess(c.env.DB, firmId, auth.userId);
  if (!membership) return c.json({ error: 'forbidden' }, 403);

  const firm = await c.env.DB.prepare(`
    SELECT id, name, owner_user_id, plan, created_at, updated_at
    FROM firms WHERE id = ?
  `).bind(firmId).first();

  return c.json({ firm, membership });
});

app.patch('/api/firms/:firmId', async (c) => {
  const auth = c.get('auth');
  const firmId = c.req.param('firmId');
  const membership = await requireFirmRole(c.env.DB, firmId, auth.userId, ['owner', 'admin']);
  if (!membership) return c.json({ error: 'forbidden' }, 403);

  const body = await c.req.json<{ name?: string; plan?: string }>();
  const updates: string[] = [];
  const values: unknown[] = [];

  if (body.name?.trim()) {
    updates.push('name = ?');
    values.push(body.name.trim());
  }
  if (body.plan) {
    updates.push('plan = ?');
    values.push(normalizePlan(body.plan));
  }
  updates.push('updated_at = ?');
  values.push(nowEpoch(), firmId);

  await c.env.DB.prepare(`UPDATE firms SET ${updates.join(', ')} WHERE id = ?`).bind(...values).run();
  track(c.env, 'advisor_firm_updated', auth.userId, firmId, {});
  return c.json({ ok: true });
});

app.get('/api/firms/:firmId/members', async (c) => {
  const auth = c.get('auth');
  const firmId = c.req.param('firmId');
  const membership = await requireFirmAccess(c.env.DB, firmId, auth.userId);
  if (!membership) return c.json({ error: 'forbidden' }, 403);

  const result = await c.env.DB.prepare(`
    SELECT id, firm_id, user_id, role, invited_by, accepted_at, created_at
    FROM firm_members WHERE firm_id = ?
    ORDER BY created_at ASC
  `).bind(firmId).all();

  return c.json({ members: result.results });
});

app.post('/api/firms/:firmId/members/invite', async (c) => {
  const auth = c.get('auth');
  const firmId = c.req.param('firmId');
  const membership = await requireFirmRole(c.env.DB, firmId, auth.userId, ['owner', 'admin']);
  if (!membership) return c.json({ error: 'forbidden' }, 403);

  const body = await c.req.json<{ user_id?: string; role?: string; email?: string }>();
  if (!body.user_id && !body.email) {
    return c.json({ error: 'user_id or email is required' }, 400);
  }

  const role = normalizeRole(body.role);
  const memberId = crypto.randomUUID();
  const now = nowEpoch();
  const invitedUserId = body.user_id ?? `pending:${body.email}`;

  await c.env.DB.prepare(`
    INSERT INTO firm_members (id, firm_id, user_id, role, invited_by, created_at)
    VALUES (?, ?, ?, ?, ?, ?)
    ON CONFLICT(firm_id, user_id) DO UPDATE SET role = excluded.role, invited_by = excluded.invited_by
  `).bind(memberId, firmId, invitedUserId, role, auth.userId, now).run();

  await c.env.EMAIL_QUEUE.send({
    type: 'advisor_member_invite',
    firmId,
    invitedBy: auth.userId,
    userId: body.user_id ?? null,
    email: body.email ?? null,
    role,
  });

  track(c.env, 'advisor_member_invited', auth.userId, firmId, { role });
  return c.json({ ok: true, invited_user_id: invitedUserId, role }, 201);
});

app.patch('/api/firms/:firmId/members/:userId', async (c) => {
  const auth = c.get('auth');
  const firmId = c.req.param('firmId');
  const userId = c.req.param('userId');
  const membership = await requireFirmRole(c.env.DB, firmId, auth.userId, ['owner', 'admin']);
  if (!membership) return c.json({ error: 'forbidden' }, 403);

  const body = await c.req.json<{ role?: string; accepted?: boolean }>();
  const nextRole = body.role ? normalizeRole(body.role) : null;
  const acceptedAt = body.accepted ? nowEpoch() : null;

  await c.env.DB.prepare(`
    UPDATE firm_members
    SET role = COALESCE(?, role), accepted_at = COALESCE(?, accepted_at)
    WHERE firm_id = ? AND user_id = ?
  `).bind(nextRole, acceptedAt, firmId, userId).run();

  track(c.env, 'advisor_member_updated', auth.userId, firmId, {
    target_user_id: userId,
    role: nextRole ?? 'unchanged',
  });
  return c.json({ ok: true });
});

app.delete('/api/firms/:firmId/members/:userId', async (c) => {
  const auth = c.get('auth');
  const firmId = c.req.param('firmId');
  const userId = c.req.param('userId');
  const membership = await requireFirmRole(c.env.DB, firmId, auth.userId, ['owner', 'admin']);
  if (!membership) return c.json({ error: 'forbidden' }, 403);

  await c.env.DB.prepare(`DELETE FROM firm_members WHERE firm_id = ? AND user_id = ?`)
    .bind(firmId, userId)
    .run();

  track(c.env, 'advisor_member_removed', auth.userId, firmId, { target_user_id: userId });
  return c.json({ ok: true });
});

app.get('/api/firms/:firmId/clients', async (c) => {
  const auth = c.get('auth');
  const firmId = c.req.param('firmId');
  const membership = await requireFirmAccess(c.env.DB, firmId, auth.userId);
  if (!membership) return c.json({ error: 'forbidden' }, 403);

  const results = await c.env.DB.prepare(`
    SELECT fc.id, fc.firm_id, fc.business_id, fc.assigned_staff_user_id, fc.status, fc.created_at,
           (
             SELECT COUNT(*) FROM advisor_alerts aa
             WHERE aa.firm_id = fc.firm_id
               AND aa.business_id = fc.business_id
               AND aa.resolved_at IS NULL
           ) AS open_alert_count
    FROM firm_clients fc
    WHERE fc.firm_id = ?
    ORDER BY fc.created_at DESC
  `).bind(firmId).all();

  return c.json({ clients: results.results });
});

app.post('/api/firms/:firmId/clients', async (c) => {
  const auth = c.get('auth');
  const firmId = c.req.param('firmId');
  const membership = await requireFirmRole(c.env.DB, firmId, auth.userId, ['owner', 'admin', 'staff']);
  if (!membership) return c.json({ error: 'forbidden' }, 403);

  const body = await c.req.json<{ business_id?: string; assigned_staff_user_id?: string; status?: string }>();
  if (!body.business_id?.trim()) {
    return c.json({ error: 'business_id is required' }, 400);
  }

  const id = crypto.randomUUID();
  const status = normalizeClientStatus(body.status);
  const now = nowEpoch();

  await c.env.DB.prepare(`
    INSERT INTO firm_clients (id, firm_id, business_id, assigned_staff_user_id, status, created_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `).bind(id, firmId, body.business_id.trim(), body.assigned_staff_user_id ?? null, status, now).run();

  track(c.env, 'advisor_client_attached', auth.userId, firmId, {
    business_id: body.business_id,
    status,
  });
  return c.json(
    {
      id,
      firm_id: firmId,
      business_id: body.business_id.trim(),
      assigned_staff_user_id: body.assigned_staff_user_id ?? null,
      status,
      created_at: now,
    },
    201,
  );
});

app.patch('/api/firms/:firmId/clients/:id', async (c) => {
  const auth = c.get('auth');
  const firmId = c.req.param('firmId');
  const clientId = c.req.param('id');
  const membership = await requireFirmRole(c.env.DB, firmId, auth.userId, ['owner', 'admin', 'staff']);
  if (!membership) return c.json({ error: 'forbidden' }, 403);

  const body = await c.req.json<{ assigned_staff_user_id?: string | null; status?: string }>();
  await c.env.DB.prepare(`
    UPDATE firm_clients
    SET assigned_staff_user_id = ?, status = COALESCE(?, status)
    WHERE firm_id = ? AND id = ?
  `).bind(
    body.assigned_staff_user_id ?? null,
    body.status ? normalizeClientStatus(body.status) : null,
    firmId,
    clientId,
  ).run();

  track(c.env, 'advisor_client_updated', auth.userId, firmId, { client_id: clientId });
  return c.json({ ok: true });
});

app.delete('/api/firms/:firmId/clients/:id', async (c) => {
  const auth = c.get('auth');
  const firmId = c.req.param('firmId');
  const clientId = c.req.param('id');
  const membership = await requireFirmRole(c.env.DB, firmId, auth.userId, ['owner', 'admin']);
  if (!membership) return c.json({ error: 'forbidden' }, 403);

  await c.env.DB.prepare(`UPDATE firm_clients SET status = 'offboarded' WHERE firm_id = ? AND id = ?`)
    .bind(firmId, clientId)
    .run();

  track(c.env, 'advisor_client_offboarded', auth.userId, firmId, { client_id: clientId });
  return c.json({ ok: true });
});

app.get('/api/firms/:firmId/alerts', async (c) => {
  const auth = c.get('auth');
  const firmId = c.req.param('firmId');
  const membership = await requireFirmAccess(c.env.DB, firmId, auth.userId);
  if (!membership) return c.json({ error: 'forbidden' }, 403);

  const limit = clampInt(c.req.query('limit'), 25, 1, 100);
  const offset = clampInt(c.req.query('offset'), 0, 0, 10000);

  const alerts = await c.env.DB.prepare(`
    SELECT id, firm_id, business_id, alert_type, severity, title, body, resolved_at, created_at
    FROM advisor_alerts
    WHERE firm_id = ?
    ORDER BY created_at DESC
    LIMIT ? OFFSET ?
  `).bind(firmId, limit, offset).all();

  return c.json({ alerts: alerts.results, pagination: { limit, offset } });
});

app.patch('/api/firms/:firmId/alerts/:id/resolve', async (c) => {
  const auth = c.get('auth');
  const firmId = c.req.param('firmId');
  const alertId = c.req.param('id');
  const membership = await requireFirmAccess(c.env.DB, firmId, auth.userId);
  if (!membership) return c.json({ error: 'forbidden' }, 403);

  const resolvedAt = nowEpoch();
  await c.env.DB.prepare(`
    UPDATE advisor_alerts SET resolved_at = ?
    WHERE firm_id = ? AND id = ?
  `).bind(resolvedAt, firmId, alertId).run();

  track(c.env, 'alert_resolved', auth.userId, firmId, { alert_id: alertId });
  return c.json({ ok: true, resolved_at: resolvedAt });
});

app.get('/api/firms/:firmId/clients/:id/overview', async (c) => {
  const auth = c.get('auth');
  const firmId = c.req.param('firmId');
  const clientId = c.req.param('id');
  const membership = await requireFirmAccess(c.env.DB, firmId, auth.userId);
  if (!membership) return c.json({ error: 'forbidden' }, 403);

  const client = await c.env.DB.prepare(`
    SELECT id, firm_id, business_id, assigned_staff_user_id, status, created_at
    FROM firm_clients WHERE firm_id = ? AND id = ?
  `).bind(firmId, clientId).first();

  if (!client) return c.json({ error: 'not_found' }, 404);

  const alerts = await c.env.DB.prepare(`
    SELECT id, alert_type, severity, title, body, created_at
    FROM advisor_alerts
    WHERE firm_id = ? AND business_id = ? AND resolved_at IS NULL
    ORDER BY created_at DESC LIMIT 20
  `).bind(firmId, client.business_id).all();

  const notes = await c.env.DB.prepare(`
    SELECT id, author_user_id, body, pinned, created_at
    FROM advisor_notes
    WHERE firm_id = ? AND business_id = ?
    ORDER BY pinned DESC, created_at DESC LIMIT 20
  `).bind(firmId, client.business_id).all();

  return c.json({
    client,
    health: {
      formation_status: 'unknown',
      compliance_health: 'unknown',
      payroll_status: 'unknown',
      ai_alert_count: alerts.results.length,
    },
    alerts: alerts.results,
    notes: notes.results,
  });
});

async function resolveAuth(request: Request, env: Env): Promise<AdvisorUser | null> {
  const demoUserId = request.headers.get('x-demo-user-id');
  if (demoUserId) {
    return { userId: demoUserId, email: request.headers.get('x-demo-email') ?? undefined };
  }

  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return null;
  }

  const token = authHeader.slice(7).trim();
  if (!token) return null;

  const parts = token.split('.');
  if (parts.length < 2) return null;

  try {
    const payload = JSON.parse(decodeBase64Url(parts[1]));
    if (!payload?.sub) return null;
    return {
      userId: String(payload.sub),
      email: payload.email ? String(payload.email) : undefined,
    };
  } catch {
    return null;
  }
}

function decodeBase64Url(input: string): string {
  const normalized = input.replace(/-/g, '+').replace(/_/g, '/');
  const pad = normalized.length % 4 === 0 ? '' : '='.repeat(4 - (normalized.length % 4));
  return atob(normalized + pad);
}

async function requireFirmAccess(db: D1Database, firmId: string, userId: string) {
  return db
    .prepare(`SELECT firm_id, user_id, role FROM firm_members WHERE firm_id = ? AND user_id = ?`)
    .bind(firmId, userId)
    .first();
}

async function requireFirmRole(db: D1Database, firmId: string, userId: string, roles: string[]) {
  const membership = await requireFirmAccess(db, firmId, userId);
  if (!membership) return null;
  return roles.includes(String(membership.role)) ? membership : null;
}

function normalizePlan(plan?: string | null): string {
  const value = (plan ?? 'starter').toLowerCase();
  return ['starter', 'pro', 'enterprise'].includes(value) ? value : 'starter';
}

function normalizeRole(role?: string | null): string {
  const value = (role ?? 'staff').toLowerCase();
  return ['owner', 'admin', 'staff', 'viewer'].includes(value) ? value : 'staff';
}

function normalizeClientStatus(status?: string | null): string {
  const value = (status ?? 'active').toLowerCase();
  return ['active', 'inactive', 'offboarded'].includes(value) ? value : 'active';
}

function clampInt(value: string | undefined, fallback: number, min: number, max: number): number {
  const parsed = Number.parseInt(value ?? '', 10);
  if (Number.isNaN(parsed)) return fallback;
  return Math.max(min, Math.min(max, parsed));
}

function nowEpoch(): number {
  return Math.floor(Date.now() / 1000);
}

function track(
  env: Env,
  eventName: string,
  userId: string,
  firmId: string,
  meta: Record<string, unknown>,
) {
  env.ANALYTICS.writeDataPoint({
    blobs: [eventName, userId, firmId, JSON.stringify(meta)],
    doubles: [Date.now()],
    indexes: [eventName],
  });
}

export default app;
