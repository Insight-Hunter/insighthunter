<<<<<<< HEAD
import { Hono } from 'hono';
import { DurableObject } from 'cloudflare:workers';
import type { AuthUser } from '@ih/types';
import { TIER_LIMITS } from '@ih/tier-config';

interface Env {
  DB: D1Database;
  VOICEMAIL: R2Bucket;
  CALL_STATE: KVNamespace;
  CALL_SESSION: DurableObjectNamespace;
  PBX_EVENTS: AnalyticsEngineDataset;
  TWILIO_ACCOUNT_SID: string;
  TWILIO_AUTH_TOKEN: string;
}

interface IHLocals { user: AuthUser }

// ─── Durable Object: CallSession ─────────────────────────────────────────────

export class CallSession extends DurableObject {
  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);

    if (request.method === 'POST' && url.pathname === '/update') {
      const body = await request.json<{ callSid: string; orgId: string; extensionId?: string; status: string }>();
      await this.ctx.storage.put('callSid',     body.callSid);
      await this.ctx.storage.put('orgId',       body.orgId);
      await this.ctx.storage.put('status',      body.status);
      await this.ctx.storage.put('startTime',   new Date().toISOString());
      if (body.extensionId) await this.ctx.storage.put('extensionId', body.extensionId);

      // Clean up stale session after 1 hour
      await this.ctx.storage.setAlarm(Date.now() + 3_600_000);
      return Response.json({ ok: true });
    }

    if (request.method === 'GET') {
      const callSid     = await this.ctx.storage.get<string>('callSid');
      const orgId       = await this.ctx.storage.get<string>('orgId');
      const status      = await this.ctx.storage.get<string>('status');
      const startTime   = await this.ctx.storage.get<string>('startTime');
      const extensionId = await this.ctx.storage.get<string>('extensionId');
      return Response.json({ callSid, orgId, status, startTime, extensionId });
    }

    return Response.json({ error: 'Not found' }, { status: 404 });
  }

  async alarm(): Promise<void> {
    console.log('CallSession alarm: cleaning up stale session');
    await this.ctx.storage.deleteAll();
  }
}

// ─── App ──────────────────────────────────────────────────────────────────────

const app = new Hono<{ Bindings: Env; Variables: IHLocals }>();

// Auth middleware — skip Twilio webhook paths (they use signature validation)
app.use('*', async (c, next) => {
  const path = c.req.path;
  if (['/inbound', '/status-callback', '/voicemail-callback'].includes(path)) return next();
  const raw = c.req.header('X-IH-User');
  if (!raw) return c.json({ error: 'Missing user context', code: 'NO_USER' }, 401);
  try { c.set('user', JSON.parse(raw) as AuthUser); } catch {
    return c.json({ error: 'Invalid user context', code: 'BAD_USER' }, 400);
  }
  return next();
});

// ─── Extensions ───────────────────────────────────────────────────────────────

app.get('/extensions', async (c) => {
  const user = c.get('user');
  const { results } = await c.env.DB.prepare('SELECT * FROM extensions WHERE org_id = ? ORDER BY number ASC').bind(user.orgId).all();
  return c.json(results);
});

app.post('/extensions', async (c) => {
  const user = c.get('user');
  const tier = user.tier;
  const limit = TIER_LIMITS[tier].pbx_extensions;
  if (limit === 0) return c.json({ error: 'PBX not available on your plan. Requires standard or above.', code: 'TIER_REQUIRED', required: 'standard' }, 403);

  if (limit !== null) {
    const { cnt } = await c.env.DB.prepare('SELECT COUNT(*) as cnt FROM extensions WHERE org_id = ? AND is_active = 1').bind(user.orgId).first<{ cnt: number }>() ?? { cnt: 0 };
    if (cnt >= limit) return c.json({ error: `Extension limit (${limit}) reached for your plan`, code: 'LIMIT_REACHED' }, 403);
  }

  const body = await c.req.json<{ number: string; name: string; user_id?: string; voicemail_enabled?: boolean }>();
  if (!body.number || !body.name) return c.json({ error: 'number and name required', code: 'MISSING_FIELDS' }, 400);

  const id = crypto.randomUUID().replace(/-/g, '');
  await c.env.DB.prepare('INSERT INTO extensions (id, org_id, number, name, user_id, voicemail_enabled) VALUES (?, ?, ?, ?, ?, ?)')
    .bind(id, user.orgId, body.number, body.name, body.user_id ?? null, body.voicemail_enabled !== false ? 1 : 0).run();

  c.env.PBX_EVENTS.writeDataPoint({ blobs: ['create_extension', id], indexes: [user.orgId] });
  return c.json(await c.env.DB.prepare('SELECT * FROM extensions WHERE id = ?').bind(id).first(), 201);
});

