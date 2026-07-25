import { Hono } from 'hono'
import { cors } from 'hono/cors'
import Stripe from 'stripe'

type Bindings = {
  DB: D1Database
  STRIPE_SECRET_KEY: string
  STRIPE_WEBHOOK_SECRET: string
  APP_BASE_URL?: string
}

const app = new Hono<{ Bindings: Bindings }>()

app.use(
  '*',
  cors({
    origin: ['https://insighthunter.app', 'https://app.insighthunter.app'],
    allowMethods: ['GET', 'POST', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization', 'stripe-signature'],
    credentials: true,
  })
)

const PLAN_FEATURES: Record<string, string[]> = {
  starter: [
    'app.insight_hunter',
    'documents.vault',
    'compliance.calendar',
  ],
  growth: [
    'app.insight_hunter',
    'documents.vault',
    'compliance.calendar',
    'ai.advisor',
    'forms.lego',
    'dashboard.advanced',
  ],
  pro: [
    'app.insight_hunter',
    'documents.vault',
    'compliance.calendar',
    'ai.advisor',
    'forms.lego',
    'dashboard.advanced',
    'payroll.workspace',
  ],
}

function getStripe(env: Bindings) {
  return new Stripe(env.STRIPE_SECRET_KEY, {
    apiVersion: '2026-02-25.clover',
  })
}

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8' },
  })
}

function unixToIso(value?: number | null): string | null {
  return value ? new Date(value * 1000).toISOString() : null
}

function derivePlanCode(price: Stripe.Price | null | undefined): string | null {
  if (!price) return null
  if (price.metadata?.plan_code) return price.metadata.plan_code

  const key = price.lookup_key ?? ''
  if (key.includes('starter')) return 'starter'
  if (key.includes('growth')) return 'growth'
  if (key.includes('pro')) return 'pro'

  return null
}

function deriveApp(price: Stripe.Price | null | undefined): string {
  return price?.metadata?.app || 'insight_hunter'
}

