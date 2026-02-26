// index.ts
import Stripe from 'stripe';
import { createHmac } from 'node:crypto';
import bcrypt from 'bcryptjs'; // npm i bcryptjs stripe

interface User {
  id: string;
  email: string;
  password_hash: string;
  role: string;
  stripe_customer_id?: string;
  subscription_status?: 'active' | 'trialing' | 'past_due' | 'canceled';
  created_at: string;
}

interface Env {
  D1_DB: D1Database;
  TURNSTILE_SECRET: string;
  STRIPE_SECRET_KEY: string;
  STRIPE_WEBHOOK_SECRET: string;
  JWT_SECRET: string;
  STRIPE_PUBLISHABLE_KEY: string; // For client-side
  RATE_LIMIT_KV: KVNamespace;
}

const stripe = (env: Env) => new Stripe(env.STRIPE_SECRET_KEY, {
  apiVersion: '2024-10-22.beta',
  httpAgent: undefined as any,
});

async function verifyTurnstile(token: string, env: Env): Promise<boolean> {
    const response = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
            secret: env.TURNSTILE_SECRET,
            response: token,
        }),
    });
    const data: { success: boolean } = await response.json();
    return data.success;
}

// Secure password hashing
const hashPassword = async (password: string): Promise<string> => {
  return bcrypt.hash(password, 12);
};

const verifyPassword = async (password: string, hash: string): Promise<boolean> => {
  return bcrypt.compare(password, hash);
};

