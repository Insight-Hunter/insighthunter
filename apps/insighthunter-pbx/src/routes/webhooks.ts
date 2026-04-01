// apps/insighthunter-pbx/src/routes/webhooks.ts
// All Twilio webhook handlers. These are called by Twilio servers, not by clients.
// Auth is via X-Twilio-Signature + orgId param (no JWT).

import { Hono } from 'hono';
import { Env, TenantPBX, TwilioVoiceWebhook, TwilioSMSWebhook, TwilioStatusWebhook, TIER_LIMITS } from '../types/index.js';
import { validateTwilioWebhook } from '../middleware/auth.js';
import {
  buildInboundCallTwiml, buildIVRMenuTwiml, buildIVRActionTwiml,
  buildRingExtensionTwiml, buildNoAnswerTwiml, buildQueueEntryTwiml,
  buildQueueWaitTwiml, buildVoicemailTwiml, buildConferenceTwiml,
  buildOutboundConnectTwiml, buildClientCallTwiml,
} from '../services/twiml.js';

const wh = new Hono<{ Bindings: Env }>();

// All webhook routes share Twilio validation
wh.use('/webhooks/*', validateTwilioWebhook);

// ─── Helper: XML response ────────────────────────────────────────────────────
function twimlResponse(xml: string) {
  return new Response(xml, {
    headers: { 'Content-Type': 'text/xml; charset=utf-8' },
  });
}

// ─── Helper: get orgId from query ────────────────────────────────────────────
function getOrgId(c: any): string {
  const orgId = c.req.query('orgId');
  if (!orgId) {
    throw new Error('Missing required orgId parameter');
  }
  return orgId;
}

// ══════════════════════════════════════════════════════════════════════════════
// VOICE — INBOUND
// ══════════════════════════════════════════════════════════════════════════════

/** POST /webhooks/voice/inbound — initial inbound call handler */
wh.post('/webhooks/voice/inbound', async (c) => {
  const orgId = getOrgId(c);
  const body = await c.req.parseBody() as TwilioVoiceWebhook;
  const tenant = c.get('tenant');

  // Lookup which number was called and its assignment
  const number = await c.env.DB
    .prepare('SELECT * FROM phone_numbers WHERE org_id = ? AND number = ? AND active = 1')
    .bind(orgId, body.To)
    .first<any>();

  // Log call record
  const callId = crypto.randomUUID();
  await c.env.DB.prepare(`
    INSERT INTO call_records (id, org_id, twilio_call_sid, direction, from_number, to_number, status)
    VALUES (?, ?, ?, 'inbound', ?, ?, 'ringing')
  `).bind(callId, orgId, body.CallSid, body.From, body.To).run();

  const xml = buildInboundCallTwiml({
    assignedType: number?.assigned_type,
    assignedTo: number?.assigned_to,
    forwardTo: number?.forward_to,
    orgId,
    publicUrl: c.env.PUBLIC_URL,
    callSid: body.CallSid,
  });

  c.env.ANALYTICS.writeDataPoint({
    blobs: ['call_inbound', tenant.tier],
    doubles: [1],
    indexes: [orgId],
  });

  return twimlResponse(xml);
});

/** POST /webhooks/voice/ivr — serve IVR menu */
wh.post('/webhooks/voice/ivr', async (c) => {
  const orgId = getOrgId(c);
  const menuId = c.req.query('menuId');

  let menu: any;
  if (menuId) {
    menu = await c.env.DB
      .prepare('SELECT * FROM ivr_menus WHERE id = ? AND org_id = ?')
      .bind(menuId, orgId).first();
  } else {
    menu = await c.env.DB
      .prepare('SELECT * FROM ivr_menus WHERE org_id = ? AND is_default = 1')
      .bind(orgId).first();
  }

  if (!menu) {
    const response = `<?xml version="1.0" encoding="UTF-8"?>
<Response><Say voice="Polly.Joanna">Thank you for calling. We are unable to process your call at this time. Goodbye.</Say><Hangup/></Response>`;
    return twimlResponse(response);
  }

  const options = typeof menu.options === 'string' ? JSON.parse(menu.options) : menu.options;
  const xml = buildIVRMenuTwiml({ ...menu, options }, c.env.PUBLIC_URL, orgId);
  return twimlResponse(xml);
});

