.// apps/insighthunter-pbx/src/index.ts
// Twilio-backed PBX: provisioning, IVR TwiML, voicemail, call logs, SMS
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { getCookie } from 'hono/cookie'

export interface Env {
  DB:                    D1Database
  KV:                    KVNamespace          // stores TwiML config per user
  TWILIO_ACCOUNT_SID:    string
  TWILIO_AUTH_TOKEN:     string
  TWILIO_TWIML_APP_SID:  string
  JWT_SECRET:            string
  WORKER_URL:            string               // https://insighthunter-pbx.workers.dev
}

// ── Auth ──────────────────────────────────────────────────────
async function verifyJWT(token: string, secret: string) {
  try {
    const enc = new TextEncoder()
    const parts = token.split('.')
    if (parts.length !== 3) return null
    const key = await crypto.subtle.importKey('raw', enc.encode(secret),
      { name: 'HMAC', hash: 'SHA-256' }, false, ['verify'])
    const sig = Uint8Array.from(
      atob(parts[2].replace(/-/g,'+').replace(/_/g,'/')), c => c.charCodeAt(0))
    const valid = await crypto.subtle.verify('HMAC', key, sig,
      enc.encode(`${parts[0]}.${parts[1]}`))
    if (!valid) return null
    const p = JSON.parse(atob(parts[1].replace(/-/g,'+').replace(/_/g,'/')))
    if (p.exp < Math.floor(Date.now()/1000)) return null
    return p as { sub: string; email: string; plan: string }
  } catch { return null }
}

async function requireAuth(c: any) {
  const token = getCookie(c,'ih_token') ?? c.req.header('Authorization')?.replace('Bearer ','')
  if (!token) return c.json({ error: 'Unauthenticated' }, 401)
  const user = await verifyJWT(token, c.env.JWT_SECRET)
  if (!user) return c.json({ error: 'Invalid session.' }, 401)
  return user
}

async function requirePro(c: any) {
  const user = await requireAuth(c)
  if (user instanceof Response) return user
  // Check DB for current plan (catches promo upgrades)
  const row = await c.env.DB.prepare('SELECT plan, plan_expires FROM users WHERE id=?')
    .bind(user.sub).first<{ plan: string; plan_expires: string | null }>()
  const plan = row?.plan ?? user.plan
  const proPlans = ['pro', 'pro_single', 'pro_enterprise', 'enterprise']
  const eligible = proPlans.includes(plan) ||
    c.req.header('X-Pbx-Override') === 'addon' // addon purchase bypass
  if (!eligible) return c.json({ error: 'PBX requires Pro plan or PBX add-on.', upgrade: '/dashboard/upgrade.html' }, 403)
  return user
}

// ── Twilio REST helper ────────────────────────────────────────
async function twilio(env: Env, method: string, path: string, body?: Record<string, string>) {
  const creds = btoa(`${env.TWILIO_ACCOUNT_SID}:${env.TWILIO_AUTH_TOKEN}`)
  const base  = `https://api.twilio.com/2010-04-01/Accounts/${env.TWILIO_ACCOUNT_SID}`
  const opts: RequestInit = {
    method,
    headers: { Authorization: `Basic ${creds}`, 'Content-Type': 'application/x-www-form-urlencoded' },
  }
  if (body) opts.body = new URLSearchParams(body).toString()
  const res = await fetch(`${base}${path}`, opts)
  return res.json() as Promise<any>
}

const app = new Hono<{ Bindings: Env }>()

app.use('*', cors({
  origin: o => o?.includes('insighthunter.app') || o?.includes('localhost') ? o : null,
  credentials: true,
  allowMethods: ['GET','POST','DELETE','OPTIONS'],
  allowHeaders: ['Content-Type','Authorization'],
}))

// ──────────────────────────────────────────────────────────────
// NUMBER PROVISIONING
// ──────────────────────────────────────────────────────────────