// JWT helpers (HS256)
const generateJWT = async (payload: { userId: string } & Record<string, any>, env: Env): Promise<string> => {
  const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const encodedPayload = btoa(JSON.stringify(payload));
  const signatureBytes = await crypto.subtle.sign(
    'HMAC',
    await crypto.subtle.importKey('raw', new TextEncoder().encode(env.JWT_SECRET), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']),
    new TextEncoder().encode(`${header}.${encodedPayload}`)
  );
  const signature = btoa(String.fromCharCode(...new Uint8Array(signatureBytes)));
  return `${header}.${encodedPayload}.${signature}`;
};

const verifyJWT = async (token: string, env: Env): Promise<{ userId: string } | null> => {
  try {
    const [header, payload, signature] = token.split('.');
    const expectedSignatureBytes = await crypto.subtle.sign(
      'HMAC',
      await crypto.subtle.importKey('raw', new TextEncoder().encode(env.JWT_SECRET), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']),
      new TextEncoder().encode(`${header}.${payload}`)
    );
    const expectedSignature = btoa(String.fromCharCode(...new Uint8Array(expectedSignatureBytes)));
    if (signature !== expectedSignature) return null;
    return JSON.parse(atob(payload));
  } catch {
    return null;
  }
};

// Rate limiting (simple IP-based)
const RATE_LIMIT_KV_KEY = 'rate:signup';
const getRateLimit = async (ip: string, kv?: KVNamespace): Promise<boolean> => {
  if (!kv) return true;
  const key = `${RATE_LIMIT_KV_KEY}:${ip}`;
  const count = (await kv.get(key, { type: 'json' }) as number[]) || [];
  if (count.length >= 5) return false; // 5/min
  count.push(Date.now());
  await kv.put(key, JSON.stringify(count.filter(t => t > Date.now() - 60000)));
  return true;
};

// Auth middleware
const withAuth = async (request: Request, env: Env): Promise<User | null> => {
  const cookie = request.headers.get('Cookie')?.match(/auth_jwt=([^;]+)/)?.[1];
  if (!cookie) return null;
  const payload = await verifyJWT(cookie, env);
  if (!payload?.userId) return null;
  
  const { results } = await env.D1_DB.prepare('SELECT * FROM users WHERE id = ?')
    .bind(payload.userId).all();
  return results[0] as User;
};

// CORS headers for responses
const corsHeaders = {
    'Access-Control-Allow-Origin': 'https://insighthunter.io',
    'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Credentials': 'true',
};

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const clientIP = request.headers.get('CF-Connecting-IP') || 'unknown';

    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }
    
    // GET /api/config - Provides public keys to the client
    if (request.method === 'GET' && url.pathname === '/api/config') {
        const data = {
            stripePublishableKey: env.STRIPE_PUBLISHABLE_KEY,
        };
        return new Response(JSON.stringify(data), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }

    if (request.method === 'POST' && url.pathname === '/api/signup') {
      if (!(await getRateLimit(clientIP, env.RATE_LIMIT_KV))) {
        return new Response('Too many requests', { status: 429, headers: { 'Retry-After': '60' } });
      }

      try {
        const formData = await request.formData();
        const email = (formData.get('email') as string)?.trim().toLowerCase();
        const password = formData.get('password') as string;
        const role = formData.get('role') as string;
        const turnstileToken = formData.get('cf-turnstile-response') as string;

        if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
          return new Response('Invalid email', { status: 400, headers: corsHeaders });
        }
        if (password?.length < 12) {
          return new Response('Password too short', { status: 400, headers: corsHeaders });
        }
        if (!['owner', 'accountant', 'fractional_cfo', 'other'].includes(role)) {
          return new Response('Invalid role', { status: 400, headers: corsHeaders });
        }
        if (!await verifyTurnstile(turnstileToken, env)) {
          return new Response('Bot detected', { status: 400, headers: corsHeaders });
        }

        const existing = await env.D1_DB.prepare('SELECT id FROM users WHERE email = ?')
          .bind(email).first();
        if (existing) return new Response('Email already exists', { status: 409, headers: corsHeaders });

        const passwordHash = await hashPassword(password);
        const { results } = await env.D1_DB.prepare(`
          INSERT INTO users (email, password_hash, role, created_at) 
          VALUES (?, ?, ?, ?) RETURNING id
        `).bind(email, passwordHash, role, new Date().toISOString()).run();

        const userId = (results?.[0] as any)?.id;
        if (!userId) throw new Error('User creation failed');

        const jwt = await generateJWT({ userId }, env);
        const headers = new Headers(corsHeaders);
        headers.set('Set-Cookie', `auth_jwt=${jwt}; HttpOnly; Secure; SameSite=Strict; Max-Age=2592000; Path=/`);
        headers.set('Location', 'https://insighthunter.io/shopping.html');
        return new Response(null, { status: 302, headers });

      } catch (error) {
        console.error('Signup error:', error);
        return new Response('Internal error', { status: 500, headers: corsHeaders });
      }
    }

    if (request.method === 'POST' && url.pathname === '/api/create-checkout') {
      const user = await withAuth(request, env);
      if (!user) return new Response('Unauthorized', { status: 401, headers: corsHeaders });

      try {
        const formData = await request.formData();
        const plan = formData.get('plan') as string;
        const addons = formData.getAll('addons[]') as string[];

        const basePrices = { starter: 0, professional: 4900, enterprise: 14900 };
        let amount = basePrices[plan as keyof typeof basePrices];
        const addonPrices = { 'compliance': 1900, 'forecasting': 2900 };
        addons.forEach(addon => { amount += (addonPrices as any)[addon] || 0; });
        
        if (amount === 0) {
            const headers = new Headers(corsHeaders);
            headers.set('Location', 'https://insighthunter.io/my-account.html');
            return new Response(null, { status: 303, headers });
        }

        let customerId = user.stripe_customer_id;
        if (!customerId) {
          const customer = await stripe(env).customers.create({
            email: user.email,
            metadata: { userId: user.id }
          });
          customerId = customer.id;
          await env.D1_DB.prepare('UPDATE users SET stripe_customer_id = ? WHERE id = ?')
            .bind(customerId, user.id).run();
        }

        const session = await stripe(env).checkout.sessions.create({
          customer: customerId,
          payment_method_types: ['card'],
          line_items: [{
            price_data: {
              currency: 'usd',
              product_data: { name: `InsightHunter ${plan.slice(0,1).toUpperCase() + plan.slice(1)}` },
              unit_amount: Math.max(amount, 50),
              recurring: { interval: 'month' },
            },
            quantity: 1,
          }],
          mode: 'subscription',
          success_url: 'https://insighthunter.io/my-account.html',
          cancel_url: 'https://insighthunter.io/shopping.html',
          metadata: { addons: addons.join(',') }
        });

        return new Response(JSON.stringify({ url: session.url }), { headers: {...corsHeaders, 'Content-Type': 'application/json'}});
      } catch (error) {
        console.error('Checkout error:', error);
        return new Response('Payment setup failed', { status: 500, headers: corsHeaders });
      }
    }

    if (request.method === 'POST' && url.pathname === '/api/webhook') {
      const sig = request.headers.get('stripe-signature')!;
      let event;

      try {
        event = stripe(env).webhooks.constructEvent(
          await request.text(),
          sig,
          env.STRIPE_WEBHOOK_SECRET
        );
      } catch (err) {
        return new Response(`Webhook signature failed`, { status: 400 });
      }

      if (event.type === 'checkout.session.completed') {
        const session = event.data.object as any;
        const userId = session.customer_details.metadata?.userId;
        if (userId) {
          await env.D1_DB.prepare(`
            UPDATE users SET subscription_status = 'active' 
            WHERE id = ?
          `).bind(userId).run();
        }
      }

      return new Response('OK', { status: 200 });
    }

    if (request.method === 'GET' && url.pathname === '/api/my-account') {
        const user = await withAuth(request, env);
        if (!user) return new Response('Unauthorized', { status: 401, headers: corsHeaders });

        const apps = user.subscription_status === 'active' 
            ? ['dashboard', 'compliance', 'forecasting'] 
            : ['dashboard'];

        const accountData = {
            email: user.email,
            apps: apps,
            status: user.subscription_status,
        };

        return new Response(JSON.stringify(accountData), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }});
    }

    if (request.method === 'POST' && url.pathname === '/api/logout') {
        const headers = new Headers(corsHeaders);
        headers.set('Set-Cookie', 'auth_jwt=; HttpOnly; Secure; SameSite=Strict; Max-Age=0; Path=/');
        return new Response('Logged out', { headers });
    }

    // Fallback for other routes
    return new Response('Not found', { status: 404, headers: corsHeaders });
  },
} satisfies ExportedHandler<Env>;