async function ensureSchema(db: D1Database) {
  await db.batch([
    db.prepare('
      CREATE TABLE IF NOT EXISTS stripe_customers (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        org_id TEXT,
        user_id TEXT,
        stripe_organization_id TEXT NOT NULL UNIQUE,
        email TEXT,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    '),
    db.prepare('
      CREATE TABLE IF NOT EXISTS subscriptions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        org_id TEXT NOT NULL,
        app TEXT NOT NULL,
        stripe_organization_id TEXT NOT NULL,
        stripe_subscription_id TEXT NOT NULL UNIQUE,
        stripe_price_id TEXT,
        stripe_product_id TEXT,
        plan_code TEXT NOT NULL,
        status TEXT NOT NULL,
        current_period_start TEXT,
        current_period_end TEXT,
        cancel_at_period_end INTEGER NOT NULL DEFAULT 0,
        canceled_at TEXT,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    '),
    db.prepare('
      CREATE TABLE IF NOT EXISTS entitlements (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        org_id TEXT NOT NULL,
        app TEXT NOT NULL,
        feature_code TEXT NOT NULL,
        source_plan_code TEXT NOT NULL,
        active INTEGER NOT NULL DEFAULT 1,
        granted_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        revoked_at TEXT,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(org_id, app, feature_code)
      )
    '),
    db.prepare('
      CREATE TABLE IF NOT EXISTS webhook_events (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        provider TEXT NOT NULL,
        event_id TEXT NOT NULL UNIQUE,
        event_type TEXT NOT NULL,
        processed_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    '),
  ])
}

async function alreadyProcessed(db: D1Database, eventId: string) {
  const row = await db
    .prepare(
      'SELECT event_id FROM webhook_events WHERE provider = 'stripe' AND event_id = ?1 LIMIT 1'
    )
    .bind(eventId)
    .first()
  return !!row
}

async function markProcessed(db: D1Database, eventId: string, eventType: string) {
  await db
    .prepare('
      INSERT INTO webhook_events (provider, event_id, event_type)
      VALUES ('stripe', ?1, ?2)
      ON CONFLICT(event_id) DO NOTHING
    ')
    .bind(eventId, eventType)
    .run()
}

async function upsertCustomer(
  db: D1Database,
  stripeCustomerId: string,
  orgId: string,
  email?: string | null,
  userId?: string | null
) {
  await db
    .prepare('
      INSERT INTO stripe_customers (org_id, user_id, stripe_organization_id, email, updated_at)
      VALUES (?1, ?2, ?3, ?4, CURRENT_TIMESTAMP)
      ON CONFLICT(stripe_organization_id) DO UPDATE SET
        org_id = excluded.org_id,
        user_id = excluded.user_id,
        email = excluded.email,
        updated_at = CURRENT_TIMESTAMP
    ')
    .bind(orgId, userId ?? null, stripeCustomerId, email ?? null)
    .run()
}

async function replaceEntitlements(
  db: D1Database,
  orgId: string,
  appName: string,
  planCode: string,
  active: boolean
) {
  await db
    .prepare('
      UPDATE entitlements
      SET active = 0,
          revoked_at = CURRENT_TIMESTAMP,
          updated_at = CURRENT_TIMESTAMP
      WHERE org_id = ?1 AND app = ?2
    ')
    .bind(orgId, appName)
    .run()

  if (!active) return

  const features = PLAN_FEATURES[planCode] ?? []
  for (const featureCode of features) {
    await db
      .prepare('
        INSERT INTO entitlements (org_id, app, feature_code, source_plan_code, active, granted_at, revoked_at, updated_at)
        VALUES (?1, ?2, ?3, ?4, 1, CURRENT_TIMESTAMP, NULL, CURRENT_TIMESTAMP)
        ON CONFLICT(org_id, app, feature_code) DO UPDATE SET
          source_plan_code = excluded.source_plan_code,
          active = 1,
          revoked_at = NULL,
          updated_at = CURRENT_TIMESTAMP
      ')
      .bind(orgId, appName, featureCode, planCode)
      .run()
  }
}

async function upsertSubscriptionFromStripe(
  db: D1Database,
  subscription: Stripe.Subscription
) {
  const item = subscription.items.data[0]
  const price = item?.price ?? null
  const planCode = derivePlanCode(price)

  if (!planCode) {
    throw new Error('Could not derive plan_code for subscription ${subscription.id}')
  }

  const appName = deriveApp(price)
  const stripeCustomerId =
    typeof subscription.customer === 'string'
      ? subscription.customer
      : subscription.customer?.id

  if (!stripeCustomerId) {
    throw new Error('Missing stripe customer for subscription ${subscription.id}')
  }

  const meta = subscription.metadata ?? {}
  const orgId = meta.org_id || price?.metadata?.org_id || ''
  if (!orgId) {
    throw new Error('Missing org_id metadata for subscription ${subscription.id}')
  }

  await upsertCustomer(
    db,
    stripeCustomerId,
    orgId,
    typeof subscription.customer !== 'string' ? subscription.customer?.email ?? null : null,
    meta.user_id || null
  )

  await db
    .prepare('
      INSERT INTO subscriptions (
        org_id, app, stripe_organization_id, stripe_subscription_id, stripe_price_id, stripe_product_id,
        plan_code, status, current_period_start, current_period_end, cancel_at_period_end, canceled_at,
        updated_at
      )
      VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, CURRENT_TIMESTAMP)
      ON CONFLICT(stripe_subscription_id) DO UPDATE SET
        org_id = excluded.org_id,
        app = excluded.app,
        stripe_organization_id = excluded.stripe_organization_id,
        stripe_price_id = excluded.stripe_price_id,
        stripe_product_id = excluded.stripe_product_id,
        plan_code = excluded.plan_code,
        status = excluded.status,
        current_period_start = excluded.current_period_start,
        current_period_end = excluded.current_period_end,
        cancel_at_period_end = excluded.cancel_at_period_end,
        canceled_at = excluded.canceled_at,
        updated_at = CURRENT_TIMESTAMP
    ')
    .bind(
      orgId,
      appName,
      stripeCustomerId,
      subscription.id,
      price?.id ?? null,
      typeof price?.product === 'string' ? price.product : price?.product?.id ?? null,
      planCode,
      subscription.status,
      unixToIso(subscription.current_period_start),
      unixToIso(subscription.current_period_end),
      subscription.cancel_at_period_end ? 1 : 0,
      unixToIso(subscription.canceled_at)
    )
    .run()

  const activeStatuses = new Set(['trialing', 'active'])
  await replaceEntitlements(db, orgId, appName, planCode, activeStatuses.has(subscription.status))
}

async function deactivateSubscription(
  db: D1Database,
  subscription: Stripe.Subscription
) {
  const item = subscription.items.data[0]
  const price = item?.price ?? null
  const appName = deriveApp(price)
  const orgId = subscription.metadata?.org_id || price?.metadata?.org_id || ''

  if (!orgId) {
    throw new Error('Missing org_id metadata for canceled subscription ${subscription.id}')
  }

  await db
    .prepare('
      UPDATE subscriptions
      SET status = ?2,
          canceled_at = ?3,
          updated_at = CURRENT_TIMESTAMP
      WHERE stripe_subscription_id = ?1
    ')
    .bind(
      subscription.id,
      subscription.status,
      unixToIso(subscription.canceled_at) ?? new Date().toISOString()
    )
    .run()

  await replaceEntitlements(db, orgId, appName, derivePlanCode(price) || 'starter', false)
}

app.get('/', () =>
  json({
    ok: true,
    service: 'insighthunter-auth',
    routes: ['GET /health', 'GET /auth/session', 'POST /webhooks/stripe'],
  })
)

app.get('/health', () =>
  json({
    ok: true,
    service: 'insighthunter-auth',
    ts: new Date().toISOString(),
  })
)

app.get('/auth/session', () =>
  json({
    ok: true,
    authenticated: false,
    note: 'Hook this into your existing Cloudflare Access session logic.',
  })
)

app.post('/webhooks/stripe', async (c) => {
  await ensureSchema(c.env.DB)

  const sig = c.req.header('stripe-signature')
  if (!sig) {
    return json({ ok: false, error: 'Missing stripe-signature header' }, 400)
  }

  const rawBody = await c.req.text()
  const stripe = getStripe(c.env)

  let event: Stripe.Event
  try {
    event = await stripe.webhooks.constructEventAsync(
      rawBody,
      sig,
      c.env.STRIPE_WEBHOOK_SECRET
    )
  } catch (err) {
    return json(
      {
        ok: false,
        error: 'Invalid Stripe signature',
        detail: err instanceof Error ? err.message : 'Unknown error',
      },
      400
    )
  }

  if (await alreadyProcessed(c.env.DB, event.id)) {
    return json({ ok: true, duplicate: true, eventId: event.id, type: event.type })
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session
        if (session.mode === 'subscription' && typeof session.subscription === 'string') {
          const subscription = await stripe.subscriptions.retrieve(session.subscription, {
            expand: ['items.data.price', 'customer'],
          })
          await upsertSubscriptionFromStripe(c.env.DB, subscription)
        }
        break
      }

      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription
        await upsertSubscriptionFromStripe(c.env.DB, subscription)
        break
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription
        await deactivateSubscription(c.env.DB, subscription)
        break
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice
        const subscriptionId =
          typeof invoice.subscription === 'string'
            ? invoice.subscription
            : invoice.subscription?.id

        if (subscriptionId) {
          await c.env.DB
            .prepare('
              UPDATE subscriptions
              SET status = 'past_due',
                  updated_at = CURRENT_TIMESTAMP
              WHERE stripe_subscription_id = ?1
            ')
            .bind(subscriptionId)
            .run()
        }
        break
      }

      default:
        break
    }

    await markProcessed(c.env.DB, event.id, event.type)

    return json({
      ok: true,
      processed: true,
      eventId: event.id,
      type: event.type,
    })
  } catch (err) {
    return json(
      {
        ok: false,
        error: 'Webhook processing failed',
        detail: err instanceof Error ? err.message : 'Unknown error',
        eventId: event.id,
        type: event.type,
      },
      500
    )
  }
})

export default app