app.patch('/extensions/:id', async (c) => {
  const user = c.get('user');
  const body = await c.req.json<Record<string, unknown>>();
  const allowed = ['number', 'name', 'user_id', 'voicemail_enabled', 'is_active'];
  const updates: string[] = [];
  const vals: unknown[] = [];
  for (const key of allowed) {
    if (key in body) { updates.push(`${key} = ?`); vals.push(body[key]); }
  }
  if (!updates.length) return c.json({ error: 'No fields to update', code: 'NO_CHANGES' }, 400);
  vals.push(c.req.param('id'), user.orgId);
  await c.env.DB.prepare(`UPDATE extensions SET ${updates.join(', ')} WHERE id = ? AND org_id = ?`).bind(...vals).run();
  return c.json(await c.env.DB.prepare('SELECT * FROM extensions WHERE id = ?').bind(c.req.param('id')).first());
});

app.delete('/extensions/:id', async (c) => {
  const user = c.get('user');
  await c.env.DB.prepare('DELETE FROM extensions WHERE id = ? AND org_id = ?').bind(c.req.param('id'), user.orgId).run();
  return c.json({ deleted: true });
});

// ─── Call Logs ────────────────────────────────────────────────────────────────

app.get('/call-logs', async (c) => {
  const user = c.get('user');
  const { direction, status, from, to, page = '1', limit = '50' } = c.req.query();
  const pageNum = Math.max(1, parseInt(page, 10));
  const limitNum = Math.min(100, parseInt(limit, 10));
  const offset = (pageNum - 1) * limitNum;
  let where = 'WHERE org_id = ?';
  const params: unknown[] = [user.orgId];
  if (direction) { where += ' AND direction = ?'; params.push(direction); }
  if (status)    { where += ' AND status = ?';    params.push(status); }
  if (from)      { where += ' AND created_at >= ?'; params.push(from); }
  if (to)        { where += ' AND created_at <= ?'; params.push(to); }
  const { results } = await c.env.DB.prepare(`SELECT * FROM call_logs ${where} ORDER BY created_at DESC LIMIT ? OFFSET ?`).bind(...params, limitNum, offset).all();
  return c.json(results);
});

app.get('/call-logs/:id', async (c) => {
  const user = c.get('user');
  const row = await c.env.DB.prepare('SELECT * FROM call_logs WHERE id = ? AND org_id = ?').bind(c.req.param('id'), user.orgId).first();
  if (!row) return c.json({ error: 'Call log not found', code: 'NOT_FOUND' }, 404);
  return c.json(row);
});

// ─── Twilio Webhooks ─────────────────────────────────────────────────────────

app.post('/inbound', async (c) => {
  // Parse Twilio form body
  const text = await c.req.text();
  const params = new URLSearchParams(text);
  const callSid = params.get('CallSid') ?? crypto.randomUUID();
  const from = params.get('From') ?? '';
  const to   = params.get('To') ?? '';

  // Log the call
  const logId = crypto.randomUUID().replace(/-/g, '');
  await c.env.DB.prepare('INSERT INTO call_logs (id, org_id, from_number, to_number, direction, status) VALUES (?, ?, ?, ?, \'inbound\', \'ringing\')')
    .bind(logId, 'unknown', from, to).run();

  // Find matching extension
  const ext = await c.env.DB.prepare('SELECT * FROM extensions WHERE number = ? AND is_active = 1 LIMIT 1').bind(to).first<{ id: string; voicemail_enabled: number }>();

  const twiml = ext
    ? `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Dial action="/status-callback" timeout="30">
    <Number>${to}</Number>
  </Dial>
  ${ext.voicemail_enabled ? '<Record action="/voicemail-callback" maxLength="120" transcribe="true"/>' : ''}
</Response>`
    : `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say>Thank you for calling. Please leave a message after the beep.</Say>
  <Record action="/voicemail-callback" maxLength="120"/>
</Response>`;

  return new Response(twiml, { headers: { 'Content-Type': 'text/xml' } });
});

