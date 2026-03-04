// apps/insighthunter-auth/src/index.ts
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import Stripe from 'stripe';
import type { Plan } from '@insighthunter/types';
import { PLAN_LIMITS, PLAN_RANK } from '@insighthunter/types';

// ─── Env ──────────────────────────────────────────────────────────────────────

interface Env {
  DB: D1Database;
  SESSIONS: KVNamespace;
  EVENTS: AnalyticsEngineDataset;
  STRIPE_SECRET_KEY: string;
  STRIPE_WEBHOOK_SECRET: string;
  STRIPE_PRICE_STANDARD: string;
  STRIPE_PRICE_PRO: string;
  APP_URL: string;
}

// ─── App ──────────────────────────────────────────────────────────────────────

type Vars = { userId: string; plan: Plan };
const app = new Hono<{ Bindings: Env; Variables: Vars }>();

app.use('*', cors({
  origin: ['https://insighthunter.app', 'https://bookkeeping.insighthunter.app', 'http://localhost:4321'],
  allowHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
}));

// ─── Auth Helpers ─────────────────────────────────────────────────────────────

async function hashPassword(password: string, saltHex?: string) {
  const enc = new TextEncoder();
  const salt = saltHex
    ? Uint8Array.from(saltHex.match(/.{2}/g)!.map((b) => parseInt(b, 16)))
    : crypto.getRandomValues(new Uint8Array(16));
  const key = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveBits']);
  const buf = await crypto.subtle.deriveBits({ name: 'PBKDF2', salt, iterations: 100_000, hash: 'SHA-256' }, key, 256);
  const hex = (b: ArrayBuffer | Uint8Array) =>
    Array.from(b instanceof Uint8Array ? b : new Uint8Array(b)).map((x) => x.toString(16).padStart(2, '0')).join('');
  return { hash: hex(buf), salt: hex(salt) };
}

async function requireAuth(c: any, next: any) {
  const token = c.req.header('Authorization')?.slice(7);
  if (!token) return c.json({ error: 'Unauthorized' }, 401);
  const session = await c.env.SESSIONS.get(`session:${token}`);
  if (!session) return c.json({ error: 'Session expired' }, 401);
  const { userId, plan } = JSON.parse(session);
  c.set('userId', userId);
  c.set('plan', plan as Plan);
  await next();
}

function requirePlan(min: Plan) {
  return async (c: any, next: any) => {
    const plan = c.get('plan') as Plan;
    if (PLAN_RANK[plan] < PLAN_RANK[min]) {
      return c.json({
        error: 'Upgrade required',
        requires: min,
        current: plan,
        upgrade_url: `${c.env.APP_URL}/pricing`,
      }, 402);
    }
    await next();
  };
}

// ─── Auth Routes ──────────────────────────────────────────────────────────────

app.post('/auth/signup', async (c) => {
  const { email, password, name } = await c.req.json<{ email: string; password: string; name: string }>();
  if (!email || !password || !name) return c.json({ error: 'All fields required' }, 400);
  if (password.length < 8) return c.json({ error: 'Password min 8 characters' }, 400);

  const existing = await c.env.DB.prepare('SELECT id FROM users WHERE email = ?').bind(email.toLowerCase()).first();
  if (existing) return c.json({ error: 'Email already registered' }, 409);

  const { hash, salt } = await hashPassword(password);
  const id = crypto.randomUUID();
  await c.env.DB.prepare(
    `INSERT INTO users (id, email, name, password_hash, salt, plan, subscription_status)
     VALUES (?, ?, ?, ?, ?, 'lite', 'active')`
  ).bind(id, email.toLowerCase(), name, hash, salt).run();

  const token = crypto.randomUUID();
  await c.env.SESSIONS.put(`session:${token}`, JSON.stringify({ userId: id, plan: 'lite' }), { expirationTtl: 2_592_000 });

  c.env.EVENTS.writeDataPoint({ blobs: ['signup', 'lite'], doubles: [1], indexes: [id] });
  return c.json({ token, user: { id, email: email.toLowerCase(), name, plan: 'lite' } }, 201);
});