/** POST /webhooks/voice/ivr-input — handle IVR digit press */
wh.post('/webhooks/voice/ivr-input', async (c) => {
  const orgId = getOrgId(c);
  const menuId = c.req.query('menuId');
  if (!menuId) {
    return twimlResponse('<Response><Say voice="Polly.Joanna">Invalid menu. Goodbye.</Say><Hangup/></Response>');
  }
  const body = await c.req.parseBody() as { Digits: string };

  const menu = await c.env.DB
    .prepare('SELECT * FROM ivr_menus WHERE id = ? AND org_id = ?')
    .bind(menuId, orgId).first<any>();

  if (!menu) return twimlResponse('<Response><Hangup/></Response>');

  const options = typeof menu.options === 'string' ? JSON.parse(menu.options) : menu.options;
  const selected = options.find((o: any) => o.digit === body.Digits);

  if (!selected) {
    // Invalid key — replay menu
    return twimlResponse(`<Response><Redirect>${c.env.PUBLIC_URL}/webhooks/voice/ivr?orgId=${orgId}&menuId=${menuId}</Redirect></Response>`);
  }

  const xml = buildIVRActionTwiml(selected.action, c.env.PUBLIC_URL, orgId);
  return twimlResponse(xml);
});

/** POST /webhooks/voice/ring-extension — ring a specific extension */
wh.post('/webhooks/voice/ring-extension', async (c) => {
  const orgId = getOrgId(c);
  const extensionId = c.req.query('extensionId')!;
  const body = await c.req.parseBody() as TwilioVoiceWebhook;
  const tenant = c.get('tenant');

  const extension = await c.env.DB
    .prepare('SELECT * FROM extensions WHERE id = ? AND org_id = ?')
    .bind(extensionId, orgId).first<any>();

  if (!extension) {
    return twimlResponse(`<Response><Say voice="Polly.Joanna">Extension not found. Goodbye.</Say><Hangup/></Response>`);
  }

  const tierConfig = TIER_LIMITS[tenant.tier as keyof typeof TIER_LIMITS];

  const xml = buildRingExtensionTwiml({
    extension,
    publicUrl: c.env.PUBLIC_URL,
    orgId,
    callSid: body.CallSid,
    recordEnabled: tierConfig.recordingEnabled,
  });

  // Update call record with extension
  await c.env.DB.prepare(`
    UPDATE call_records SET extension_id = ? WHERE twilio_call_sid = ? AND org_id = ?
  `).bind(extensionId, body.CallSid, orgId).run();

  return twimlResponse(xml);
});

/** POST /webhooks/voice/no-answer — extension didn't answer */
wh.post('/webhooks/voice/no-answer', async (c) => {
  const orgId = getOrgId(c);
  const extensionId = c.req.query('extensionId')!;

  const extension = await c.env.DB
    .prepare('SELECT * FROM extensions WHERE id = ? AND org_id = ?')
    .bind(extensionId, orgId).first<any>();

  if (!extension) return twimlResponse('<Response><Hangup/></Response>');

  const xml = buildNoAnswerTwiml({ extension, publicUrl: c.env.PUBLIC_URL, orgId });
  return twimlResponse(xml);
});

/** POST /webhooks/voice/queue — enter a call queue */
wh.post('/webhooks/voice/queue', async (c) => {
  const orgId = getOrgId(c);
  const queueId = c.req.query('queueId')!;

  const queue = await c.env.DB
    .prepare('SELECT * FROM call_queues WHERE id = ? AND org_id = ?')
    .bind(queueId, orgId).first<any>();

  if (!queue) return twimlResponse('<Response><Hangup/></Response>');

  const members = typeof queue.members === 'string' ? JSON.parse(queue.members) : queue.members;
  const xml = buildQueueEntryTwiml({
    queue: { ...queue, members, maxWaitFallback: JSON.parse(queue.max_wait_fallback) },
    publicUrl: c.env.PUBLIC_URL,
    orgId,
  });

  return twimlResponse(xml);
});