// GET /pbx/numbers/search?area_code=404&type=local
app.get('/pbx/numbers/search', async (c) => {
  const user = await requirePro(c)
  if (user instanceof Response) return user

  const areaCode  = c.req.query('area_code') ?? '404'
  const type      = c.req.query('type') === 'tollfree' ? 'TollFree' : 'Local'
  const path      = `/AvailablePhoneNumbers/US/${type}.json?AreaCode=${areaCode}&Limit=10`
  const result    = await twilio(c.env, 'GET', path)

  return c.json({
    numbers: result.available_phone_numbers?.map((n: any) => ({
      phone_number: n.phone_number,
      friendly_name: n.friendly_name,
      locality: n.locality,
      region: n.region,
      postal_code: n.postal_code,
    })) ?? []
  })
})

// POST /pbx/numbers/provision
app.post('/pbx/numbers/provision', async (c) => {
  const user = await requirePro(c)
  if (user instanceof Response) return user

  // One number per user (add-on)
  const existing = await c.env.DB.prepare(
    'SELECT phone_number FROM pbx_numbers WHERE user_id=? AND status=?')
    .bind(user.sub, 'active').first()
  if (existing) return c.json({ error: 'You already have an active number. Release it first.', existing }, 409)

  const { phone_number, friendly_name = 'My Business' } =
    await c.req.json<{ phone_number: string; friendly_name?: string }>()
  if (!phone_number) return c.json({ error: 'phone_number required' }, 400)

  const result = await twilio(c.env, 'POST', '/IncomingPhoneNumbers.json', {
    PhoneNumber:     phone_number,
    FriendlyName:    friendly_name,
    VoiceUrl:        `${c.env.WORKER_URL}/pbx/twiml/voice?user_id=${user.sub}`,
    VoiceMethod:     'POST',
    StatusCallback:  `${c.env.WORKER_URL}/pbx/twiml/status?user_id=${user.sub}`,
    SmsUrl:          `${c.env.WORKER_URL}/pbx/twiml/sms?user_id=${user.sub}`,
    SmsMethod:       'POST',
  })

  if (result.code) return c.json({ error: result.message }, 500)

  await c.env.DB.prepare(`
    INSERT INTO pbx_numbers (id, user_id, phone_number, friendly_name, twilio_sid, status, created_at)
    VALUES (?, ?, ?, ?, ?, 'active', datetime('now'))`)
    .bind(crypto.randomUUID(), user.sub, phone_number, friendly_name, result.sid)
    .run()

  // Default IVR config in KV
  await c.env.KV.put(`pbx:ivr:${user.sub}`, JSON.stringify({
    greeting: `Thank you for calling ${friendly_name}. Press 1 for sales, 2 for support, or stay on the line for voicemail.`,
    routes: { '1': 'sales', '2': 'support' },
    voicemail_enabled: true,
  }))

  return c.json({ success: true, phone_number, friendly_name, twilio_sid: result.sid })
})

// GET /pbx/numbers — list user's numbers
app.get('/pbx/numbers', async (c) => {
  const user = await requirePro(c)
  if (user instanceof Response) return user
  const { results } = await c.env.DB.prepare(
    'SELECT * FROM pbx_numbers WHERE user_id=? ORDER BY created_at DESC')
    .bind(user.sub).all()
  return c.json({ numbers: results })
})

// DELETE /pbx/numbers/:sid — release a number
app.delete('/pbx/numbers/:sid', async (c) => {
  const user = await requirePro(c)
  if (user instanceof Response) return user
  const sid = c.req.param('sid')
  const row = await c.env.DB.prepare(
    'SELECT twilio_sid FROM pbx_numbers WHERE user_id=? AND twilio_sid=?')
    .bind(user.sub, sid).first<{ twilio_sid: string }>()
  if (!row) return c.json({ error: 'Number not found.' }, 404)
  await twilio(c.env, 'DELETE', `/IncomingPhoneNumbers/${sid}.json`)
  await c.env.DB.prepare(
    "UPDATE pbx_numbers SET status='released', updated_at=datetime('now') WHERE twilio_sid=?")
    .bind(sid).run()
  return c.json({ success: true })
})

// ──────────────────────────────────────────────────────────────
// IVR CONFIGURATION
// ──────────────────────────────────────────────────────────────

// GET /pbx/ivr — get IVR config
app.get('/pbx/ivr', async (c) => {
  const user = await requirePro(c)
  if (user instanceof Response) return user
  const raw = await c.env.KV.get(`pbx:ivr:${user.sub}`)
  return c.json({ ivr: raw ? JSON.parse(raw) : null })
})