app.post('/auth/login', async (c) => {
  const { email, password } = await c.req.json<{ email: string; password: string }>();
  const user = await c.env.DB.prepare('SELECT * FROM users WHERE email = ?').bind(email.toLowerCase()).first<any>();
  if (!user) return c.json({ error: 'Invalid credentials' }, 401);
  const { hash } = await hashPassword(password, user.salt);
  if (hash !== user.password_hash) return c.json({ error: 'Invalid credentials' }, 401);

  const token = crypto.randomUUID();
  await c.env.SESSIONS.put(`session:${token}`, JSON.stringify({ userId: user.id, plan: user.plan }), { expirationTtl: 2_592_000 });
  c.env.EVENTS.writeDataPoint({ blobs: ['login', user.plan], doubles: [1], indexes: [user.id] });

  return c.json({ token, user: { id: user.id, email: user.email, name: user.name, plan: user.plan } });
});

app.post('/auth/logout', requireAuth, async (c) => {
  const token = c.req.header('Authorization')!.slice(7);
  await c.env.SESSIONS.delete(`session:${token}`);
  return c.json({ success: true });
});

app.get('/auth/me', requireAuth, async (c) => {
  const user = await c.env.DB.prepare('SELECT * FROM users WHERE id = ?').bind(c.get('userId')).first<any>();
  if (!user) return c.json({ error: 'Not found' }, 404);
  const limits = PLAN_LIMITS[user.plan as Plan];
  const { count } = await c.env.DB
    .prepare('SELECT COUNT(*) as count FROM clients WHERE user_id = ?')
    .bind(user.id).first<{ count: number }>() ?? { count: 0 };

  return c.json({
    id: user.id, email: user.email, name: user.name,
    plan: user.plan, subscriptionStatus: user.subscription_status,
    limits, clientsUsed: count,
    clientsRemaining: limits.clients === Infinity ? null : limits.clients - count,
    onboardingComplete: !!user.onboarding_complete,
  });
});

// ─── Billing Routes ───────────────────────────────────────────────────────────

app.post('/billing/checkout', requireAuth, async (c) => {
  const { plan } = await c.req.json<{ plan: 'standard' | 'pro' }>();
  if (!['standard', 'pro'].includes(plan)) return c.json({ error: 'Invalid plan' }, 400);

  const user = await c.env.DB.prepare('SELECT * FROM users WHERE id = ?').bind(c.get('userId')).first<any>();
  const stripe = new Stripe(c.env.STRIPE_SECRET_KEY, { apiVersion: '2024-12-18.acacia' });

  // Create Stripe customer on first upgrade
  let customerId = user.stripe_customer_id;
  if (!customerId) {
    const customer = await stripe.customers.create({ email: user.email, name: user.name, meta { userId: user.id } });
    customerId = customer.id;
    await c.env.DB.prepare('UPDATE users SET stripe_customer_id = ? WHERE id = ?').bind(customerId, user.id).run();
  }

  const priceId = plan === 'standard' ? c.env.STRIPE_PRICE_STANDARD : c.env.STRIPE_PRICE_PRO;
  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    payment_method_types: ['card'],
    line_items: [{ price: priceId, quantity: 1 }],
    mode: 'subscription',
    success_url: `${c.env.APP_URL}/dashboard?upgrade=success&plan=${plan}`,
    cancel_url: `${c.env.APP_URL}/pricing`,
    meta { userId: user.id, plan },
    subscription_ { meta { userId: user.id, plan } },
  });

  c.env.EVENTS.writeDataPoint({ blobs: ['checkout_started', plan], doubles: [1], indexes: [user.id] });
  return c.json({ url: session.url });
});

