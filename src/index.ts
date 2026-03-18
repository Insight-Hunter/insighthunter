import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { logger } from 'hono/logger'
import { secureHeaders } from 'hono/secure-headers'
import { timing } from 'hono/timing'

// Route modules
import { authRoutes }        from './routes/auth'
import { bookkeepingRoutes } from './routes/bookkeeping'
import { payrollRoutes }     from './routes/payroll'
import { pbxRoutes }         from './routes/pbx'
import { bizformaRoutes }    from './routes/bizforma'
import { reportsRoutes }     from './routes/reports'
import { aiRoutes }          from './routes/ai'
import { cronHandler }       from './cron'
import { queueHandler }      from './queue'

// Durable Object exports (required at module top-level)
export { PBXRoom }   from './durable/PBXRoom'
export { AISession } from './durable/AISession'

export type Env = {
  // D1
  DB: D1Database
  // KV
  SESSIONS: KVNamespace
  CONFIG:   KVNamespace
  // R2
  DOCUMENTS: R2Bucket
  EXPORTS:   R2Bucket
  // Queues
  EMAIL_QUEUE:   Queue
  PAYROLL_QUEUE: Queue
  EXPORT_QUEUE:  Queue
  // Durable Objects
  PBX_ROOM:   DurableObjectNamespace
  AI_SESSION: DurableObjectNamespace
  // Workers AI
  AI: Ai
  // Analytics Engine
  ANALYTICS: AnalyticsEngineDataset
  // Vectorize
  VECTORS: VectorizeIndex
  // Static Assets
  ASSETS: Fetcher
  // Vars
  ENVIRONMENT:         string
  APP_URL:             string
  ALLOWED_ORIGINS:     string
  SESSION_TTL_SECONDS: string
  AI_MODEL:            string
  PLAN_FREE_TX_LIMIT:  string
  // Secrets
  JWT_SECRET:            string
  TWILIO_ACCOUNT_SID:    string
  TWILIO_AUTH_TOKEN:     string
  TWILIO_PHONE_NUMBER:   string
  RESEND_API_KEY:        string
  STRIPE_SECRET_KEY:     string
  STRIPE_WEBHOOK_SECRET: string
  ENCRYPTION_KEY:        string
  GOOGLE_CLIENT_ID:      string
  GOOGLE_CLIENT_SECRET:  string
}

const app = new Hono<{ Bindings: Env }>()

// ── Global middleware ────────────────────────────────────────
app.use('*', timing())
app.use('*', logger())
app.use('*', secureHeaders())
app.use('*', cors({
  origin: (origin, c) => {
    const allowed = c.env.ALLOWED_ORIGINS.split(',')
    return allowed.includes(origin) ? origin : allowed[0]
  },
  allowMethods:  ['GET','POST','PUT','PATCH','DELETE','OPTIONS'],
  allowHeaders:  ['Content-Type','Authorization','X-Request-ID'],
  exposeHeaders: ['X-Request-ID'],
  credentials:   true,
  maxAge:        86400,
}))

// ── Health ───────────────────────────────────────────────────
app.get('/health', c => c.json({
  status: 'ok',
  env:    c.env.ENVIRONMENT,
  ts:     new Date().toISOString(),
}))

// ── API routes ───────────────────────────────────────────────
// app.route('/api/auth',        authRoutes)
// app.route('/api/bookkeeping', bookkeepingRoutes)
// app.route('/api/payroll',     payrollRoutes)
// app.route('/api/pbx',         pbxRoutes)
// app.route('/api/bizforma',    bizformaRoutes)
// app.route('/api/reports',     reportsRoutes)
// app.route('/api/ai',          aiRoutes)

// ── Stripe webhook (raw body required) ───────────────────────
app.post('/api/webhooks/stripe', async c => {
  const sig  = c.req.header('stripe-signature') ?? ''
  const body = await c.req.text()
  // TODO: verify sig with STRIPE_WEBHOOK_SECRET
  const event = JSON.parse(body)
  if (event.type === 'checkout.session.completed') {
    const meta = event.data.object.metadata
    await c.env.DB.prepare(
      'UPDATE users SET plan=?, plan_updated_at=? WHERE id=?'
    ).bind(meta.plan, new Date().toISOString(), meta.user_id).run()
    c.env.ANALYTICS.writeDataPoint({ blobs:['stripe_upgrade'], doubles:[1], indexes:[meta.plan] })
  }
  return c.json({ received: true })
})

// ── Twilio webhook (PBX inbound) ──────────────────────────────
app.post('/api/webhooks/twilio', async c => {
  const body   = await c.req.parseBody()
  const callSid = body['CallSid'] as string
  const from    = body['From']    as string
  const to      = body['To']      as string
  const type    = body['MessageSid'] ? 'sms' : 'call'
  // Log inbound event to D1 + Analytics
  await c.env.DB.prepare(
    `INSERT INTO pbx_calls (sid,from_number,to_number,type,direction,created_at)
     VALUES (?,?,?,?,'inbound',?)`
  ).bind(callSid, from, to, type, new Date().toISOString()).run()
  c.env.ANALYTICS.writeDataPoint({ blobs:['pbx_inbound', type], doubles:[1], indexes:[to] })
  // TwiML response — answer + forward or voicemail
  return new Response(
    `<?xml version="1.0"?><Response><Say>Thank you for calling. Please hold.</Say><Dial><Number>${to}</Number></Dial></Response>`,
    { headers: { 'Content-Type': 'text/xml' } }
  )
})

// ── SPA fallback → static assets ─────────────────────────────
app.get('*', async c => {
  return c.env.ASSETS.fetch(c.req.raw)
})

// ── Cron + Queue handlers ─────────────────────────────────────
export default {
  fetch:    app.fetch,
  scheduled: cronHandler,
  queue:     queueHandler,
} satisfies ExportedHandler<Env>
