import { Hono } from 'hono';
import { cors } from 'hono/cors';

interface Env {
  DB: D1Database;
  NOTIFS_KV: KVNamespace;
  ANALYTICS: AnalyticsEngineDataset;
  AUTH_WORKER_URL: string;
  MAILCHANNELS_URL: string;
  FROM_EMAIL: string;
  FROM_NAME: string;
}

interface NotifRow {
  id: string; org_id: string; user_id: string; type: string;
  title: string; body: string; read: number; created_at: string;
}

function ok<T>(data: T, status = 200) { return Response.json({ success: true, data }, { status }); }
function err(error: string, status = 400) { return Response.json({ success: false, error }, { status }); }

async function getSession(req: Request, env: Env) {
  const token = req.headers.get('Authorization')?.slice(7);
  if (!token) return null;
  const res = await fetch(`${env.AUTH_WORKER_URL}/verify`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token }),
  });
  if (!res.ok) return null;
  const body = await res.json() as { success: boolean; data: { userId: string; orgId: string; tier: string } };
  return body.success ? body.data : null;
}

const app = new Hono<{ Bindings: Env }>();
app.use('*', cors({ origin: ['https://insighthunter.app', 'http://localhost:4321'] }));

// ── Send email ───────────────────────────────────────────────────────────────
app.post('/send-email', async c => {
  const session = await getSession(c.req.raw, c.env);
  if (!session) return err('Unauthorized', 401);

  const { to, subject, text, html } = await c.req.json<{ to: string; subject: string; text: string; html?: string }>();
  if (!to || !subject || !text) return err('to, subject and text are required');

  const res = await fetch(c.env.MAILCHANNELS_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      personalizations: [{ to: [{ email: to }] }],
      from: { email: c.env.FROM_EMAIL, name: c.env.FROM_NAME },
      subject,
      content: [
        ...(html ? [{ type: 'text/html', value: html }] : []),
        { type: 'text/plain', value: text },
      ],
    }),
  });

  if (!res.ok) return err(`Email delivery failed: ${res.status}`, 502);

  c.env.ANALYTICS.writeDataPoint({ blobs: ['email_sent', subject], indexes: [session.orgId] });
  return ok({ sent: true });
});

// ── Create in-app notification ───────────────────────────────────────────────
app.post('/in-app', async c => {
  const session = await getSession(c.req.raw, c.env);
  if (!session) return err('Unauthorized', 401);

  const { userId, title, body, type = 'info' } = await c.req.json<{ userId?: string; title: string; body: string; type?: string }>();
  if (!title || !body) return err('title and body are required');

  const id = crypto.randomUUID();
  const targetUserId = userId ?? session.userId;
  const notif = { id, org_id: session.orgId, user_id: targetUserId, type, title, body, read: 0, created_at: new Date().toISOString() };

  await c.env.DB.prepare(
    'INSERT INTO notifications (id, org_id, user_id, type, title, body, read, created_at) VALUES (?, ?, ?, ?, ?, ?, 0, ?)'
  ).bind(id, session.orgId, targetUserId, type, title, body, notif.created_at).run();

  // Also cache in KV for fast unread count access
  const unreadKey = `unread:${targetUserId}`;
  const current = parseInt(await c.env.NOTIFS_KV.get(unreadKey) ?? '0');
  await c.env.NOTIFS_KV.put(unreadKey, String(current + 1), { expirationTtl: 86400 });

  return ok(notif, 201);
});

// ── List notifications ───────────────────────────────────────────────────────
app.get('/notifications', async c => {
  const session = await getSession(c.req.raw, c.env);
  if (!session) return err('Unauthorized', 401);

  const unread_only = c.req.query('unread') === 'true';
  let query = 'SELECT * FROM notifications WHERE user_id = ?';
  if (unread_only) query += ' AND read = 0';
  query += ' ORDER BY created_at DESC LIMIT 50';

  const { results } = await c.env.DB.prepare(query).bind(session.userId).all<NotifRow>();
  const unreadCount = parseInt(await c.env.NOTIFS_KV.get(`unread:${session.userId}`) ?? '0');

  return ok({ notifications: results, unread_count: unreadCount });
});

// ── Mark as read ─────────────────────────────────────────────────────────────
app.patch('/notifications/:id/read', async c => {
  const session = await getSession(c.req.raw, c.env);
  if (!session) return err('Unauthorized', 401);

  await c.env.DB.prepare('UPDATE notifications SET read = 1 WHERE id = ? AND user_id = ?')
    .bind(c.req.param('id'), session.userId).run();

  // Decrement KV unread counter
  const key = `unread:${session.userId}`;
  const current = parseInt(await c.env.NOTIFS_KV.get(key) ?? '0');
  if (current > 0) await c.env.NOTIFS_KV.put(key, String(current - 1), { expirationTtl: 86400 });

  return ok({ read: true });
});

// ── Mark all read ────────────────────────────────────────────────────────────
app.patch('/notifications/read-all', async c => {
  const session = await getSession(c.req.raw, c.env);
  if (!session) return err('Unauthorized', 401);
  await c.env.DB.prepare('UPDATE notifications SET read = 1 WHERE user_id = ?').bind(session.userId).run();
  await c.env.NOTIFS_KV.put(`unread:${session.userId}`, '0', { expirationTtl: 86400 });
  return ok({ updated: true });
});

// ── Unread count (fast KV path) ──────────────────────────────────────────────
app.get('/unread-count', async c => {
  const session = await getSession(c.req.raw, c.env);
  if (!session) return err('Unauthorized', 401);
  const count = parseInt(await c.env.NOTIFS_KV.get(`unread:${session.userId}`) ?? '0');
  return ok({ count });
});

export default app;
