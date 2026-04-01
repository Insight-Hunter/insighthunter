// apps/insighthunter-pbx/src/routes/api.ts

import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { Env, TIER_LIMITS } from '../types/index.js';
import { requireAuth, requireFeature, auditLog } from '../middleware/auth.js';
import {
  searchAvailableNumbers, purchaseNumber, releaseNumber,
  updateNumberWebhooks, generateWebRTCToken, sendMessage,
  initiateOutboundCall, getConferenceParticipants,
  muteParticipant, removeParticipant,
} from '../services/twilio.js';

const api = new Hono<{ Bindings: Env }>();

api.use('*', cors({
  origin: ['https://pbx.insighthunter.app', 'https://insighthunter.app', 'http://localhost:5173'],
  allowHeaders: ['Authorization', 'Content-Type', 'X-IH-User', 'X-Internal-Secret'],
  allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  credentials: true,
}));

api.use('/api/*', requireAuth);

// ─── Health ───────────────────────────────────────────────────────────────────
api.get('/health', (c) => c.json({ status: 'ok', service: 'insighthunter-pbx' }));

// ─── Usage & Tier ─────────────────────────────────────────────────────────────
api.get('/api/usage', async (c) => {
  const user = c.get('user');
  const tenant = c.get('tenant');
  const config = TIER_LIMITS[tenant.tier as keyof typeof TIER_LIMITS];

  const [numCount, extCount] = await Promise.all([
    c.env.DB.prepare('SELECT COUNT(*) as cnt FROM phone_numbers WHERE org_id = ? AND active = 1').bind(user.orgId).first<{ cnt: number }>(),
    c.env.DB.prepare('SELECT COUNT(*) as cnt FROM extensions WHERE org_id = ?').bind(user.orgId).first<{ cnt: number }>(),
  ]);

  return c.json({ success: true, data: {
    tier: tenant.tier,
    features: config,
    usage: { numbers: numCount?.cnt ?? 0, extensions: extCount?.cnt ?? 0 },
  }});
});

// ══════════════════════════════════════════════════════════════════════════════
// PHONE NUMBERS
// ══════════════════════════════════════════════════════════════════════════════

api.get('/api/numbers', async (c) => {
  const user = c.get('user');
  const numbers = await c.env.DB.prepare('SELECT * FROM phone_numbers WHERE org_id = ? AND active = 1 ORDER BY created_at DESC').bind(user.orgId).all();
  return c.json({ success: true, data: numbers.results });
});

api.get('/api/numbers/search', async (c) => {
  const tenant = c.get('tenant');
  const type = (c.req.query('type') ?? 'local') as any;
  const areaCode = c.req.query('areaCode');
  const contains = c.req.query('contains');

  const results = await searchAvailableNumbers(tenant, { type, areaCode, contains, voiceEnabled: true, smsEnabled: true });
  return c.json({ success: true, data: results });
});

api.post('/api/numbers/purchase', async (c) => {
  const user = c.get('user');
  const tenant = c.get('tenant');
  const config = TIER_LIMITS[tenant.tier as keyof typeof TIER_LIMITS];
  const body = await c.req.json<{ phoneNumber: string; friendlyName?: string }>();

  // Check tier limit
  const count = await c.env.DB.prepare('SELECT COUNT(*) as cnt FROM phone_numbers WHERE org_id = ? AND active = 1').bind(user.orgId).first<{ cnt: number }>();
  if ((count?.cnt ?? 0) >= config.maxNumbers) {
    return c.json({ error: `Number limit (${config.maxNumbers}) reached for your plan`, upgradeRequired: true }, 403);
  }

  const purchased = await purchaseNumber(tenant, body.phoneNumber, c.env.PUBLIC_URL, user.orgId);
  const id = crypto.randomUUID();

  await c.env.DB.prepare(`
    INSERT INTO phone_numbers (id, org_id, twilio_sid, number, friendly_name, type, capabilities)
    VALUES (?, ?, ?, ?, ?, 'local', '["voice","sms","mms"]')
  `).bind(id, user.orgId, purchased.sid, purchased.number, body.friendlyName ?? purchased.friendlyName).run();

  await auditLog(c.env.DB, { orgId: user.orgId, userId: user.userId, action: 'PURCHASE_NUMBER', entityType: 'phone_number', entityId: id, detail: purchased.number });
  return c.json({ success: true, id, number: purchased.number }, 201);
});

