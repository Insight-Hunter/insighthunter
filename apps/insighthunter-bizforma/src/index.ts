// apps/insighthunter-bizforma/src/index.ts
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { getCookie } from 'hono/cookie'

export interface Env {
  DB:                  D1Database
  STRIPE_SECRET_KEY:   string   // sk_live_... or sk_test_...
  STRIPE_WEBHOOK_SECRET: string // whsec_...
  JWT_SECRET:          string
  APP_URL:             string   // https://insighthunter.app
}

// ── State filing fees (passed through at cost) ────────────────
const STATE_FEES: Record<string, number> = {
  AL:50,AK:250,AZ:50,AR:45,CA:70,CO:50,CT:120,DE:90,FL:125,GA:100,
  HI:50,ID:100,IL:150,IN:95,IA:50,KS:160,KY:40,LA:100,ME:175,MD:100,
  MA:500,MI:50,MN:155,MS:50,MO:50,MT:35,NE:105,NV:75,NH:100,NJ:125,
  NM:50,NY:200,NC:125,ND:135,OH:99,OK:100,OR:100,PA:125,RI:150,SC:110,
  SD:150,TN:300,TX:300,UT:54,VT:125,VA:100,WA:200,WV:100,WI:130,WY:100,
}
const SERVICE_FEE = 14900 // $149.00 in cents

// ── JWT verify (mirrors auth worker) ─────────────────────────
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
    const payload = JSON.parse(atob(parts[1].replace(/-/g,'+').replace(/_/g,'/')))
    if (payload.exp < Math.floor(Date.now()/1000)) return null
    return payload as { sub: string; email: string; plan: string }
  } catch { return null }
}

async function requireAuth(c: any) {
  const token = getCookie(c, 'ih_token') ?? c.req.header('Authorization')?.replace('Bearer ','')
  if (!token) return c.json({ error: 'Unauthenticated' }, 401)
  const user = await verifyJWT(token, c.env.JWT_SECRET)
  if (!user) return c.json({ error: 'Invalid or expired session.' }, 401)
  return user
}

