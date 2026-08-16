import { Hono } from 'hono';
import { fromGatewayHeaders } from '../authz/session.js';
import { listOrganizationEntitlements, organizationHasEntitlement } from '../authz/entitlements.js';
import type { Env } from '../index.js';

const entitlements = new Hono<{ Bindings: Env }>();

entitlements.get('/api/entitlements', async (c) => {
  const session = fromGatewayHeaders(c.req.raw);
  if (!session) return c.json({ ok: false, error: 'unauthenticated' }, 401);

  const rows = await listOrganizationEntitlements(c.env.DB, session.orgId);
  return c.json({ ok: true, entitlements: rows });
});

entitlements.get('/api/entitlements/:featureKey', async (c) => {
  const session = fromGatewayHeaders(c.req.raw);
  if (!session) return c.json({ ok: false, error: 'unauthenticated' }, 401);

  const featureKey = c.req.param('featureKey');
  const has = await organizationHasEntitlement(c.env.DB, session.orgId, featureKey);
  return c.json({ ok: true, featureKey, entitled: has });
});

export const entitlementsRoutes = entitlements;
export default entitlements;