api.patch('/api/numbers/:id', async (c) => {
  const user = c.get('user');
  const tenant = c.get('tenant');
  const id = c.req.param('id');
  const body = await c.req.json<{ friendlyName?: string; assignedType?: string; assignedTo?: string; forwardTo?: string }>();

  const num = await c.env.DB.prepare('SELECT * FROM phone_numbers WHERE id = ? AND org_id = ?').bind(id, user.orgId).first<any>();
  if (!num) return c.json({ error: 'Number not found' }, 404);

  await c.env.DB.prepare(`
    UPDATE phone_numbers SET
      friendly_name = COALESCE(?, friendly_name),
      assigned_type = COALESCE(?, assigned_type),
      assigned_to = COALESCE(?, assigned_to),
      forward_to = COALESCE(?, forward_to)
    WHERE id = ? AND org_id = ?
  `).bind(body.friendlyName ?? null, body.assignedType ?? null, body.assignedTo ?? null, body.forwardTo ?? null, id, user.orgId).run();

  await updateNumberWebhooks(tenant, num.twilio_sid, c.env.PUBLIC_URL, user.orgId);
  return c.json({ success: true });
});

api.delete('/api/numbers/:id', async (c) => {
  const user = c.get('user');
  const tenant = c.get('tenant');
  const id = c.req.param('id');

  const num = await c.env.DB.prepare('SELECT * FROM phone_numbers WHERE id = ? AND org_id = ?').bind(id, user.orgId).first<any>();
  if (!num) return c.json({ error: 'Number not found' }, 404);

  await releaseNumber(tenant, num.twilio_sid);
  await c.env.DB.prepare('UPDATE phone_numbers SET active = 0 WHERE id = ? AND org_id = ?').bind(id, user.orgId).run();

  await auditLog(c.env.DB, { orgId: user.orgId, userId: user.userId, action: 'RELEASE_NUMBER', entityType: 'phone_number', entityId: id });
  return c.json({ success: true });
});

// ══════════════════════════════════════════════════════════════════════════════
// EXTENSIONS
// ══════════════════════════════════════════════════════════════════════════════

api.get('/api/extensions', async (c) => {
  const user = c.get('user');
  const exts = await c.env.DB.prepare('SELECT id, org_id, user_id, extension, display_name, email, sip_username, voicemail_enabled, forward_to, status, do_not_disturb, twilio_identity, created_at FROM extensions WHERE org_id = ? ORDER BY extension ASC').bind(user.orgId).all();
  return c.json({ success: true, data: exts.results });
});

