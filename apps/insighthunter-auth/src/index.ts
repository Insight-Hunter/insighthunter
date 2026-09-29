import { Hono } from 'hono';
import { cors } from 'hono/cors';
import type { Env, ProvisioningMessage } from './types/env.js';
import authRoutes from './routes/auth.js';
import { handleProvisioningBatch } from './queue/provisioning-consumer.js';

export { RateLimiter } from './lib/rate-limiter.js';

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
