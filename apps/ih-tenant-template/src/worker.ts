import { Hono } from 'hono';
<<<<<<< HEAD
const app = new Hono();
app.get('/health', (c) => c.json({ status: 'ok', worker: 'tenant-template' }));
app.get('/api/data/profile', (c) => c.json({ orgScoped: true }));
=======
import { cors } from 'hono/cors';
import { tenantGuard } from './middleware/tenantGuard';
import dataRoutes from './routes/data';

export interface Env {
  ORG_ID: string;
  ORG_TIER: string;
  IH_TENANT_DB: D1Database;
  IH_TENANT_KV: KVNamespace;
  IH_DOCS: R2Bucket;
  JWT_SECRET: string;
}

const app = new Hono<{ Bindings: Env }>();

app.use('*', cors({
  origin: ['https://insighthunter.app', 'https://dashboard.insighthunter.app'],
  allowHeaders: ['Authorization', 'Content-Type', 'x-ih-token'],
  allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  credentials: true,
}));

app.use('/api/*', tenantGuard);

app.route('/api/data', dataRoutes);

app.get('/health', (c) =>
  c.json({ status: 'ok', orgId: c.env.ORG_ID, tier: c.env.ORG_TIER })
);

app.notFound((c) => c.json({ error: 'Not found', code: 'NOT_FOUND' }, 404));
app.onError((err, c) => c.json({ error: 'Internal error', code: 'INTERNAL_ERROR' }, 500));

>>>>>>> 67612b7d33a6889fca29e77e31214f4791cbb16f
export default app;