app.post('/status-callback', async (c) => {
  const text = await c.req.text();
  const params = new URLSearchParams(text);
  const callSid = params.get('CallSid') ?? '';
  const status  = params.get('CallStatus') ?? '';
  const duration = parseInt(params.get('CallDuration') ?? '0', 10);

  await c.env.DB.prepare("UPDATE call_logs SET status = ?, duration_seconds = ? WHERE from_number = ? OR to_number = ? ORDER BY created_at DESC LIMIT 1")
    .bind(status === 'completed' ? 'answered' : status, duration, callSid, callSid).run();

  return new Response('', { status: 204 });
});

app.post('/voicemail-callback', async (c) => {
  const text = await c.req.text();
  const params = new URLSearchParams(text);
  const recordingUrl  = params.get('RecordingUrl') ?? '';
  const callerNumber  = params.get('From') ?? '';
  const transcription = params.get('TranscriptionText') ?? null;
  const toNumber      = params.get('To') ?? '';

  if (recordingUrl) {
    const r2Key = `voicemail/${crypto.randomUUID()}.mp3`;
    const audioRes = await fetch(recordingUrl + '.mp3');
    if (audioRes.ok) {
      await c.env.VOICEMAIL.put(r2Key, audioRes.body!, { httpMetadata: { contentType: 'audio/mpeg' } });
    }

    const ext = await c.env.DB.prepare('SELECT id, org_id FROM extensions WHERE number = ? LIMIT 1').bind(toNumber).first<{ id: string; org_id: string }>();
    const vmId = crypto.randomUUID().replace(/-/g, '');
    await c.env.DB.prepare('INSERT INTO voicemails (id, org_id, extension_id, caller_number, r2_key, transcription) VALUES (?, ?, ?, ?, ?, ?)')
      .bind(vmId, ext?.org_id ?? 'unknown', ext?.id ?? null, callerNumber, r2Key, transcription).run();
  }

  return new Response('', { status: 204 });
});

// ─── Voicemails ───────────────────────────────────────────────────────────────

app.get('/voicemails', async (c) => {
  const user = c.get('user');
  const { extension_id } = c.req.query();
  let query = 'SELECT * FROM voicemails WHERE org_id = ?';
  const params: unknown[] = [user.orgId];
  if (extension_id) { query += ' AND extension_id = ?'; params.push(extension_id); }
  query += ' ORDER BY created_at DESC';
  const { results } = await c.env.DB.prepare(query).bind(...params).all();
  return c.json(results);
});

app.get('/voicemails/:id/audio', async (c) => {
  const user = c.get('user');
  const vm = await c.env.DB.prepare('SELECT * FROM voicemails WHERE id = ? AND org_id = ?').bind(c.req.param('id'), user.orgId).first<{ r2_key: string }>();
  if (!vm) return c.json({ error: 'Voicemail not found', code: 'NOT_FOUND' }, 404);
  const obj = await c.env.VOICEMAIL.get(vm.r2_key);
  if (!obj) return c.json({ error: 'Audio not found', code: 'STORAGE_ERROR' }, 404);
  return new Response(obj.body, { headers: { 'Content-Type': 'audio/mpeg' } });
});

app.patch('/voicemails/:id', async (c) => {
  const user = c.get('user');
  await c.env.DB.prepare('UPDATE voicemails SET listened = 1 WHERE id = ? AND org_id = ?').bind(c.req.param('id'), user.orgId).run();
  return c.json({ updated: true });
});

// ─── IVR Menus ────────────────────────────────────────────────────────────────

app.get('/ivr-menus', async (c) => {
  const user = c.get('user');
  const { results } = await c.env.DB.prepare('SELECT * FROM ivr_menus WHERE org_id = ? ORDER BY name ASC').bind(user.orgId).all();
  return c.json(results);
});

app.post('/ivr-menus', async (c) => {
  const user = c.get('user');
  const body = await c.req.json<{ name: string; greeting_text?: string; routing_config?: unknown }>();
  if (!body.name) return c.json({ error: 'name required', code: 'MISSING_FIELDS' }, 400);
  const id = crypto.randomUUID().replace(/-/g, '');
  await c.env.DB.prepare('INSERT INTO ivr_menus (id, org_id, name, greeting_text, routing_config) VALUES (?, ?, ?, ?, ?)')
    .bind(id, user.orgId, body.name, body.greeting_text ?? null, body.routing_config ? JSON.stringify(body.routing_config) : null).run();
  return c.json(await c.env.DB.prepare('SELECT * FROM ivr_menus WHERE id = ?').bind(id).first(), 201);
});

