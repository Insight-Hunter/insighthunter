import { Hono } from 'hono'
import type { Env } from '../index'
import { requireAuth } from '../middleware/auth'

export const pbxRoutes = new Hono<{ Bindings: Env }>()
pbxRoutes.use('*', requireAuth)

// ── Phone Numbers ─────────────────────────────────────────────

pbxRoutes.get('/numbers', async c => {
  const userId = c.get('userId') as string
  const rows = await c.env.DB.prepare(
    `SELECT * FROM pbx_numbers WHERE user_id=? ORDER BY created_at DESC`
  ).bind(userId).all()
  return c.json({ numbers: rows.results })
})

pbxRoutes.post('/numbers', async c => {
  const userId = c.get('userId') as string
  const plan   = c.get('userPlan') as string
  const body   = await c.req.json<any>()
  const { area_code, label } = body

  // Plan limits
  const count = await c.env.DB.prepare(
    `SELECT COUNT(*) as n FROM pbx_numbers WHERE user_id=? AND status='active'`
  ).bind(userId).first<{ n: number }>()
  const limit = plan === 'free' ? 0 : plan === 'starter' ? 1 : plan === 'pro' ? 3 : 10
  if ((count?.n ?? 0) >= limit)
    return c.json({ error: `Your ${plan} plan supports up to ${limit} phone numbers.` }, 403)

  // Provision via Twilio
  const twilioRes = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${c.env.TWILIO_ACCOUNT_SID}/IncomingPhoneNumbers.json`,
    {
      method: 'POST',
      headers: {
        'Authorization': 'Basic ' + btoa(`${c.env.TWILIO_ACCOUNT_SID}:${c.env.TWILIO_AUTH_TOKEN}`),
        'Content-Type':  'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        AreaCode:     area_code ?? '404',
        VoiceUrl:     `${c.env.APP_URL}/api/webhooks/twilio`,
        SmsUrl:       `${c.env.APP_URL}/api/webhooks/twilio`,
        FriendlyName: label ?? 'Insight Hunter PBX',
      }),
    }
  )

  if (!twilioRes.ok) {
    const err = await twilioRes.text()
    console.error('[PBX] Twilio error:', err)
    return c.json({ error: 'Failed to provision number. Check Twilio credentials.' }, 502)
  }

  const twData = await twilioRes.json() as any
  const id     = crypto.randomUUID()
  await c.env.DB.prepare(
    `INSERT INTO pbx_numbers (id,user_id,phone_number,sid,status,label,created_at)
     VALUES (?,?,?,?,'active',?,?)`
  ).bind(id, userId, twData.phone_number, twData.sid, label ?? null, new Date().toISOString()).run()

  c.env.ANALYTICS.writeDataPoint({ blobs:['pbx_number_provisioned'], doubles:[1], indexes:[userId] })
  return c.json({ id, phone_number: twData.phone_number, sid: twData.sid }, 201)
})

pbxRoutes.delete('/numbers/:id', async c => {
  const userId = c.get('userId') as string
  const { id } = c.req.param()
  const num = await c.env.DB.prepare(
    `SELECT sid FROM pbx_numbers WHERE id=? AND user_id=?`
  ).bind(id, userId).first<any>()
  if (!num) return c.json({ error: 'Not found' }, 404)

  // Release from Twilio
  await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${c.env.TWILIO_ACCOUNT_SID}/IncomingPhoneNumbers/${num.sid}.json`,
    {
      method: 'DELETE',
      headers: { 'Authorization': 'Basic ' + btoa(`${c.env.TWILIO_ACCOUNT_SID}:${c.env.TWILIO_AUTH_TOKEN}`) },
    }
  )
  await c.env.DB.prepare(`UPDATE pbx_numbers SET status='released' WHERE id=?`).bind(id).run()
  return c.json({ ok: true })
})

// ── Calls ─────────────────────────────────────────────────────

pbxRoutes.get('/calls', async c => {
  const userId = c.get('userId') as string
  const { limit = '50', offset = '0', direction, from, to } = c.req.query()

  let sql = `SELECT * FROM pbx_calls WHERE user_id=? AND type='call'`
  const params: any[] = [userId]
  if (direction) { sql += ' AND direction=?'; params.push(direction) }
  if (from)      { sql += ' AND DATE(created_at)>=?'; params.push(from) }
  if (to)        { sql += ' AND DATE(created_at)<=?'; params.push(to) }

  const rows = await c.env.DB.prepare(
    sql + ' ORDER BY created_at DESC LIMIT ? OFFSET ?'
  ).bind(...params, +limit, +offset).all()
  return c.json({ calls: rows.results })
})

