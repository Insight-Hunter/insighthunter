// index.ts
import Stripe from 'stripe';
import { createHmac } from 'node:crypto';
import bcrypt from 'bcryptjs'; // npm i bcryptjs stripe

iimport { Hono } from 'hono';
import { cors } from 'hono/cors';
import { jwt } from 'hono/jwt';

interface Env {
  ASSETS: Fetcher;
  USERS: D1Database;
  SESSIONS: KVNamespace;
  JWT_SECRET: string;
  AUTH_API_URL: string;
}

const app = new Hono<{ Bindings: Env }>();

// CORS for all
app.use('*', cors({
  origin: 'https://insighthunter.app', // Production domain
  credentials: true,
}));

// Serve static assets (signup.html, shop.html, etc.)
app.get('/*', async (c) => {
  const url = new URL(c.req.url);
  const pathname = url.pathname;
  
  // Serve HTML/CSS/JS/images from public/
  if (pathname.match(/\.(html|css|js|png|jpg|ico|svg)$/)) {
    return c.env.ASSETS.fetch(c.req);
  }
  
  // Root redirects to shop
  if (pathname === '/') {
    return Response.redirect('/shop.html', 302);
  }
  
  // SPA fallback - serve index.html (if you add one)
  return c.env.ASSETS.fetch(new Request(new URL('/index.html', c.req.url)));
});

// Proxy auth API calls to auth worker
app.all('/api/auth/*', async (c) => {
  const authUrl = new URL(c.req.url.replace('/api/auth', c.env.AUTH_API_URL + '/api/auth'));
  return fetch(authUrl, c.req);
});

// Protected dashboard
app.get('/api/dashboard', jwt({ secret: c.env.JWT_SECRET }), async (c) => {
  const payload = c.get('jwtPayload');
  const user = await c.env.USERS.prepare('SELECT email FROM users WHERE id = ?')
    .bind(payload.userId).first();
  return c.json({ user, plan: 'growth', features: ['forecasting', 'reports'] });
});

// Checkout webhook (Stripe/Lemon Squeezy)
app.post('/api/webhooks/checkout', async (c) => {
  const body = await c.req.text();
  // Verify Stripe webhook signature
  // Update user subscription in D1
  return c.json({ received: true });
});

export default app;