app.patch('/ivr-menus/:id', async (c) => {
  const user = c.get('user');
  const body = await c.req.json<{ name?: string; greeting_text?: string; routing_config?: unknown }>();
  const updates: string[] = [];
  const vals: unknown[] = [];
  if (body.name)             { updates.push('name = ?');           vals.push(body.name); }
  if (body.greeting_text !== undefined) { updates.push('greeting_text = ?'); vals.push(body.greeting_text); }
  if (body.routing_config !== undefined) { updates.push('routing_config = ?'); vals.push(JSON.stringify(body.routing_config)); }
  if (!updates.length) return c.json({ error: 'No fields to update', code: 'NO_CHANGES' }, 400);
  vals.push(c.req.param('id'), user.orgId);
  await c.env.DB.prepare(`UPDATE ivr_menus SET ${updates.join(', ')} WHERE id = ? AND org_id = ?`).bind(...vals).run();
  return c.json(await c.env.DB.prepare('SELECT * FROM ivr_menus WHERE id = ?').bind(c.req.param('id')).first());
});

app.delete('/ivr-menus/:id', async (c) => {
  const user = c.get('user');
  await c.env.DB.prepare('DELETE FROM ivr_menus WHERE id = ? AND org_id = ?').bind(c.req.param('id'), user.orgId).run();
  return c.json({ deleted: true });
});

export default app;
=======
// apps/insighthunter-pbx/src/index.ts
import { Hono }   from 'hono';
import { cors }   from 'hono/cors';
import { logger } from 'hono/logger';
import tenant     from './routes/tenant';
import numbers    from './routes/numbers';
import billing, { reportCallUsage } from './routes/billing';

export { CallSessionDO } from './durable-objects/CallSessionDO';

// ── Environment bindings ──────────────────────────────────────────────────────
export interface Env {
  PBX_DB:                D1Database;
  PBX_AUDIO:             R2Bucket;
  PBX_KV:                KVNamespace;
  CALL_SESSION:          DurableObjectNamespace;
  AI:                    Ai;
  VM_QUEUE:              Queue;
  ANALYTICS:             AnalyticsEngineDataset;
  TELNYX_API_KEY:        string;   // master org key — single Telnyx org
  TELNYX_WEBHOOK_SECRET: string;   // Ed25519 public key from Telnyx portal
  STRIPE_SECRET_KEY:     string;
  STRIPE_WEBHOOK_SECRET: string;
  STRIPE_PK:             string;   // publishable key, returned to frontend
  JWT_SECRET:            string;
}

type Variables = { orgId: string };

const app = new Hono<{ Bindings: Env; Variables: Variables }>();

// ── Global middleware ─────────────────────────────────────────────────────────
app.use('*', logger());

app.use('*', cors({
  origin: (origin) => {
    if (!origin) return null;
    if (
      origin.endsWith('.insighthunter.app') ||
      origin === 'https://insighthunter.app'
    ) return origin;
    return null;
  },
  allowMethods:  ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowHeaders:  ['Content-Type', 'Authorization'],
  credentials:   true,
  maxAge:        600,
}));

// ── Auth middleware ───────────────────────────────────────────────────────────
// Resolves orgId from either:
//   1. JWT Bearer token (dashboard sessions)
//   2. Custom host header (white-label domain routing via KV)
// Webhook + Stripe routes skip auth — they verify signatures internally.
app.use('/api/*', async (c, next) => {
  // Bypass auth on provider-signed routes
  if (c.req.path.startsWith('/api/pbx/billing/stripe-webhook')) return next();

  const host      = c.req.header('host') ?? '';
  const hostOrgId = await c.env.PBX_KV.get(`host:${host}`);

  const auth  = c.req.header('authorization') ?? '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : '';
  let jwtOrgId = '';

  if (token) {
    try {
      const key = await crypto.subtle.importKey(
        'raw',
        new TextEncoder().encode(c.env.JWT_SECRET),
        { name: 'HMAC', hash: 'SHA-256' },
        false,
        ['verify'],
      );
      const parts = token.split('.');
      if (parts.length === 3) {
        const [hdr, payload, sig] = parts;
        const sigBytes = Uint8Array.from(
          atob(sig.replace(/-/g, '+').replace(/_/g, '/')),
          ch => ch.charCodeAt(0),
        );
        const valid = await crypto.subtle.verify(
          'HMAC', key,
          sigBytes,
          new TextEncoder().encode(`${hdr}.${payload}`),
        );
        if (valid) {
          const p = JSON.parse(atob(payload)) as { orgId?: string; exp?: number };
          if (p.exp && p.exp > Date.now() / 1000) jwtOrgId = p.orgId ?? '';
        }
      }
    } catch {
      // Invalid token — fall through to host-based resolution
    }
  }

  const resolvedOrgId = jwtOrgId || hostOrgId || '';
  if (!resolvedOrgId) return c.json({ error: 'Unauthorized' }, 401);

  c.set('orgId', resolvedOrgId);
  return next();
});

