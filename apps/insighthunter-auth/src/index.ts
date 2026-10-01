import { Hono } from 'hono';
import { cors } from 'hono/cors';
import type { Env, ProvisioningMessage } from './env.js';
import authRoutes from './routes/auth.js';
import { handleProvisioningBatch } from './queue/provisioning-consumer.js';

export { RateLimiter } from './lib/rate-limiter.js';
export { UserVault } from './vault.js';

const app = new Hono<{ Bindings: Env }>();

app.use('*', async (c, next) => {
  const allowedOrigins = [c.env.MARKETING_ORIGIN, c.env.APP_ORIGIN];
  return cors({
    origin: (origin) => (allowedOrigins.includes(origin) ? origin : allowedOrigins[0]),
    credentials: true,
    allowHeaders: ['Content-Type', 'Authorization'],
    allowMethods: ['GET', 'POST', 'OPTIONS'],
  })(c, next);
});

app.route('/api/auth', authRoutes);
app.get('/healthz', (c) => c.json({ status: 'ok' }));

export default {
  fetch: app.fetch,
  async queue(batch: MessageBatch<ProvisioningMessage>, env: Env): Promise<void> {
    await handleProvisioningBatch(batch, env);
  },
};
import { secureHeaders } from 'hono/secure-headers';
import type { Env } from './types/env';
import { authRoutes } from './routes/auth';
import { RateLimiter } from './lib/rate-limiter';

export { RateLimiter };

const app = new Hono<{ Bindings: Env }>();

app.use('*', secureHeaders());

app.use('/api/*', async (c, next) => {
  const origin = c.env.MARKETING_ORIGIN;
  const appOrigin = c.env.APP_ORIGIN;
  return cors({
    origin: [origin, appOrigin],
    allowMethods: ['GET', 'POST', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
    maxAge: 600,
  })(c, next);
});

app.get('/healthz', (c) => c.json({ status: 'ok', ts: Date.now() }));

app.get('/', (c) => c.redirect('/login', 302));

app.get('/login', async (c) => {
  const res = await c.env.ASSETS.fetch(new Request('http://assets/login.html'));
  return new Response(res.body, {
    status: res.status,
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  });
});

app.get('/register', async (c) => {
  const res = await c.env.ASSETS.fetch(new Request('http://assets/register.html'));
  return new Response(res.body, {
    status: res.status,
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  });
});

app.route('/api/auth', authRoutes);

app.all('*', async (c) => {
  const res = await c.env.ASSETS.fetch(c.req.raw);
  if (res.status === 404) return c.notFound();
  return res;
});

export default app;