api.post('/api/extensions', async (c) => {
  const user = c.get('user');
  const tenant = c.get('tenant');
  const config = TIER_LIMITS[tenant.tier as keyof typeof TIER_LIMITS];
  const body = await c.req.json<{ extension: string; displayName: string; email: string; voicemailEnabled?: boolean; forwardTo?: string }>();

  const count = await c.env.DB.prepare('SELECT COUNT(*) as cnt FROM extensions WHERE org_id = ?').bind(user.orgId).first<{ cnt: number }>();
  if ((count?.cnt ?? 0) >= config.maxExtensions) {
    return c.json({ error: `Extension limit (${config.maxExtensions}) reached for your plan`, upgradeRequired: true }, 403);
  }

  // Check extension number uniqueness
  const exists = await c.env.DB.prepare('SELECT id FROM extensions WHERE org_id = ? AND extension = ?').bind(user.orgId, body.extension).first();
  if (exists) return c.json({ error: `Extension ${body.extension} already exists` }, 409);

  const id = crypto.randomUUID();
  const sipUsername = `${user.orgId.slice(0, 8)}_ext${body.extension}`;
  const sipPassword = generateSecurePassword();
  const twilioIdentity = `ext_${id.replace(/-/g, '')}`;
  const voicemailPin = Math.floor(1000 + Math.random() * 9000).toString();

  await c.env.DB.prepare(`
    INSERT INTO extensions (id, org_id, extension, display_name, email, sip_username, sip_password_hash, sip_password_plain, voicemail_enabled, voicemail_pin, forward_to, twilio_identity)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(id, user.orgId, body.extension, body.displayName, body.email, sipUsername, sipPassword, sipPassword, body.voicemailEnabled ? 1 : 0, voicemailPin, body.forwardTo ?? null, twilioIdentity).run();

  await auditLog(c.env.DB, { orgId: user.orgId, userId: user.userId, action: 'CREATE_EXTENSION', entityType: 'extension', entityId: id });

  return c.json({ success: true, id, sipUsername, sipPassword, voicemailPin, twilioIdentity }, 201);
});

api.patch('/api/extensions/:id', async (c) => {
  const user = c.get('user');
  const id = c.req.param('id');
  const body = await c.req.json<{ displayName?: string; doNotDisturb?: boolean; forwardTo?: string; voicemailEnabled?: boolean; voicemailPin?: string }>();

  const ext = await c.env.DB.prepare('SELECT id FROM extensions WHERE id = ? AND org_id = ?').bind(id, user.orgId).first();
  if (!ext) return c.json({ error: 'Extension not found' }, 404);

  await c.env.DB.prepare(`
    UPDATE extensions SET
      display_name = COALESCE(?, display_name),
      do_not_disturb = COALESCE(?, do_not_disturb),
      forward_to = COALESCE(?, forward_to),
      voicemail_enabled = COALESCE(?, voicemail_enabled),
      voicemail_pin = COALESCE(?, voicemail_pin),
      updated_at = datetime('now')
    WHERE id = ? AND org_id = ?
  `).bind(
    body.displayName ?? null, body.doNotDisturb != null ? (body.doNotDisturb ? 1 : 0) : null,
    body.forwardTo ?? null, body.voicemailEnabled != null ? (body.voicemailEnabled ? 1 : 0) : null,
    body.voicemailPin ?? null, id, user.orgId
  ).run();

  return c.json({ success: true });
});

api.delete('/api/extensions/:id', async (c) => {
  const user = c.get('user');
  const id = c.req.param('id');
  await c.env.DB.prepare('DELETE FROM extensions WHERE id = ? AND org_id = ?').bind(id, user.orgId).run();
  return c.json({ success: true });
});

// ─── WebRTC Token ─────────────────────────────────────────────────────────────
api.get('/api/extensions/:id/token', async (c) => {
  const user = c.get('user');
  const tenant = c.get('tenant');
  const id = c.req.param('id');

  const ext = await c.env.DB.prepare('SELECT * FROM extensions WHERE id = ? AND org_id = ?').bind(id, user.orgId).first<any>();
  if (!ext) return c.json({ error: 'Extension not found' }, 404);

  const tokenData = generateWebRTCToken(tenant, ext.twilio_identity);
  return c.json({ success: true, data: tokenData });
});

// ─── Extension status (presence) ─────────────────────────────────────────────
api.patch('/api/extensions/:id/status', async (c) => {
  const user = c.get('user');
  const id = c.req.param('id');
  const { status } = await c.req.json<{ status: 'available' | 'away' | 'offline' }>();

  await c.env.DB.prepare('UPDATE extensions SET status = ?, updated_at = datetime(\'now\') WHERE id = ? AND org_id = ?').bind(status, id, user.orgId).run();

  // Cache presence in KV for real-time lookup
  await c.env.PBX_KV.put(`presence:${user.orgId}:${id}`, status, { expirationTtl: 3600 });
  return c.json({ success: true });
});

// ══════════════════════════════════════════════════════════════════════════════
// IVR MENUS
// ══════════════════════════════════════════════════════════════════════════════

api.get('/api/ivr', requireFeature('ivrEnabled'), async (c) => {
  const user = c.get('user');
  const menus = await c.env.DB.prepare('SELECT * FROM ivr_menus WHERE org_id = ? ORDER BY is_default DESC, name ASC').bind(user.orgId).all();
  return c.json({ success: true, data: menus.results.map((m: any) => ({ ...m, options: JSON.parse(m.options) })) });
});

api.post('/api/ivr', requireFeature('ivrEnabled'), async (c) => {
  const user = c.get('user');
  const body = await c.req.json<any>();
  const id = crypto.randomUUID();

  if (body.isDefault) {
    await c.env.DB.prepare('UPDATE ivr_menus SET is_default = 0 WHERE org_id = ?').bind(user.orgId).run();
  }

  await c.env.DB.prepare(`
    INSERT INTO ivr_menus (id, org_id, name, greeting, greeting_type, greeting_voice, timeout, num_digits, options, is_default)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(id, user.orgId, body.name, body.greeting, body.greetingType ?? 'tts', body.greetingVoice ?? 'Polly.Joanna', body.timeout ?? 5, body.numDigits ?? 1, JSON.stringify(body.options ?? []), body.isDefault ? 1 : 0).run();

  return c.json({ success: true, id }, 201);
});

api.put('/api/ivr/:id', requireFeature('ivrEnabled'), async (c) => {
  const user = c.get('user');
  const id = c.req.param('id');
  const body = await c.req.json<any>();

  if (body.isDefault) {
    await c.env.DB.prepare('UPDATE ivr_menus SET is_default = 0 WHERE org_id = ?').bind(user.orgId).run();
  }

  await c.env.DB.prepare(`
    UPDATE ivr_menus SET name = ?, greeting = ?, greeting_type = ?, greeting_voice = ?, timeout = ?, num_digits = ?, options = ?, is_default = ?, updated_at = datetime('now')
    WHERE id = ? AND org_id = ?
  `).bind(body.name, body.greeting, body.greetingType, body.greetingVoice ?? 'Polly.Joanna', body.timeout ?? 5, body.numDigits ?? 1, JSON.stringify(body.options ?? []), body.isDefault ? 1 : 0, id, user.orgId).run();

  return c.json({ success: true });
});

api.delete('/api/ivr/:id', requireFeature('ivrEnabled'), async (c) => {
  const user = c.get('user');
  const id = c.req.param('id');
  await c.env.DB.prepare('DELETE FROM ivr_menus WHERE id = ? AND org_id = ?').bind(id, user.orgId).run();
  return c.json({ success: true });
});

// ══════════════════════════════════════════════════════════════════════════════
// CALL QUEUES
// ══════════════════════════════════════════════════════════════════════════════

api.get('/api/queues', async (c) => {
  const user = c.get('user');
  const queues = await c.env.DB.prepare('SELECT * FROM call_queues WHERE org_id = ? ORDER BY name ASC').bind(user.orgId).all();
  return c.json({ success: true, data: queues.results.map((q: any) => ({ ...q, members: JSON.parse(q.members), maxWaitFallback: JSON.parse(q.max_wait_fallback) })) });
});

api.post('/api/queues', async (c) => {
  const user = c.get('user');
  const body = await c.req.json<any>();
  const id = crypto.randomUUID();

  await c.env.DB.prepare(`
    INSERT INTO call_queues (id, org_id, name, strategy, hold_music, hold_announcement, announcement_interval, max_wait_time, max_wait_fallback, members)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(id, user.orgId, body.name, body.strategy ?? 'round-robin', body.holdMusic ?? null, body.holdAnnouncement ?? null, body.announcementInterval ?? 30, body.maxWaitTime ?? 300, JSON.stringify(body.maxWaitFallback ?? { type: 'voicemail' }), JSON.stringify(body.members ?? [])).run();

  return c.json({ success: true, id }, 201);
});

api.put('/api/queues/:id', async (c) => {
  const user = c.get('user');
  const id = c.req.param('id');
  const body = await c.req.json<any>();

  await c.env.DB.prepare(`
    UPDATE call_queues SET name = ?, strategy = ?, hold_music = ?, hold_announcement = ?, announcement_interval = ?, max_wait_time = ?, max_wait_fallback = ?, members = ?, updated_at = datetime('now')
    WHERE id = ? AND org_id = ?
  `).bind(body.name, body.strategy, body.holdMusic ?? null, body.holdAnnouncement ?? null, body.announcementInterval, body.maxWaitTime, JSON.stringify(body.maxWaitFallback), JSON.stringify(body.members), id, user.orgId).run();

  return c.json({ success: true });
});

// ══════════════════════════════════════════════════════════════════════════════
// CALLS
// ══════════════════════════════════════════════════════════════════════════════

api.get('/api/calls', async (c) => {
  const user = c.get('user');
  const page = parseInt(c.req.query('page') ?? '1');
  const pageSize = 50;
  const direction = c.req.query('direction');
  const startDate = c.req.query('startDate');
  const endDate = c.req.query('endDate');
  const offset = (page - 1) * pageSize;

  let query = 'SELECT * FROM call_records WHERE org_id = ?';
  const params: unknown[] = [user.orgId];

  if (direction) { query += ' AND direction = ?'; params.push(direction); }
  if (startDate) { query += ' AND created_at >= ?'; params.push(startDate); }
  if (endDate) { query += ' AND created_at <= ?'; params.push(endDate); }
  query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
  params.push(pageSize, offset);

  const [calls, count] = await Promise.all([
    c.env.DB.prepare(query).bind(...params).all(),
    c.env.DB.prepare('SELECT COUNT(*) as cnt FROM call_records WHERE org_id = ?').bind(user.orgId).first<{ cnt: number }>(),
  ]);

  return c.json({ success: true, data: calls.results, pagination: { page, pageSize, total: count?.cnt ?? 0, totalPages: Math.ceil((count?.cnt ?? 0) / pageSize) } });
});

api.post('/api/calls/outbound', async (c) => {
  const user = c.get('user');
  const tenant = c.get('tenant');
  const body = await c.req.json<{ from: string; to: string; extensionId: string }>();

  const { callSid } = await initiateOutboundCall(tenant, {
    from: body.from,
    to: body.to,
    publicUrl: c.env.PUBLIC_URL,
    orgId: user.orgId,
    extensionId: body.extensionId,
  });

  const callId = crypto.randomUUID();
  await c.env.DB.prepare(`
    INSERT INTO call_records (id, org_id, twilio_call_sid, direction, from_number, to_number, status, extension_id)
    VALUES (?, ?, ?, 'outbound', ?, ?, 'queued', ?)
  `).bind(callId, user.orgId, callSid, body.from, body.to, body.extensionId).run();

  return c.json({ success: true, callSid, callId });
});

api.get('/api/calls/stats', async (c) => {
  const user = c.get('user');
  const period = c.req.query('period') ?? 'today';

  let since: string;
  if (period === 'today') since = new Date().toISOString().slice(0, 10);
  else if (period === 'week') since = new Date(Date.now() - 7 * 86400000).toISOString();
  else since = new Date(Date.now() - 30 * 86400000).toISOString();

  const stats = await c.env.DB.prepare(`
    SELECT
      COUNT(*) as total_calls,
      SUM(CASE WHEN direction = 'inbound' THEN 1 ELSE 0 END) as inbound_calls,
      SUM(CASE WHEN direction = 'outbound' THEN 1 ELSE 0 END) as outbound_calls,
      SUM(CASE WHEN status = 'no-answer' OR status = 'busy' THEN 1 ELSE 0 END) as missed_calls,
      AVG(duration) as avg_duration,
      SUM(duration) as total_duration,
      SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as calls_answered
    FROM call_records
    WHERE org_id = ? AND created_at >= ?
  `).bind(user.orgId, since).first<any>();

  const total = stats?.total_calls ?? 0;
  const answered = stats?.calls_answered ?? 0;

  return c.json({ success: true, data: { ...stats, answerRate: total > 0 ? Math.round((answered / total) * 100) : 0, period } });
});

// ══════════════════════════════════════════════════════════════════════════════
// SMS / MMS
// ══════════════════════════════════════════════════════════════════════════════

api.get('/api/messages/threads', async (c) => {
  const user = c.get('user');
  const threads = await c.env.DB.prepare('SELECT * FROM message_threads WHERE org_id = ? ORDER BY last_message_at DESC LIMIT 100').bind(user.orgId).all();
  return c.json({ success: true, data: threads.results });
});

api.get('/api/messages/threads/:threadId', async (c) => {
  const user = c.get('user');
  const threadId = c.req.param('threadId');
  const messages = await c.env.DB.prepare('SELECT * FROM messages WHERE thread_id = ? AND org_id = ? ORDER BY created_at ASC').bind(threadId, user.orgId).all();

  // Mark thread as read
  await c.env.DB.prepare('UPDATE message_threads SET unread_count = 0 WHERE id = ? AND org_id = ?').bind(threadId, user.orgId).run();

  return c.json({ success: true, data: messages.results.map((m: any) => ({ ...m, mediaUrls: JSON.parse(m.media_urls) })) });
});

api.post('/api/messages/send', requireFeature('smsEnabled'), async (c) => {
  const user = c.get('user');
  const tenant = c.get('tenant');
  const body = await c.req.json<{ from: string; to: string; body: string; mediaUrls?: string[] }>();

  const { messageSid } = await sendMessage(tenant, { from: body.from, to: body.to, body: body.body, mediaUrls: body.mediaUrls });

  const threadId = `${user.orgId}:${body.from}:${body.to}`;
  const msgId = crypto.randomUUID();

  await c.env.DB.prepare(`
    INSERT INTO message_threads (id, org_id, our_number, contact_number, last_message, last_message_at, unread_count)
    VALUES (?, ?, ?, ?, ?, datetime('now'), 0)
    ON CONFLICT(org_id, our_number, contact_number) DO UPDATE SET last_message = excluded.last_message, last_message_at = datetime('now')
  `).bind(threadId, user.orgId, body.from, body.to, body.body.slice(0, 100)).run();

  await c.env.DB.prepare(`
    INSERT INTO messages (id, org_id, twilio_message_sid, thread_id, from_number, to_number, body, media_urls, direction, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'outbound', 'sent')
  `).bind(msgId, user.orgId, messageSid, threadId, body.from, body.to, body.body, JSON.stringify(body.mediaUrls ?? [])).run();

  return c.json({ success: true, messageSid, messageId: msgId });
});

// ══════════════════════════════════════════════════════════════════════════════
// CONFERENCES
// ══════════════════════════════════════════════════════════════════════════════

api.get('/api/conferences', requireFeature('conferenceEnabled'), async (c) => {
  const user = c.get('user');
  const confs = await c.env.DB.prepare('SELECT * FROM conferences WHERE org_id = ? ORDER BY created_at DESC').bind(user.orgId).all();
  return c.json({ success: true, data: confs.results.map((c: any) => ({ ...c, participants: JSON.parse(c.participants) })) });
});

api.post('/api/conferences', requireFeature('conferenceEnabled'), async (c) => {
  const user = c.get('user');
  const body = await c.req.json<{ name: string; maxParticipants?: number; recordEnabled?: boolean }>();
  const id = crypto.randomUUID();
  const accessCode = Math.floor(100000 + Math.random() * 900000).toString();
  const conferenceName = `ih_conf_${user.orgId.slice(0, 8)}_${id.slice(0, 8)}`;

  await c.env.DB.prepare(`
    INSERT INTO conferences (id, org_id, name, access_code, twilio_conference_name, max_participants, record_enabled)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).bind(id, user.orgId, body.name, accessCode, conferenceName, body.maxParticipants ?? 10, body.recordEnabled ? 1 : 0).run();

  return c.json({ success: true, id, accessCode, conferenceName, dialIn: `Dial any IH number and enter code: ${accessCode}` }, 201);
});

api.get('/api/conferences/:id/participants', requireFeature('conferenceEnabled'), async (c) => {
  const user = c.get('user');
  const tenant = c.get('tenant');
  const id = c.req.param('id');

  const conf = await c.env.DB.prepare('SELECT * FROM conferences WHERE id = ? AND org_id = ?').bind(id, user.orgId).first<any>();
  if (!conf) return c.json({ error: 'Conference not found' }, 404);

  const participants = await getConferenceParticipants(tenant, conf.twilio_conference_name);
  return c.json({ success: true, data: participants });
});

api.post('/api/conferences/:id/participants/:callSid/mute', requireFeature('conferenceEnabled'), async (c) => {
  const user = c.get('user');
  const tenant = c.get('tenant');
  const { id, callSid } = c.req.param();
  const { muted } = await c.req.json<{ muted: boolean }>();

  const conf = await c.env.DB.prepare('SELECT twilio_conference_name FROM conferences WHERE id = ? AND org_id = ?').bind(id, user.orgId).first<any>();
  if (!conf) return c.json({ error: 'Conference not found' }, 404);

  await muteParticipant(tenant, conf.twilio_conference_name, callSid, muted);
  return c.json({ success: true });
});

api.delete('/api/conferences/:id/participants/:callSid', requireFeature('conferenceEnabled'), async (c) => {
  const user = c.get('user');
  const tenant = c.get('tenant');
  const { id, callSid } = c.req.param();

  const conf = await c.env.DB.prepare('SELECT twilio_conference_name FROM conferences WHERE id = ? AND org_id = ?').bind(id, user.orgId).first<any>();
  if (!conf) return c.json({ error: 'Conference not found' }, 404);

  await removeParticipant(tenant, conf.twilio_conference_name, callSid);
  return c.json({ success: true });
});

// ══════════════════════════════════════════════════════════════════════════════
// VOICEMAIL
// ══════════════════════════════════════════════════════════════════════════════

api.get('/api/voicemail', async (c) => {
  const user = c.get('user');
  const extensionId = c.req.query('extensionId');
  const unreadOnly = c.req.query('unread') === 'true';

  let query = 'SELECT * FROM voicemails WHERE org_id = ?';
  const params: unknown[] = [user.orgId];

  if (extensionId) { query += ' AND extension_id = ?'; params.push(extensionId); }
  if (unreadOnly) { query += ' AND listened = 0'; }
  query += ' ORDER BY created_at DESC LIMIT 100';

  const vms = await c.env.DB.prepare(query).bind(...params).all();
  return c.json({ success: true, data: vms.results });
});

api.patch('/api/voicemail/:id/listened', async (c) => {
  const user = c.get('user');
  const id = c.req.param('id');
  await c.env.DB.prepare('UPDATE voicemails SET listened = 1 WHERE id = ? AND org_id = ?').bind(id, user.orgId).run();
  return c.json({ success: true });
});

api.delete('/api/voicemail/:id', async (c) => {
  const user = c.get('user');
  const id = c.req.param('id');
  await c.env.DB.prepare('DELETE FROM voicemails WHERE id = ? AND org_id = ?').bind(id, user.orgId).run();
  return c.json({ success: true });
});

// ─── Helper ───────────────────────────────────────────────────────────────────
function generateSecurePassword(): string {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%';
  const arr = new Uint8Array(16);
  crypto.getRandomValues(arr);
  return Array.from(arr).map(b => chars[b % chars.length]).join('');
}

export { api };