/** POST /webhooks/voice/queue-wait — queue hold experience */
wh.post('/webhooks/voice/queue-wait', async (c) => {
  const orgId = getOrgId(c);
  const queueId = c.req.query('queueId')!;
  const body = await c.req.parseBody() as { QueuePosition?: string; AverageQueueTime?: string };

  const queue = await c.env.DB
    .prepare('SELECT * FROM call_queues WHERE id = ? AND org_id = ?')
    .bind(queueId, orgId).first<any>();

  if (!queue) return twimlResponse('<Response><Hangup/></Response>');

  const xml = buildQueueWaitTwiml({
    queue: { ...queue, members: [] },
    queuePosition: parseInt(body.QueuePosition ?? '0'),
    averageWaitTime: parseInt(body.AverageQueueTime ?? '60'),
  });

  return twimlResponse(xml);
});

/** POST /webhooks/voice/voicemail — record voicemail */
wh.post('/webhooks/voice/voicemail', async (c) => {
  const orgId = getOrgId(c);
  const extensionId = c.req.query('extensionId');
  const tenant = c.get('tenant');

  const extension = extensionId
    ? await c.env.DB.prepare('SELECT * FROM extensions WHERE id = ? AND org_id = ?').bind(extensionId, orgId).first<any>()
    : null;

  const tierConfig = TIER_LIMITS[tenant.tier as keyof typeof TIER_LIMITS];

  const xml = buildVoicemailTwiml({
    extensionName: extension?.display_name ?? 'this person',
    publicUrl: c.env.PUBLIC_URL,
    orgId,
    extensionId: extensionId ?? '',
    transcribe: tierConfig.recordingEnabled,
  });

  return twimlResponse(xml);
});