pbxRoutes.patch('/calls/:id', async c => {
  const userId = c.get('userId') as string
  const { id } = c.req.param()
  const { notes } = await c.req.json<any>()
  await c.env.DB.prepare(
    `UPDATE pbx_calls SET notes=? WHERE id=? AND user_id=?`
  ).bind(notes, id, userId).run()
  return c.json({ ok: true })
})

// ── Voicemails ────────────────────────────────────────────────

pbxRoutes.get('/voicemails', async c => {
  const userId = c.get('userId') as string
  const rows = await c.env.DB.prepare(
    `SELECT * FROM pbx_voicemails WHERE user_id=? ORDER BY created_at DESC`
  ).bind(userId).all()
  return c.json({ voicemails: rows.results })
})

pbxRoutes.patch('/voicemails/:id/listen', async c => {
  const userId = c.get('userId') as string
  const { id } = c.req.param()
  await c.env.DB.prepare(
    `UPDATE pbx_voicemails SET listened=1 WHERE id=? AND user_id=?`
  ).bind(id, userId).run()
  return c.json({ ok: true })
})

pbxRoutes.delete('/voicemails/:id', async c => {
  const userId = c.get('userId') as string
  const { id } = c.req.param()
  const vm = await c.env.DB.prepare(
    `SELECT recording_url FROM pbx_voicemails WHERE id=? AND user_id=?`
  ).bind(id, userId).first<any>()
  if (!vm) return c.json({ error: 'Not found' }, 404)
  // Remove recording from R2 if stored there
  const key = vm.recording_url?.split('/').pop()
  if (key) await c.env.DOCUMENTS.delete(`voicemails/${key}`)
  await c.env.DB.prepare(`DELETE FROM pbx_voicemails WHERE id=?`).bind(id).run()
  return c.json({ ok: true })
})

// ── SMS ───────────────────────────────────────────────────────

pbxRoutes.get('/sms', async c => {
  const userId = c.get('userId') as string
  const { limit = '50', contact } = c.req.query()
  let sql = `SELECT * FROM pbx_sms WHERE user_id=?`
  const params: any[] = [userId]
  if (contact) { sql += ' AND (from_number=? OR to_number=?)'; params.push(contact, contact) }
  const rows = await c.env.DB.prepare(
    sql + ' ORDER BY created_at DESC LIMIT ?'
  ).bind(...params, +limit).all()
  return c.json({ messages: rows.results })
})

pbxRoutes.post('/sms', async c => {
  const userId = c.get('userId') as string
  const body   = await c.req.json<any>()
  const { to, message } = body
  if (!to || !message) return c.json({ error: 'to and message required' }, 400)

  const numRow = await c.env.DB.prepare(
    `SELECT phone_number FROM pbx_numbers WHERE user_id=? AND status='active' LIMIT 1`
  ).bind(userId).first<any>()
  if (!numRow) return c.json({ error: 'No active phone number. Provision one first.' }, 422)

  // Send via Twilio
  const res = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${c.env.TWILIO_ACCOUNT_SID}/Messages.json`,
    {
      method: 'POST',
      headers: {
        'Authorization': 'Basic ' + btoa(`${c.env.TWILIO_ACCOUNT_SID}:${c.env.TWILIO_AUTH_TOKEN}`),
        'Content-Type':  'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({ To: to, From: numRow.phone_number, Body: message }),
    }
  )
  if (!res.ok) return c.json({ error: 'Failed to send SMS' }, 502)
  const data = await res.json() as any

  const id = crypto.randomUUID()
  await c.env.DB.prepare(`
    INSERT INTO pbx_sms (id,user_id,from_number,to_number,body,direction,read,created_at)
    VALUES (?,?,?,?,?,'outbound',1,?)
  `).bind(id, userId, numRow.phone_number, to, message, new Date().toISOString()).run()

  c.env.ANALYTICS.writeDataPoint({ blobs:['sms_sent'], doubles:[1], indexes:[userId] })
  return c.json({ id, sid: data.sid }, 201)
})

pbxRoutes.patch('/sms/:id/read', async c => {
  const userId = c.get('userId') as string
  const { id } = c.req.param()
  await c.env.DB.prepare(
    `UPDATE pbx_sms SET read=1 WHERE id=? AND user_id=?`
  ).bind(id, userId).run()
  return c.json({ ok: true })
})