// ── Route mounts ──────────────────────────────────────────────────────────────
app.route('/api/pbx/tenant',  tenant);   // admin: provision / cancel / list tenants
app.route('/api/pbx/numbers', numbers);  // number search, purchase, release, port
app.route('/api/pbx/billing', billing);  // usage, invoices, plan change, card update

// ── Extensions ───────────────────────────────────────────────────────────────
app.get('/api/pbx/extensions', async (c) => {
  const { results } = await c.env.PBX_DB
    .prepare('SELECT * FROM extensions WHERE org_id=? ORDER BY extension_number ASC')
    .bind(c.get('orgId'))
    .all();
  return c.json({ data: results });
});

app.post('/api/pbx/extensions', async (c) => {
  const body = await c.req.json<{
    extension_number: string;
    display_name:     string;
    email?:           string;
  }>();

  if (!body.extension_number || !body.display_name)
    return c.json({ error: 'extension_number and display_name are required' }, 422);

  const { meta } = await c.env.PBX_DB.prepare(`
    INSERT INTO extensions (org_id, extension_number, display_name, email, status, created_at)
    VALUES (?, ?, ?, ?, 'active', CURRENT_TIMESTAMP)
  `).bind(
    c.get('orgId'),
    body.extension_number,
    body.display_name,
    body.email ?? null,
  ).run();

  return c.json({ ok: true, id: meta.last_row_id }, 201);
});

app.patch('/api/pbx/extensions/:id', async (c) => {
  const body = await c.req.json<{ display_name?: string; email?: string }>();
  await c.env.PBX_DB.prepare(`
    UPDATE extensions SET
      display_name = COALESCE(?, display_name),
      email        = COALESCE(?, email)
    WHERE id=? AND org_id=?
  `).bind(
    body.display_name ?? null,
    body.email        ?? null,
    Number(c.req.param('id')),
    c.get('orgId'),
  ).run();
  return c.json({ ok: true });
});

app.delete('/api/pbx/extensions/:id', async (c) => {
  await c.env.PBX_DB
    .prepare(`UPDATE extensions SET status='inactive' WHERE id=? AND org_id=?`)
    .bind(Number(c.req.param('id')), c.get('orgId'))
    .run();
  return c.json({ ok: true });
});

// ── Call Logs ─────────────────────────────────────────────────────────────────
app.get('/api/pbx/call-logs', async (c) => {
  const qs        = new URL(c.req.url).searchParams;
  const page      = Math.max(1,   Number(qs.get('page')      ?? 1));
  const limit     = Math.min(100, Number(qs.get('limit')     ?? 50));
  const direction = qs.get('direction');
  const offset    = (page - 1) * limit;

  const safeDir = direction === 'inbound' || direction === 'outbound' ? direction : null;
  const clause  = safeDir ? `AND direction = '${safeDir}'` : '';

  const [{ results }, countRow] = await Promise.all([
    c.env.PBX_DB.prepare(
      `SELECT * FROM call_logs WHERE org_id=? ${clause} ORDER BY started_at DESC LIMIT ? OFFSET ?`,
    ).bind(c.get('orgId'), limit, offset).all(),

    c.env.PBX_DB.prepare(
      `SELECT COUNT(*) AS total FROM call_logs WHERE org_id=? ${clause}`,
    ).bind(c.get('orgId')).first<{ total: number }>(),
  ]);

  return c.json({ data: results, page, limit, total: countRow?.total ?? 0 });
});

// ── Voicemails ────────────────────────────────────────────────────────────────
app.get('/api/pbx/voicemails', async (c) => {
  const unreadOnly = new URL(c.req.url).searchParams.get('unread') === '1';
  const clause     = unreadOnly ? 'AND read_at IS NULL' : '';

  const { results } = await c.env.PBX_DB.prepare(`
    SELECT id, from_number, to_number, duration_seconds, transcript, read_at, created_at
    FROM voicemails
    WHERE org_id=? ${clause}
    ORDER BY created_at DESC
    LIMIT 100
  `).bind(c.get('orgId')).all();

  return c.json({ data: results });
});