app.post('/billing/portal', requireAuth, async (c) => {
  const user = await c.env.DB.prepare('SELECT stripe_customer_id FROM users WHERE id = ?').bind(c.get('userId')).first<any>();
  if (!user?.stripe_customer_id) return c.json({ error: 'No billing account found' }, 400);

  const stripe = new Stripe(c.env.STRIPE_SECRET_KEY, { apiVersion: '2024-12-18.acacia' });
  const portal = await stripe.billingPortal.sessions.create({
    customer: user.stripe_customer_id,
    return_url: `${c.env.APP_URL}/account/billing`,
  });
  return c.json({ url: portal.url });
});

// Stripe webhook — source of truth for all plan state changes
app.post('/billing/webhook', async (c) => {
  const sig = c.req.header('stripe-signature');
  if (!sig) return c.json({ error: 'Missing signature' }, 400);

  const stripe = new Stripe(c.env.STRIPE_SECRET_KEY, { apiVersion: '2024-12-18.acacia' });
  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(await c.req.text(), sig, c.env.STRIPE_WEBHOOK_SECRET);
  } catch {
    return c.json({ error: 'Invalid signature' }, 400);
  }

  switch (event.type) {
    case 'checkout.session.completed': {
      const s = event.data.object as Stripe.Checkout.Session;
      const { userId, plan } = s.metadata ?? {};
      if (userId && plan) {
        await c.env.DB.prepare(
          `UPDATE users SET plan = ?, subscription_status = 'active', stripe_subscription_id = ? WHERE id = ?`
        ).bind(plan, s.subscription, userId).run();
        // Invalidate all sessions so next request re-reads new plan
        await c.env.SESSIONS.put(`plan_update:${userId}`, plan, { expirationTtl: 300 });
        c.env.EVENTS.writeDataPoint({ blobs: ['subscription_activated', plan], doubles: [1], indexes: [userId] });
      }
      break;
    }
    case 'customer.subscription.updated': {
      const sub = event.data.object as Stripe.Subscription;
      const { userId, plan } = sub.metadata ?? {};
      if (userId && plan) {
        await c.env.DB.prepare(
          `UPDATE users SET plan = ?, subscription_status = ? WHERE stripe_subscription_id = ?`
        ).bind(plan, sub.status, sub.id).run();
      }
      break;
    }
    case 'customer.subscription.deleted': {
      const sub = event.data.object as Stripe.Subscription;
      await c.env.DB.prepare(
        `UPDATE users SET plan = 'lite', subscription_status = 'cancelled', stripe_subscription_id = NULL WHERE stripe_subscription_id = ?`
      ).bind(sub.id).run();
      break;
    }
    case 'invoice.payment_failed': {
      const inv = event.data.object as Stripe.Invoice;
      const cid = typeof inv.customer === 'string' ? inv.customer : inv.customer?.id;
      if (cid) await c.env.DB.prepare(`UPDATE users SET subscription_status = 'past_due' WHERE stripe_customer_id = ?`).bind(cid).run();
      break;
    }
    case 'invoice.payment_succeeded': {
      const inv = event.data.object as Stripe.Invoice;
      const cid = typeof inv.customer === 'string' ? inv.customer : inv.customer?.id;
      if (cid) await c.env.DB.prepare(`UPDATE users SET subscription_status = 'active' WHERE stripe_customer_id = ?`).bind(cid).run();
      break;
    }
  }
  return c.json({ received: true });
});

// ─── Plan Enforcement (called by other Workers via Service Binding) ────────────

app.get('/internal/plan/:userId', async (c) => {
  // Called by bookkeeping + lite workers via service binding — not public
  const userId = c.req.param('userId');
  const user = await c.env.DB.prepare('SELECT plan, subscription_status FROM users WHERE id = ?').bind(userId).first<any>();
  if (!user) return c.json({ error: 'User not found' }, 404);
  return c.json({ plan: user.plan, status: user.subscription_status, limits: PLAN_LIMITS[user.plan as Plan] });
});

app.get('/health', (c) => c.json({ status: 'ok', service: 'insighthunter-auth' }));

export default app;