// PUT /pbx/ivr — update IVR config
app.put('/pbx/ivr', async (c) => {
  const user = await requirePro(c)
  if (user instanceof Response) return user
  const config = await c.req.json()
  await c.env.KV.put(`pbx:ivr:${user.sub}`, JSON.stringify(config))
  return c.json({ success: true, ivr: config })
})

// ──────────────────────────────────────────────────────────────
// TWIML WEBHOOKS (called by Twilio — no auth, validate signature)
// ──────────────────────────────────────────────────────────────

// POST /pbx/twiml/voice — handle incoming calls
app.post('/pbx/twiml/voice', async (c) => {
  const userId = c.req.query('user_id') ?? ''
  const raw    = await c.env.KV.get(`pbx:ivr:${userId}`)
  const ivr    = raw ? JSON.parse(raw) : { greeting: 'Hello, please leave a message.', voicemail_enabled: true }

  // Log call
  const body   = await c.req.parseBody()
  await c.env.DB.prepare(`
    INSERT INTO pbx_calls (id, user_id, direction, from_number, to_number, call_sid, status, created_at)
    VALUES (?, ?, 'inbound', ?, ?, ?, 'ringing', datetime('now'))`)
    .bind(crypto.randomUUID(), userId, body.From, body.To, body.CallSid)
    .run()

  const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Gather numDigits="1" action="${c.env.WORKER_URL}/pbx/twiml/gather?user_id=${userId}" method="POST" timeout="5">
    <Say voice="Polly.Joanna">${ivr.greeting}</Say>
  </Gather>
  <Redirect>${c.env.WORKER_URL}/pbx/twiml/voicemail?user_id=${userId}</Redirect>
</Response>`

  return new Response(twiml, { headers: { 'Content-Type': 'text/xml' } })
})

// POST /pbx/twiml/gather — handle keypress
app.post('/pbx/twiml/gather', async (c) => {
  const userId  = c.req.query('user_id') ?? ''
  const body    = await c.req.parseBody()
  const digit   = body.Digits as string
  const raw     = await c.env.KV.get(`pbx:ivr:${userId}`)
  const ivr     = raw ? JSON.parse(raw) : {}
  const routes  = ivr.routes ?? {}
  const dest    = routes[digit]

  let twiml: string
  if (dest) {
    // Look up forwarding number in DB
    const fwd = await c.env.DB.prepare(
      'SELECT forward_to FROM pbx_routes WHERE user_id=? AND label=?')
      .bind(userId, dest).first<{ forward_to: string }>()
    if (fwd?.forward_to) {
      twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="Polly.Joanna">Connecting you now.</Say>
  <Dial callerId="${body.To}"><Number>${fwd.forward_to}</Number></Dial>
</Response>`
    } else {
      twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Redirect>${c.env.WORKER_URL}/pbx/twiml/voicemail?user_id=${userId}</Redirect>
</Response>`
    }
  } else {
    twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Redirect>${c.env.WORKER_URL}/pbx/twiml/voicemail?user_id=${userId}</Redirect>
</Response>`
  }

  return new Response(twiml, { headers: { 'Content-Type': 'text/xml' } })
})