app.get('/api/pbx/voicemails/:id/audio', async (c) => {
  const row = await c.env.PBX_DB
    .prepare('SELECT audio_r2_key FROM voicemails WHERE id=? AND org_id=? LIMIT 1')
    .bind(Number(c.req.param('id')), c.get('orgId'))
    .first<{ audio_r2_key: string }>();

  if (!row) return c.json({ error: 'Not found' }, 404);

  const obj = await c.env.PBX_AUDIO.get(row.audio_r2_key);
  if (!obj)  return c.json({ error: 'Audio not found' }, 404);

  return new Response(obj.body, {
    headers: {
      'Content-Type':  'audio/mpeg',
      'Cache-Control': 'private, max-age=3600',
    },
  });
});

app.patch('/api/pbx/voicemails/:id/read', async (c) => {
  await c.env.PBX_DB.prepare(
    `UPDATE voicemails
     SET read_at = CURRENT_TIMESTAMP
     WHERE id=? AND org_id=? AND read_at IS NULL`,
  ).bind(Number(c.req.param('id')), c.get('orgId')).run();
  return c.json({ ok: true });
});

app.delete('/api/pbx/voicemails/:id', async (c) => {
  const row = await c.env.PBX_DB
    .prepare('SELECT audio_r2_key FROM voicemails WHERE id=? AND org_id=? LIMIT 1')
    .bind(Number(c.req.param('id')), c.get('orgId'))
    .first<{ audio_r2_key: string }>();

  if (row?.audio_r2_key) await c.env.PBX_AUDIO.delete(row.audio_r2_key);

  await c.env.PBX_DB
    .prepare('DELETE FROM voicemails WHERE id=? AND org_id=?')
    .bind(Number(c.req.param('id')), c.get('orgId'))
    .run();

  return c.json({ ok: true });
});

// ── IVR Config ────────────────────────────────────────────────────────────────
app.get('/api/pbx/ivr', async (c) => {
  const row = await c.env.PBX_DB
    .prepare('SELECT * FROM ivr_config WHERE org_id=? LIMIT 1')
    .bind(c.get('orgId'))
    .first();
  return c.json({ data: row ?? null });
});

app.put('/api/pbx/ivr', async (c) => {
  const body = await c.req.json<{ greeting_text: string; menu: unknown }>();

  if (!body.greeting_text)
    return c.json({ error: 'greeting_text is required' }, 422);

  await c.env.PBX_DB.prepare(`
    INSERT INTO ivr_config (org_id, greeting_text, menu_json, updated_at)
    VALUES (?, ?, ?, CURRENT_TIMESTAMP)
    ON CONFLICT(org_id) DO UPDATE SET
      greeting_text = excluded.greeting_text,
      menu_json     = excluded.menu_json,
      updated_at    = CURRENT_TIMESTAMP
  `).bind(c.get('orgId'), body.greeting_text, JSON.stringify(body.menu ?? {})).run();

  return c.json({ ok: true });
});

// ── PBX Settings ──────────────────────────────────────────────────────────────
app.get('/api/pbx/settings', async (c) => {
  const row = await c.env.PBX_DB
    .prepare('SELECT * FROM pbx_settings WHERE org_id=? LIMIT 1')
    .bind(c.get('orgId'))
    .first();
  return c.json({ data: row ?? {} });
});

app.put('/api/pbx/settings', async (c) => {
  const body = await c.req.json<{
    timezone:          string;
    businessHours:     unknown;
    afterHoursAction:  string;
  }>();

  await c.env.PBX_DB.prepare(`
    INSERT INTO pbx_settings
      (org_id, timezone, business_hours_json, after_hours_action, updated_at)
    VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
    ON CONFLICT(org_id) DO UPDATE SET
      timezone             = excluded.timezone,
      business_hours_json  = excluded.business_hours_json,
      after_hours_action   = excluded.after_hours_action,
      updated_at           = CURRENT_TIMESTAMP
  `).bind(
    c.get('orgId'),
    body.timezone,
    JSON.stringify(body.businessHours ?? {}),
    body.afterHoursAction,
  ).run();

  return c.json({ ok: true });
});