// ── Stripe helper: POST to Stripe API ────────────────────────
async function stripe(env: Env, path: string, body: Record<string, unknown>) {
  const encoded = Object.entries(body)
    .flatMap(([k, v]) => Array.isArray(v)
      ? v.map((item, i) => [`${k}[${i}]`, String(item)])
      : [[k, String(v)]])
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
    .join('&')

  const res = await fetch(`https://api.stripe.com/v1/${path}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.STRIPE_SECRET_KEY}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: encoded,
  })
  return res.json() as Promise<any>
}

// ── Stripe webhook signature verification ────────────────────
async function verifyStripeSignature(
  payload: string, header: string, secret: string
): Promise<boolean> {
  try {
    const parts   = Object.fromEntries(header.split(',').map(p => p.split('=')))
    const ts      = parts['t']
    const sig     = parts['v1']
    const signed  = `${ts}.${payload}`
    const enc     = new TextEncoder()
    const key     = await crypto.subtle.importKey('raw', enc.encode(secret),
      { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
    const mac     = await crypto.subtle.sign('HMAC', key, enc.encode(signed))
    const expected = Array.from(new Uint8Array(mac))
      .map(b => b.toString(16).padStart(2,'0')).join('')
    // Replay window: 5 minutes
    if (Math.abs(Date.now()/1000 - parseInt(ts)) > 300) return false
    return expected === sig
  } catch { return false }
}

// ── Plan upgrade: set standard for 6 months ──────────────────
async function upgradePlanFromBizForma(db: D1Database, userId: string) {
  const expires = new Date()
  expires.setMonth(expires.getMonth() + 6)
  await db.prepare(`
    UPDATE users
    SET plan          = 'standard',
        plan_expires  = ?,
        plan_source   = 'bizforma_promo',
        bizforma_paid = 1,
        updated_at    = datetime('now')
    WHERE id = ?`)
    .bind(expires.toISOString(), userId)
    .run()
}

const app = new Hono<{ Bindings: Env }>()

app.use('*', cors({
  origin: o => o?.includes('insighthunter.app') || o?.includes('localhost') ? o : null,
  credentials: true,
  allowMethods: ['GET','POST','OPTIONS'],
  allowHeaders: ['Content-Type','Authorization','Stripe-Signature'],
}))

// ── GET /bizforma/states — state fee lookup ───────────────────
app.get('/bizforma/states', (c) => {
  return c.json({ states: STATE_FEES, service_fee: SERVICE_FEE })
})

// ── POST /bizforma/checkout — create Stripe session ──────────
app.post('/bizforma/checkout', async (c) => {
  const user = await requireAuth(c)
  if (user instanceof Response) return user

  // Reject if already paid
  const existing = await c.env.DB.prepare(
    'SELECT bizforma_paid FROM users WHERE id=?')
    .bind(user.sub).first<{ bizforma_paid: number }>()
  if (existing?.bizforma_paid) {
    return c.json({ error: 'BizForma already purchased on this account.' }, 409)
  }

  const { entity_type = 'LLC', state = 'GA', business_name = 'My Business' } =
    await c.req.json<{ entity_type?: string; state?: string; business_name?: string }>()

  const stateFee = (STATE_FEES[state.toUpperCase()] ?? 100) * 100 // to cents
  const totalCents = SERVICE_FEE + stateFee

  const session = await stripe(c.env, 'checkout/sessions', {
    mode:                         'payment',
    'payment_method_types[0]':    'card',
    'line_items[0][price_data][currency]':                    'usd',
    'line_items[0][price_data][product_data][name]':          `BizForma — ${entity_type} Formation`,
    'line_items[0][price_data][product_data][description]':   `${business_name} · ${state} · Includes 6 months Insight Standard ($474 value)`,
    'line_items[0][price_data][unit_amount]':                 String(SERVICE_FEE),
    'line_items[0][quantity]':                                '1',
    'line_items[1][price_data][currency]':                    'usd',
    'line_items[1][price_data][product_data][name]':          `${state} State Filing Fee`,
    'line_items[1][price_data][product_data][description]':   `Passed through at cost — ${state} Secretary of State`,
    'line_items[1][price_data][unit_amount]':                 String(stateFee),
    'line_items[1][quantity]':                                '1',
    success_url: `${c.env.APP_URL}/bizforma-success.html?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url:  `${c.env.APP_URL}/features/bizforma.html?cancelled=1`,
    customer_email: user.email,
    'metadata[user_id]':       user.sub,
    'metadata[entity_type]':   entity_type,
    'metadata[state]':         state,
    'metadata[business_name]': business_name,
  })

  if (session.error) {
    console.error('Stripe error:', session.error)
    return c.json({ error: 'Failed to create checkout session.' }, 500)
  }

  // Log pending order in D1
  await c.env.DB.prepare(`
    INSERT OR REPLACE INTO formation_orders
      (id, user_id, stripe_session_id, entity_type, state, business_name, status, created_at)
    VALUES (?, ?, ?, ?, ?, ?, 'pending', datetime('now'))`)
    .bind(crypto.randomUUID(), user.sub, session.id,
      entity_type, state, business_name)
    .run()

  return c.json({ checkout_url: session.url, session_id: session.id })
})

// ── POST /bizforma/webhook — Stripe payment confirmed ─────────
app.post('/bizforma/webhook', async (c) => {
  const payload = await c.req.text()
  const sig     = c.req.header('Stripe-Signature') ?? ''

  const valid = await verifyStripeSignature(payload, sig, c.env.STRIPE_WEBHOOK_SECRET)
  if (!valid) return c.json({ error: 'Invalid signature' }, 400)

  const event = JSON.parse(payload)

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object
    const userId  = session.metadata?.user_id

    if (!userId) {
      console.error('Webhook missing user_id in metadata')
      return c.json({ received: true })
    }

    // Upgrade plan
    await upgradePlanFromBizForma(c.env.DB, userId)

    // Update order status
    await c.env.DB.prepare(`
      UPDATE formation_orders
      SET status = 'paid', stripe_payment_intent = ?, updated_at = datetime('now')
      WHERE stripe_session_id = ?`)
      .bind(session.payment_intent, session.id)
      .run()

    console.log(`BizForma paid — upgraded user ${userId} to Standard for 6 months`)
  }

  if (event.type === 'checkout.session.expired') {
    const session = event.data.object
    await c.env.DB.prepare(
      "UPDATE formation_orders SET status='expired' WHERE stripe_session_id=?")
      .bind(session.id).run()
  }

  return c.json({ received: true })
})

// ── GET /bizforma/order-status — poll from success page ──────
app.get('/bizforma/order-status', async (c) => {
  const user = await requireAuth(c)
  if (user instanceof Response) return user

  const order = await c.env.DB.prepare(`
    SELECT o.*, u.plan, u.plan_expires
    FROM formation_orders o
    JOIN users u ON u.id = o.user_id
    WHERE o.user_id = ? ORDER BY o.created_at DESC LIMIT 1`)
    .bind(user.sub).first<any>()

  return c.json({ order: order ?? null })
})

export default app