// POST /pbx/twiml/voicemail — record voicemail
app.post('/pbx/twiml/voicemail', async (c) => {
  const userId = c.req.query('user_id') ?? ''
  const body   = await c.req.parseBody()

  if (body.RecordingUrl) {
    // Recording callback
    await c.env.DB.prepare(`
      INSERT INTO pbx_voicemails (id, user_id, from_number, recording_url, recording_sid, duration, listened, created_at)
      VALUES (?, ?, ?, ?, ?, ?, 0, datetime('now'))`)
      .bind(crypto.randomUUID(), userId, body.From ?? '', body.RecordingUrl, body.RecordingSid, body.RecordingDuration ?? 0)
      .run()
    return new Response('', { status: 204 })
  }

  const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="Polly.Joanna">Please leave your message after the tone. Press any key when finished.</Say>
  <Record maxLength="120" transcribe="true"
    transcribeCallback="${c.env.WORKER_URL}/pbx/twiml/transcribe?user_id=${userId}"
    action="${c.env.WORKER_URL}/pbx/twiml/voicemail?user_id=${userId}"
    playBeep="true" finishOnKey="any"/>
  <Say voice="Polly.Joanna">We did not receive a recording. Goodbye.</Say>
</Response>`

  return new Response(twiml, { headers: { 'Content-Type': 'text/xml' } })
})

// POST /pbx/twiml/transcribe — save voicemail transcription
app.post('/pbx/twiml/transcribe', async (c) => {
  const userId = c.req.query('user_id') ?? ''
  const body   = await c.req.parseBody()
  if (body.TranscriptionText && body.RecordingSid) {
    await c.env.DB.prepare(
      'UPDATE pbx_voicemails SET transcription=? WHERE recording_sid=? AND user_id=?')
      .bind(body.TranscriptionText, body.RecordingSid, userId)
      .run()
  }
  return new Response('', { status: 204 })
})

// POST /pbx/twiml/sms — incoming SMS
// app.post('/pbx/twiml/sms', async (c) => {
//  const userId = c.req.query('user_id') ?? ''
//  const body   = await c.req.parseBody()
//  await c.env.DB.prepare(`
//    INSERT INTO pbx_sms (id, user_id, direction, from_number, to_number, body, status, created_at)
//  VALUES (?, ?, 'inbound', ?, ?, ?, 'received', datetime('now'))`)
//    .bind(crypto.randomUUID(), userId, body.From, body.To, body.Body ?? '')
//    .run()
//  return new Response('<Response/>', { headers: { 'Content-Type': 'text/xml' } })
// })

// ── PATCH: Replace /pbx/twiml/sms in index.ts with this ──────
// Handles STOP/HELP/UNSTOP keywords automatically (TCPA required)

app.post('/pbx/twiml/sms', async (c) => {
    const userId = c.req.query('user_id') ?? ''
    const body   = await c.req.parseBody()
    const from   = body.From as string
    const text   = (body.Body as string ?? '').trim()
  
    // 1 — Process opt-in/out keywords
    const { auto_reply, status_changed } = await processInboundSMS(c.env.DB, userId, from, text)
  
    // 2 — Save to inbox
    await c.env.DB.prepare(`
      INSERT INTO pbx_sms (id, user_id, direction, from_number, to_number, body, status, opt_keyword, created_at)
      VALUES (?, ?, 'inbound', ?, ?, ?, 'received', ?, datetime('now'))`)
      .bind(crypto.randomUUID(), userId, from, body.To, text, status_changed ?? null)
      .run()
  
    // 3 — Auto-reply for STOP/HELP/START etc. (carrier-required)
    if (auto_reply) {
      return new Response(
        `<?xml version="1.0" encoding="UTF-8"?><Response><Message>${auto_reply}</Message></Response>`,
        { headers: { 'Content-Type': 'text/xml' } }
      )
    }
  
    return new Response('<Response/>', { headers: { 'Content-Type': 'text/xml' } })
  })
  
  // ── PATCH: Replace /pbx/sms/send — enforce consent check ─────
  app.post('/pbx/sms/send', async (c) => {
    const user = await requirePro(c)
    if (user instanceof Response) return user
  
    const { to, body: msgBody, skip_consent_check = false } =
      await c.req.json<{ to: string; body: string; skip_consent_check?: boolean }>()
  
    const from = await c.env.DB.prepare(
      'SELECT phone_number FROM pbx_numbers WHERE user_id=? AND status=?')
      .bind(user.sub, 'active').first<{ phone_number: string }>()
  
    if (!from?.phone_number) return c.json({ error: 'No active number found.' }, 404)
    if (!to || !msgBody)      return c.json({ error: 'to and body are required.' }, 400)
  
    // TCPA consent check (skip for transactional messages like OTP)
    if (!skip_consent_check) {
      const consent = await hasConsent(c.env.DB, user.sub, to)
      if (!consent.ok) {
        return c.json({
          error: 'Cannot send SMS — recipient has not opted in or has opted out.',
          reason: consent.reason,
          fix: 'Collect opt-in consent via /api/pbx/consent/collect before messaging.'
        }, 403)
      }
    }
  
    const result = await twilio(c.env, 'POST', '/Messages.json', { From: from.phone_number, To: to, Body: msgBody })
    if (result.code) return c.json({ error: result.message }, 500)
  
    await c.env.DB.prepare(`
      INSERT INTO pbx_sms (id, user_id, direction, from_number, to_number, body, twilio_sid, status, created_at)
      VALUES (?, ?, 'outbound', ?, ?, ?, ?, 'sent', datetime('now'))`)
      .bind(crypto.randomUUID(), user.sub, from.phone_number, to, msgBody, result.sid)
      .run()
  
    await auditLog(c.env.DB, user.sub, 'sms_sent', { to, sid: result.sid })
    return c.json({ success: true, sid: result.sid })
  })
  
  // ── Consent collection API ────────────────────────────────────
  app.post('/pbx/consent/collect', async (c) => {
    const user = await requirePro(c)
    if (user instanceof Response) return user
    const { phone_number, consent_type = 'web_form', message_type = 'mixed',
      program_name, opt_in_message } =
      await c.req.json<{
        phone_number: string; consent_type?: string; message_type?: string
        program_name?: string; opt_in_message?: string
      }>()
  
    if (!phone_number) return c.json({ error: 'phone_number required' }, 400)
  
    await recordConsent(c.env.DB, user.sub, phone_number, consent_type as any, {
      ip:            c.req.header('CF-Connecting-IP'),
      message_type,
      program_name,
      opt_in_message,
    })
    await auditLog(c.env.DB, user.sub, 'consent_recorded', { phone_number, consent_type, message_type })
  
    return c.json({ success: true, message: 'Consent recorded.' })
  })
  
  // ── Bulk import consent (CSV upload flow) ─────────────────────
  app.post('/pbx/consent/bulk', async (c) => {
    const user = await requirePro(c)
    if (user instanceof Response) return user
    const { numbers, consent_type = 'import', program_name = '',
      opt_in_message = '', message_type = 'mixed' } =
      await c.req.json<{
        numbers: string[]; consent_type?: string
        program_name?: string; opt_in_message?: string; message_type?: string
      }>()
  
    if (!numbers?.length) return c.json({ error: 'numbers array required' }, 400)
    if (numbers.length > 500) return c.json({ error: 'Max 500 per request' }, 400)
  
    const stmts = numbers.map(n =>
      c.env.DB.prepare(`
        INSERT OR IGNORE INTO sms_consent
          (id, user_id, phone_number, status, consent_type, message_type, program_name, opt_in_message, consented_at, created_at)
        VALUES (?, ?, ?, 'active', ?, ?, ?, ?, datetime('now'), datetime('now'))`)
        .bind(crypto.randomUUID(), user.sub, n, consent_type, message_type, program_name, opt_in_message)
    )
    await c.env.DB.batch(stmts)
    await auditLog(c.env.DB, user.sub, 'consent_bulk_import', { count: numbers.length, consent_type })
  
    return c.json({ success: true, imported: numbers.length })
  })
  
  // ── Consent status lookup ─────────────────────────────────────
  app.get('/pbx/consent/:phone', async (c) => {
    const user = await requirePro(c)
    if (user instanceof Response) return user
    const phone = decodeURIComponent(c.req.param('phone'))
    const row = await c.env.DB.prepare(`
      SELECT * FROM sms_consent
      WHERE user_id=? AND phone_number=?
      ORDER BY created_at DESC LIMIT 1`)
      .bind(user.sub, phone).first()
    return c.json({ consent: row ?? null })
  })
  
  // ── Opt-out list ──────────────────────────────────────────────
  app.get('/pbx/consent/opted-out', async (c) => {
    const user = await requirePro(c)
    if (user instanceof Response) return user
    const { results } = await c.env.DB.prepare(`
      SELECT DISTINCT phone_number, MAX(consented_at) as opted_out_at
      FROM sms_consent
      WHERE user_id=? AND status='opted_out'
      GROUP BY phone_number`)
      .bind(user.sub).all()
    return c.json({ opted_out: results, count: results.length })
  })
  
// ──────────────────────────────────────────────────────────────
// CALL LOGS
// ──────────────────────────────────────────────────────────────
app.get('/pbx/calls', async (c) => {
  const user = await requirePro(c)
  if (user instanceof Response) return user
  const limit  = parseInt(c.req.query('limit') ?? '25')
  const offset = parseInt(c.req.query('offset') ?? '0')
  const { results } = await c.env.DB.prepare(
    'SELECT * FROM pbx_calls WHERE user_id=? ORDER BY created_at DESC LIMIT ? OFFSET ?')
    .bind(user.sub, limit, offset).all()
  return c.json({ calls: results })
})

// ──────────────────────────────────────────────────────────────
// VOICEMAILS
// ──────────────────────────────────────────────────────────────
app.get('/pbx/voicemails', async (c) => {
  const user = await requirePro(c)
  if (user instanceof Response) return user
  const { results } = await c.env.DB.prepare(
    'SELECT * FROM pbx_voicemails WHERE user_id=? ORDER BY created_at DESC LIMIT 50')
    .bind(user.sub).all()
  return c.json({ voicemails: results })
})

app.post('/pbx/voicemails/:id/listen', async (c) => {
  const user = await requirePro(c)
  if (user instanceof Response) return user
  await c.env.DB.prepare(
    'UPDATE pbx_voicemails SET listened=1 WHERE id=? AND user_id=?')
    .bind(c.req.param('id'), user.sub).run()
  return c.json({ success: true })
})

// ──────────────────────────────────────────────────────────────
// SMS
// ──────────────────────────────────────────────────────────────
app.get('/pbx/sms', async (c) => {
  const user = await requirePro(c)
  if (user instanceof Response) return user
  const { results } = await c.env.DB.prepare(
    'SELECT * FROM pbx_sms WHERE user_id=? ORDER BY created_at DESC LIMIT 50')
    .bind(user.sub).all()
  return c.json({ messages: results })
})

app.post('/pbx/sms/send', async (c) => {
  const user = await requirePro(c)
  if (user instanceof Response) return user

  const { to, body: msgBody } = await c.req.json<{ to: string; body: string }>()
  const from = await c.env.DB.prepare(
    'SELECT phone_number FROM pbx_numbers WHERE user_id=? AND status=?')
    .bind(user.sub, 'active').first<{ phone_number: string }>()

  if (!from?.phone_number) return c.json({ error: 'No active number found.' }, 404)
  if (!to || !msgBody)      return c.json({ error: 'to and body are required.' }, 400)

  const result = await twilio(c.env, 'POST', '/Messages.json', {
    From: from.phone_number,
    To:   to,
    Body: msgBody,
  })

  if (result.code) return c.json({ error: result.message }, 500)

  await c.env.DB.prepare(`
    INSERT INTO pbx_sms (id, user_id, direction, from_number, to_number, body, twilio_sid, status, created_at)
    VALUES (?, ?, 'outbound', ?, ?, ?, ?, 'sent', datetime('now'))`)
    .bind(crypto.randomUUID(), user.sub, from.phone_number, to, msgBody, result.sid)
    .run()

  return c.json({ success: true, sid: result.sid })
})

// ──────────────────────────────────────────────────────────────
// ROUTING TABLE
// ──────────────────────────────────────────────────────────────
app.get('/pbx/routes', async (c) => {
  const user = await requirePro(c)
  if (user instanceof Response) return user
  const { results } = await c.env.DB.prepare(
    'SELECT * FROM pbx_routes WHERE user_id=?').bind(user.sub).all()
  return c.json({ routes: results })
})

app.post('/pbx/routes', async (c) => {
  const user = await requirePro(c)
  if (user instanceof Response) return user
  const { label, forward_to, description = '' } =
    await c.req.json<{ label: string; forward_to: string; description?: string }>()
  if (!label || !forward_to) return c.json({ error: 'label and forward_to required' }, 400)
  await c.env.DB.prepare(`
    INSERT OR REPLACE INTO pbx_routes (id, user_id, label, forward_to, description, created_at)
    VALUES (?, ?, ?, ?, ?, datetime('now'))`)
    .bind(crypto.randomUUID(), user.sub, label, forward_to, description)
    .run()
  return c.json({ success: true })
})

export default app