// ── WebRTC Token ──────────────────────────────────────────────────────────────
// Architecture: Single Telnyx org. Each tenant has a telnyx_credential_id
// (a telephony_credential created at provisioning time, scoped to their
// credential_connection). We POST to /token on that credential each session
// to get a short-lived JWT for the Telnyx WebRTC SDK — no per-tenant API keys.
app.post('/api/pbx/webrtc-token', async (c) => {
  const orgId = c.get('orgId');

  const org = await c.env.PBX_DB
    .prepare(`
      SELECT telnyx_credential_id
      FROM orgs
      WHERE org_id=? AND status='active'
      LIMIT 1
    `)
    .bind(orgId)
    .first<{ telnyx_credential_id: string }>();

  if (!org?.telnyx_credential_id)
    return c.json({ error: 'WebRTC not provisioned for this org' }, 404);

  const r = await fetch(
    `https://api.telnyx.com/v2/telephony_credentials/${org.telnyx_credential_id}/token`,
    {
      method:  'POST',
      headers: { 'Authorization': `Bearer ${c.env.TELNYX_API_KEY}` },
    },
  );

  if (!r.ok) {
    const body = await r.text();
    console.error(`Telnyx token fetch failed ${r.status}: ${body}`);
    return c.json({ error: `Token fetch failed: ${r.status}` }, 502);
  }

  // Telnyx returns a raw JWT string (not a JSON envelope)
  const raw   = await r.text();
  const token = raw.replace(/^"|"$/g, '').trim();

  return c.json({ token });
});

// ── WebSocket — live call events (Durable Object per org) ────────────────────
app.get('/api/pbx/ws', async (c) => {
  const upgrade = c.req.header('upgrade');
  if (upgrade?.toLowerCase() !== 'websocket')
    return c.json({ error: 'Expected WebSocket upgrade' }, 426);

  const id   = c.env.CALL_SESSION.idFromName(c.get('orgId'));
  const stub = c.env.CALL_SESSION.get(id);
  return stub.fetch(c.req.raw);
});