/** POST /webhooks/voice/voicemail-complete — voicemail recording saved */
wh.post('/webhooks/voice/voicemail-complete', async (c) => {
  const orgId = getOrgId(c);
  const extensionId = c.req.query('extensionId')!;
  const body = await c.req.parseBody() as any;

  if (body.RecordingUrl) {
    await c.env.DB.prepare(`
      INSERT INTO voicemails (id, org_id, extension_id, twilio_call_sid, from_number, duration, recording_url, recording_sid)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      crypto.randomUUID(), orgId, extensionId,
      body.CallSid, body.From,
      parseInt(body.RecordingDuration ?? '0'),
      body.RecordingUrl, body.RecordingSid ?? ''
    ).run();
  }

  return twimlResponse('<Response><Say voice="Polly.Joanna">Your message has been saved. Goodbye.</Say><Hangup/></Response>');
});

/** POST /webhooks/voice/client — WebRTC outbound call from browser softphone */
wh.post('/webhooks/voice/client', async (c) => {
  const orgId = getOrgId(c);
  const body = await c.req.parseBody() as any;
  const tenant = c.get('tenant');
  const tierConfig = TIER_LIMITS[tenant.tier as keyof typeof TIER_LIMITS];

  // Get the caller's extension to determine from number
  const identity = body.Caller?.replace('client:', '');
  const extension = identity
    ? await c.env.DB.prepare('SELECT * FROM extensions WHERE twilio_identity = ? AND org_id = ?').bind(identity, orgId).first<any>()
    : null;

  // Get first active number for this org as caller ID
  const number = await c.env.DB
    .prepare('SELECT number FROM phone_numbers WHERE org_id = ? AND active = 1 LIMIT 1')
    .bind(orgId).first<{ number: string }>();

  const xml = buildClientCallTwiml({
    to: body.To ?? '',
    from: number?.number ?? body.From,
    publicUrl: c.env.PUBLIC_URL,
    orgId,
    extensionId: extension?.id ?? '',
    recordEnabled: tierConfig.recordingEnabled,
  });

  return twimlResponse(xml);
});

/** POST /webhooks/voice/conference — join a conference bridge */
wh.post('/webhooks/voice/conference', async (c) => {
  const orgId = getOrgId(c);
  const conferenceId = c.req.query('conferenceId')!;
  const body = await c.req.parseBody() as any;
  const tenant = c.get('tenant');
  const tierConfig = TIER_LIMITS[tenant.tier as keyof typeof TIER_LIMITS];

  const conf = await c.env.DB
    .prepare('SELECT * FROM conferences WHERE id = ? AND org_id = ?')
    .bind(conferenceId, orgId).first<any>();

  if (!conf) return twimlResponse('<Response><Say>Conference not found. Goodbye.</Say><Hangup/></Response>');

  // Validate access code
  if (body.Digits && body.Digits !== conf.access_code) {
    return twimlResponse('<Response><Say voice="Polly.Joanna">Invalid access code. Goodbye.</Say><Hangup/></Response>');
  }

  const xml = buildConferenceTwiml({
    conferenceName: conf.twilio_conference_name,
    accessCode: conf.access_code,
    record: conf.record_enabled && tierConfig.recordingEnabled,
    publicUrl: c.env.PUBLIC_URL,
    orgId,
    conferenceId,
  });

  return twimlResponse(xml);
});

/** POST /webhooks/voice/outbound-connect — connect outbound call */
wh.post('/webhooks/voice/outbound-connect', async (c) => {
  const orgId = getOrgId(c);
  const body = await c.req.parseBody() as any;
  const tenant = c.get('tenant');
  const tierConfig = TIER_LIMITS[tenant.tier as keyof typeof TIER_LIMITS];

  const xml = buildOutboundConnectTwiml({
    to: body.To ?? '',
    publicUrl: c.env.PUBLIC_URL,
    orgId,
    recordEnabled: tierConfig.recordingEnabled,
  });

  return twimlResponse(xml);
});

// ══════════════════════════════════════════════════════════════════════════════
// VOICE — STATUS CALLBACKS
// ══════════════════════════════════════════════════════════════════════════════

/** POST /webhooks/voice/status — call status updates */
wh.post('/webhooks/voice/status', async (c) => {
  const orgId = getOrgId(c);
  const body = await c.req.parseBody() as TwilioStatusWebhook;

  const statusMap: Record<string, string> = {
    'in-progress': 'in-progress',
    'completed': 'completed',
    'busy': 'busy',
    'failed': 'failed',
    'no-answer': 'no-answer',
    'canceled': 'canceled',
  };

  const status = statusMap[body.CallStatus] ?? body.CallStatus;
  const updates: string[] = ['status = ?'];
  const params: unknown[] = [status];

  if (body.Duration) {
    updates.push('duration = ?');
    params.push(parseInt(body.Duration));
  }

  if (status === 'in-progress') {
    updates.push('answered_at = datetime(\'now\')');
  }

  if (status === 'completed') {
    updates.push('ended_at = datetime(\'now\')');
  }

  if (body.RecordingUrl) {
    updates.push('recording_url = ?', 'recording_sid = ?');
    params.push(body.RecordingUrl, body.RecordingSid ?? '');
  }

  params.push(body.CallSid, orgId);

  await c.env.DB.prepare(
    `UPDATE call_records SET ${updates.join(', ')} WHERE twilio_call_sid = ? AND org_id = ?`
  ).bind(...params).run();

  // Write analytics
  if (status === 'completed') {
    c.env.ANALYTICS.writeDataPoint({
      blobs: ['call_completed', status],
      doubles: [parseInt(body.Duration ?? '0')],
      indexes: [orgId],
    });
  }

  return new Response('OK', { status: 200 });
});

/** POST /webhooks/voice/recording-status — recording ready */
wh.post('/webhooks/voice/recording-status', async (c) => {
  const orgId = getOrgId(c);
  const body = await c.req.parseBody() as any;

  if (body.RecordingStatus === 'completed' && body.RecordingUrl) {
    await c.env.DB.prepare(`
      UPDATE call_records SET recording_url = ?, recording_sid = ?, recording_duration = ?
      WHERE twilio_call_sid = ? AND org_id = ?
    `).bind(
      body.RecordingUrl, body.RecordingSid,
      parseInt(body.RecordingDuration ?? '0'),
      body.CallSid, orgId
    ).run();

    // Archive to R2 asynchronously
    // In production: use a queue to download and store to R2
  }

  return new Response('OK', { status: 200 });
});

/** POST /webhooks/voice/transcription — transcription complete */
wh.post('/webhooks/voice/transcription', async (c) => {
  const orgId = getOrgId(c);
  const extensionId = c.req.query('extensionId');
  const body = await c.req.parseBody() as any;

  if (body.TranscriptionText) {
    if (extensionId) {
      await c.env.DB.prepare(`
        UPDATE voicemails SET transcription = ? WHERE twilio_call_sid = ? AND org_id = ?
      `).bind(body.TranscriptionText, body.CallSid, orgId).run();
    } else {
      await c.env.DB.prepare(`
        UPDATE call_records SET transcription = ? WHERE twilio_call_sid = ? AND org_id = ?
      `).bind(body.TranscriptionText, body.CallSid, orgId).run();
    }
  }

  return new Response('OK', { status: 200 });
});

/** POST /webhooks/voice/conference-status — conference participant events */
wh.post('/webhooks/voice/conference-status', async (c) => {
  const orgId = getOrgId(c);
  const conferenceId = c.req.query('conferenceId')!;
  const body = await c.req.parseBody() as any;

  const statusMap: Record<string, string> = {
    'conference-start': 'active',
    'conference-end': 'idle',
  };

  if (statusMap[body.StatusCallbackEvent]) {
    await c.env.DB.prepare(
      `UPDATE conferences SET status = ? WHERE id = ? AND org_id = ?`
    ).bind(statusMap[body.StatusCallbackEvent], conferenceId, orgId).run();
  }

  return new Response('OK', { status: 200 });
});

// ══════════════════════════════════════════════════════════════════════════════
// SMS / MMS — INBOUND
// ══════════════════════════════════════════════════════════════════════════════

/** POST /webhooks/sms/inbound — inbound SMS/MMS */
wh.post('/webhooks/sms/inbound', async (c) => {
  const orgId = getOrgId(c);
  const body = await c.req.parseBody() as TwilioSMSWebhook;

  // Find our phone number record
  const ourNumber = await c.env.DB
    .prepare('SELECT * FROM phone_numbers WHERE org_id = ? AND number = ?')
    .bind(orgId, body.To)
    .first<any>();

  // Build media URLs array
  const mediaUrls: string[] = [];
  const numMedia = parseInt(body.NumMedia ?? '0');
  for (let i = 0; i < numMedia; i++) {
    const url = (body as any)[`MediaUrl${i}`];
    if (url) mediaUrls.push(url);
  }

  // Upsert thread
  const threadId = `${orgId}:${body.To}:${body.From}`;
  await c.env.DB.prepare(`
    INSERT INTO message_threads (id, org_id, our_number, contact_number, last_message, last_message_at, unread_count)
    VALUES (?, ?, ?, ?, ?, datetime('now'), 1)
    ON CONFLICT(org_id, our_number, contact_number) DO UPDATE SET
      last_message = excluded.last_message,
      last_message_at = datetime('now'),
      unread_count = unread_count + 1
  `).bind(threadId, orgId, body.To, body.From, body.Body.slice(0, 100)).run();

  // Insert message
  await c.env.DB.prepare(`
    INSERT INTO messages (id, org_id, twilio_message_sid, thread_id, from_number, to_number, body, media_urls, direction, status, from_number_id)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'inbound', 'received', ?)
  `).bind(
    crypto.randomUUID(), orgId, body.MessageSid,
    threadId, body.From, body.To, body.Body,
    JSON.stringify(mediaUrls), ourNumber?.id ?? null
  ).run();

  c.env.ANALYTICS.writeDataPoint({
    blobs: ['sms_inbound', mediaUrls.length > 0 ? 'mms' : 'sms'],
    doubles: [1],
    indexes: [orgId],
  });

  // Return empty TwiML (no auto-reply)
  return twimlResponse('<Response></Response>');
});

export { wh as webhookRoutes };
