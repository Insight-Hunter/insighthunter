import { Hono } from 'hono';
import { cors } from 'hono/cors';
import type { Env } from './types/env';
import { authRoutes }     from './routes/auth';
import { tokenRoutes }    from './routes/token';
import { meRoutes }       from  './routes/me';
import { orgRoutes }      from './routes/org';
import { internalRoutes } from './routes/internal';
import { logger }         from './lib/logger';

const app = new Hono<{ Bindings: Env }>();

app.use('*', cors({
  origin:      c => c.env.CORS_ORIGINS.split(','),
  credentials: true,
}));

app.use('*', async (c, next) => {
  const start = Date.now();
  await next();
  logger.info('request', { path: c.req.path, method: c.req.method, status: c.res.status, ms: Date.now() - start });
});

// Public routes
app.route('/auth',      authRoutes);
app.route('/auth',      tokenRoutes);
app.route('/auth',      meRoutes);
app.route('/auth/org',  orgRoutes);

// Internal route — Service Binding access only (not behind auth)
app.route('/internal',  internalRoutes);

app.get('/health', c => c.json({ ok: true, service: 'insighthunter-auth', ts: new Date().toISOString() }));

app.onError((err, c) => {
  logger.error('unhandled', { error: err.message });
  return c.json({ error: 'Internal server error' }, 500);
});

export default app;