// ── Telnyx Webhook ────────────────────────────────────────────────────────────
// Receives all call lifecycle events. Verifies Ed25519 signature.
// Routes to the correct org via KV DID lookup, then:
//   • Broadcasts to connected WebSocket clients (CallSessionDO)
//   • Persists call_logs on call.hangup
//   • Reports minute usage to Stripe meter on call.hangup
//   • Enqueues voicemail audio for Whisper transcription on recording.saved
app.post('/webhook/telnyx', async (c) => {
  const sig       = c.req.header('telnyx-signature-ed25519') ?? '';
  const timestamp = c.req.header('telnyx-timestamp')         ?? '';
  const rawBody   = await c.req.text();

  // Ed25519 signature verification
  if (sig && c.env.TELNYX_WEBHOOK_SECRET) {
    try {
      const pubKey = await crypto.subtle.importKey(
        'raw',
        Uint8Array.from(atob(c.env.TELNYX_WEBHOOK_SECRET), ch => ch.charCodeAt(0)),
        { name: 'Ed25519', namedCurve: 'Ed25519' },
        false,
        ['verify'],
      );
      const sigBytes = Uint8Array.from(atob(sig), ch => ch.charCodeAt(0));
      const valid    = await crypto.subtle.verify(
        'Ed25519', pubKey,
        sigBytes,
        new TextEncoder().encode(`${timestamp}|${rawBody}`),
      );
      if (!valid) return c.json({ error: 'Invalid signature' }, 401);
    } catch (e) {
      console.error('Webhook signature error:', e);
      return c.json({ error: 'Signature verification failed' }, 401);
    }
  }

  const event = JSON.parse(rawBody) as {
    data: {
      event_type: string;
      payload: {
        to?:              string;
        from?:            string;
        call_leg_id?:     string;
        call_session_id?: string;
        direction?:       string;
        start_time?:      string;
        end_time?:        string;
        duration_secs?:   number;
        recording_url?:   string;
      };
    };
  };

  const { event_type, payload } = event.data;

  // Normalize DID from SIP URI or plain number
  const rawTo = payload.to ?? '';
  const did   = rawTo.startsWith('sip:')
    ? rawTo.replace(/^sip:/, '').replace(/@.*$/, '')
    : rawTo.replace(/<[^>]+>/g, '').trim();

  // Resolve orgId via KV DID mapping
  const orgId = did ? await c.env.PBX_KV.get(`telnyx:did:${did}`) : null;

  if (orgId) {
    // ── Broadcast to WebSocket clients ─────────────────────────────────────
    const doId = c.env.CALL_SESSION.idFromName(orgId);
    const stub = c.env.CALL_SESSION.get(doId);
    stub.fetch(new Request('https://internal/broadcast', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ event_type, payload }),
    })).catch(err => console.error('DO broadcast error:', err));

    // ── call.hangup: persist log + report usage ─────────────────────────────
    if (event_type === 'call.hangup' && payload.call_leg_id) {
      await c.env.PBX_DB.prepare(`
        INSERT OR IGNORE INTO call_logs
          (org_id, call_leg_id, direction, from_number, to_number,
           duration_seconds, started_at, ended_at, status)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'completed')
      `).bind(
        orgId,
        payload.call_leg_id,
        payload.direction   ?? 'inbound',
        payload.from        ?? '',
        did,
        payload.duration_secs ?? 0,
        payload.start_time    ?? new Date().toISOString(),
        payload.end_time      ?? new Date().toISOString(),
      ).run();

      // Report to Stripe metered billing (fire-and-forget)
      reportCallUsage(
        c.env as unknown as Parameters<typeof reportCallUsage>[0],
        orgId,
        payload.duration_secs ?? 0,
        (payload.direction ?? 'inbound') as 'inbound' | 'outbound',
        payload.call_leg_id,
      ).catch(err => console.error('reportCallUsage error:', err));

      // Analytics
      c.env.ANALYTICS.writeDataPoint({
        blobs:   ['call_completed', orgId, payload.direction ?? 'inbound'],
        doubles: [payload.duration_secs ?? 0],
        indexes: [orgId],
      });
    }

    // ── recording.saved: insert voicemail + enqueue transcription ────────────
    if (event_type === 'recording.saved' && payload.recording_url && payload.call_leg_id) {
      // Download and store audio in R2
      const audioRes = await fetch(payload.recording_url, {
        headers: { 'Authorization': `Bearer ${c.env.TELNYX_API_KEY}` },
      });

      if (audioRes.ok) {
        const audioKey = `voicemails/${orgId}/${payload.call_leg_id}.mp3`;
        await c.env.PBX_AUDIO.put(audioKey, audioRes.body, {
          httpMetadata: { contentType: 'audio/mpeg' },
        });

        const { meta } = await c.env.PBX_DB.prepare(`
          INSERT INTO voicemails
            (org_id, call_leg_id, from_number, to_number,
             audio_r2_key, duration_seconds, created_at)
          VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
        `).bind(
          orgId,
          payload.call_leg_id,
          payload.from ?? '',
          did,
          audioKey,
          payload.duration_secs ?? 0,
        ).run();

        // Enqueue for Whisper transcription
        await c.env.VM_QUEUE.send({
          orgId,
          vmId:     meta.last_row_id as number,
          audioKey,
        });
      }
    }
  } else {
    console.warn(`Webhook: no org found for DID ${did} (event: ${event_type})`);
  }

  return c.json({ ok: true });
});

// ── Default export: fetch handler + Queue consumer ────────────────────────────
export default {
  fetch: app.fetch,

  // Queue consumer: Whisper transcription for voicemails
  // Triggered by VM_QUEUE messages sent from the webhook handler above.
  async queue(
    batch: MessageBatch<{ orgId: string; vmId: number; audioKey: string }>,
    env:   Env,
  ): Promise<void> {
    for (const msg of batch.messages) {
      const { orgId, vmId, audioKey } = msg.body;

      try {
        const obj = await env.PBX_AUDIO.get(audioKey);
        if (!obj) {
          console.warn(`VM transcription: audio not found — ${audioKey}`);
          msg.ack();
          continue;
        }

        const audioBytes = [...new Uint8Array(await obj.arrayBuffer())];

        // @ts-ignore — Workers AI binding
        const result = await env.AI.run('@cf/openai/whisper', { audio: audioBytes });

        await env.PBX_DB
          .prepare('UPDATE voicemails SET transcript=? WHERE id=? AND org_id=?')
          .bind(result.text ?? '', vmId, orgId)
          .run();

        msg.ack();
      } catch (e) {
        console.error(`Transcription failed vmId=${vmId}:`, e);
        msg.retry();
      }
    }
  },
};

>>>>>>> 3ef6eeea63fa04e41ec012c634fef0504b5a5f25
