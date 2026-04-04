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
  const clause  = safeDir ? 'AND direction = ?' : '';
  const clauseBindings = safeDir ? [safeDir] : [];

  const [{ results }, countRow] = await Promise.all([
    c.env.PBX_DB.prepare(
      `SELECT * FROM call_logs WHERE org_id=? ${clause} ORDER BY started_at DESC LIMIT ? OFFSET ?`,
    ).bind(c.get('orgId'), ...(safeDir ? [safeDir] : []), limit, offset).all(),

    c.env.PBX_DB.prepare(
      `SELECT COUNT(*) AS total FROM call_logs WHERE org_id=? ${clause}`,
    ).bind(c.get('orgId'), ...(safeDir ? [safeDir] : [])).first<{ total: number }>(),
  ]);

  return c.json({ data: results, page, limit, total: countRow?.total ?? 0 });
});

// ── Voicemails ────────────────────────────────────────────────────────────────
app.get('/api/pbx/voicemails', async (c) => {
  const unreadOnly = new URL(c.req.url).searchParams.get('unread') === '1';
  const unreadOnly = new URL(c.req.url).searchParams.get('unread') === '1';
  const clause     = unreadOnly ? 'AND read_at IS NULL' : '';

  const query = `
    SELECT id, from_number, to_number, duration_seconds, transcript, read_at, created_at
    FROM voicemails
    WHERE org_id=? ${clause}
    ORDER BY created_at DESC
    LIMIT 100
  `;
  const { results } = await c.env.PBX_DB.prepare(query).bind(c.get('orgId')).all();

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

