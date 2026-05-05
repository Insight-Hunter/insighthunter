import { Hono } from 'hono';
import { verifyJWT } from './middleware/jwtVerify';
import { provisionTenant, deprovisionTenant } from './provisioning';
import { getRegistry, setRegistry } from './registry';

export interface Env {
  DISPATCH_NS: DispatchNamespace;
  IH_REGISTRY: KVNamespace;
  IH_PLATFORM_DB: D1Database;
  CF_ACCOUNT_ID: string;
  CF_API_TOKEN: string;
  JWT_SECRET: string;
}

const app = new Hono<{ Bindings: Env }>();

// Auth middleware for all /api routes
app.use('/api/*', verifyJWT);

// Provision a new tenant Worker (called by auth service after org creation)
app.post('/api/provision', async (c) => {
  const { orgId, tier } = await c.req.json<{ orgId: string; tier: string }>();
  if (!orgId) return c.json({ error: 'Missing orgId', code: 'MISSING_ORG_ID' }, 400);

  try {
    const result = await provisionTenant(c.env, orgId, tier);
    return c.json({ success: true, workerName: result.workerName });
  } catch (err: any) {
    return c.json({ error: err.message, code: 'PROVISION_FAILED' }, 500);
  }
});

// Deprovision a tenant Worker (org deletion)
app.delete('/api/provision/:orgId', async (c) => {
  const orgId = c.req.param('orgId');
  try {
    await deprovisionTenant(c.env, orgId);
    return c.json({ success: true });
  } catch (err: any) {
    return c.json({ error: err.message, code: 'DEPROVISION_FAILED' }, 500);
  }
});

// Dispatch all /tenant/* requests to the correct tenant Worker
app.all('/tenant/*', verifyJWT, async (c) => {
  const orgId = c.get('orgId' as never) as string;
  if (!orgId) return c.json({ error: 'Unauthorized', code: 'NO_ORG' }, 401);

  const workerName = `tenant-${orgId}`;
  try {
    const tenantWorker = c.env.DISPATCH_NS.get(workerName, {
      limits: { cpuMs: 50 },
    });
    return tenantWorker.fetch(c.req.raw);
  } catch (err: any) {
    return c.json({ error: 'Tenant worker not found', code: 'TENANT_NOT_FOUND' }, 404);
  }
});

// Health check
app.get('/health', (c) => c.json({ status: 'ok', service: 'ih-platform-worker' }));

export default app;
