import { Hono } from 'hono';
import type { AuthUser } from '@ih/types';
import { TIER_LIMITS } from '@ih/tier-config';

// ─── Env bindings ─────────────────────────────────────────────────────────────

interface Env {
  TENANT_WORKERS: DispatchNamespace;
  AUTH_WORKER: Fetcher;
  BOOKKEEPING_WORKER: Fetcher;
  BIZFORMA_WORKER: Fetcher;
  PBX_WORKER: Fetcher;
  PAYROLL_WORKER: Fetcher;
  AI_WORKER: Fetcher;
  TENANT_CACHE: KVNamespace;
  JWT_SECRET: string;
  CF_API_TOKEN: string;
  CF_ACCOUNT_ID: string;
  ENVIRONMENT: string;
}

const app = new Hono<{ Bindings: Env }>();

// ─── Rate limiting via KV ─────────────────────────────────────────────────────

async function checkRateLimit(env: Env, orgId: string, tier: AuthUser['tier']): Promise<boolean> {
  const limit = TIER_LIMITS[tier].api_calls_per_minute;
  if (limit === null) return true; // enterprise = unlimited

  const key = `rate:${orgId}:${Math.floor(Date.now() / 60_000)}`;
  const current = parseInt((await env.TENANT_CACHE.get(key)) ?? '0', 10);
  if (current >= limit) return false;

  await env.TENANT_CACHE.put(key, String(current + 1), { expirationTtl: 60 });
  return true;
}

// ─── Strip path prefix helper ─────────────────────────────────────────────────

function stripPrefix(url: URL, prefix: string): string {
  return url.pathname.slice(prefix.length) || '/';
}

// ─── Forward request to a service binding ────────────────────────────────────

function forwardRequest(
  request: Request,
  target: Fetcher,
  newPath: string,
  user: AuthUser,
  internalSecret: string
): Promise<Response> {
  const url = new URL(request.url);
  url.pathname = newPath;
  const headers = new Headers(request.headers);
  headers.set('X-IH-User', JSON.stringify(user));
  headers.set('X-Internal-Secret', internalSecret);
  return target.fetch(new Request(url.toString(), {
    method: request.method,
    headers,
    body: ['GET', 'HEAD'].includes(request.method) ? undefined : request.body,
  }));
}

// ─── Main catch-all handler ───────────────────────────────────────────────────

app.all('/api/*', async (c) => {
  const authHeader = c.req.header('Authorization');
  if (!authHeader) return c.json({ error: 'Authorization required', code: 'NO_AUTH' }, 401);

  // Verify token via AUTH_WORKER internal endpoint
  const verifyRes = await c.env.AUTH_WORKER.fetch(new Request('https://internal/auth/verify', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Internal-Secret': c.env.JWT_SECRET,
    },
    body: JSON.stringify({ token: authHeader.replace('Bearer ', '') }),
  }));

  if (!verifyRes.ok) {
    return c.json({ error: 'Invalid or expired token', code: 'UNAUTHORIZED' }, 401);
  }

  const user = await verifyRes.json<AuthUser>();

  // Rate limit check
  const allowed = await checkRateLimit(c.env, user.orgId, user.tier);
  if (!allowed) {
    return c.json({ error: 'Rate limit exceeded', code: 'RATE_LIMITED' }, 429, {
      'Retry-After': '60',
    });
  }

  const url = new URL(c.req.url);
  const path = url.pathname;

  // Enterprise custom worker routing
  if (user.tier === 'enterprise') {
    // Cache org worker_script lookup
    const cacheKey = `org:worker:${user.orgId}`;
    let workerScript = await c.env.TENANT_CACHE.get(cacheKey);

    if (workerScript === null) {
      // Fetch from auth worker
      const orgRes = await c.env.AUTH_WORKER.fetch(new Request(`https://internal/auth/org/${user.orgId}`, {
        headers: { 'X-Internal-Secret': c.env.JWT_SECRET },
      }));
      if (orgRes.ok) {
        const org = await orgRes.json<{ worker_script: string | null }>();
        workerScript = org.worker_script ?? '';
        await c.env.TENANT_CACHE.put(cacheKey, workerScript, { expirationTtl: 300 });
      } else {
        workerScript = '';
      }
    }

    if (workerScript) {
      try {
        const tenantWorker = c.env.TENANT_WORKERS.get(workerScript);
        const headers = new Headers(c.req.raw.headers);
        headers.set('X-IH-User', JSON.stringify(user));
        headers.set('X-Internal-Secret', c.env.JWT_SECRET);
        return tenantWorker.fetch(new Request(c.req.url, {
          method: c.req.method,
          headers,
          body: ['GET', 'HEAD'].includes(c.req.method) ? undefined : c.req.raw.body,
        }));
      } catch {
        // Fall through to standard routing if tenant worker fails
      }
    }
  }

  // Standard path-based routing
  if (path.startsWith('/api/bookkeeping/')) {
    return forwardRequest(c.req.raw, c.env.BOOKKEEPING_WORKER, stripPrefix(url, '/api/bookkeeping'), user, c.env.JWT_SECRET);
  }
  if (path.startsWith('/api/bizforma/')) {
    return forwardRequest(c.req.raw, c.env.BIZFORMA_WORKER, stripPrefix(url, '/api/bizforma'), user, c.env.JWT_SECRET);
  }
  if (path.startsWith('/api/pbx/')) {
    return forwardRequest(c.req.raw, c.env.PBX_WORKER, stripPrefix(url, '/api/pbx'), user, c.env.JWT_SECRET);
  }
  if (path.startsWith('/api/payroll/')) {
    return forwardRequest(c.req.raw, c.env.PAYROLL_WORKER, stripPrefix(url, '/api/payroll'), user, c.env.JWT_SECRET);
  }
  if (path.startsWith('/api/ai/')) {
    return forwardRequest(c.req.raw, c.env.AI_WORKER, stripPrefix(url, '/api/ai'), user, c.env.JWT_SECRET);
  }

  return c.json({ error: 'Route not found', code: 'NOT_FOUND' }, 404);
});

// ─── Admin: provision tenant worker ──────────────────────────────────────────

app.post('/admin/tenants/:orgId/worker', async (c) => {
  if (c.req.header('X-Internal-Secret') !== c.env.JWT_SECRET) {
    return c.json({ error: 'Forbidden', code: 'FORBIDDEN' }, 403);
  }

  const { orgId } = c.req.param();
  const { script_name } = await c.req.json<{ script_name: string }>();

  // Upload base worker script to dispatch namespace
  const uploadUrl = `https://api.cloudflare.com/client/v4/accounts/${c.env.CF_ACCOUNT_ID}/workers/dispatch/namespaces/insighthunter-tenants/scripts/${script_name}`;

  const workerScript = `
export default {
  async fetch(request, env, ctx) {
    const user = JSON.parse(request.headers.get('X-IH-User') || '{}');
    if (user.orgId !== env.IH_ORG_ID) {
      return Response.json({ error: 'Org mismatch' }, { status: 403 });
    }
    const url = new URL(request.url);
    return Response.json({
      message: 'InsightHunter Enterprise Worker Active',
      orgId: env.IH_ORG_ID,
      tier: env.IH_TIER,
      path: url.pathname,
      method: request.method,
    });
  }
};
  `.trim();

  const formData = new FormData();
  formData.append('metadata', JSON.stringify({
    main_module: 'worker.js',
    bindings: [
      { type: 'plain_text', name: 'IH_ORG_ID', text: orgId },
      { type: 'plain_text', name: 'IH_TIER', text: 'enterprise' },
    ],
    compatibility_date: '2025-03-07',
  }));
  formData.append('worker.js', new Blob([workerScript], { type: 'application/javascript+module' }), 'worker.js');

  const uploadRes = await fetch(uploadUrl, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${c.env.CF_API_TOKEN}` },
    body: formData,
  });

  if (!uploadRes.ok) {
    const err = await uploadRes.text();
    return c.json({ error: 'Failed to upload worker', detail: err }, 500);
  }

  // Update org record in auth worker
  await c.env.AUTH_WORKER.fetch(new Request('https://internal/auth/org', {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'X-Internal-Secret': c.env.JWT_SECRET,
    },
    body: JSON.stringify({ orgId, worker_script: script_name }),
  }));

  // Bust cache
  await c.env.TENANT_CACHE.delete(`org:worker:${orgId}`);

  return c.json({ deployed: true, script_name });
});

// ─── Admin: delete tenant worker ─────────────────────────────────────────────

app.delete('/admin/tenants/:orgId/worker', async (c) => {
  if (c.req.header('X-Internal-Secret') !== c.env.JWT_SECRET) {
    return c.json({ error: 'Forbidden', code: 'FORBIDDEN' }, 403);
  }

  const { orgId } = c.req.param();
  const orgRes = await c.env.AUTH_WORKER.fetch(new Request(`https://internal/auth/org/${orgId}`, {
    headers: { 'X-Internal-Secret': c.env.JWT_SECRET },
  }));
  if (!orgRes.ok) return c.json({ error: 'Org not found', code: 'NOT_FOUND' }, 404);

  const org = await orgRes.json<{ worker_script: string | null }>();
  if (!org.worker_script) return c.json({ error: 'No custom worker configured', code: 'NO_WORKER' }, 400);

  const deleteUrl = `https://api.cloudflare.com/client/v4/accounts/${c.env.CF_ACCOUNT_ID}/workers/dispatch/namespaces/insighthunter-tenants/scripts/${org.worker_script}`;
  await fetch(deleteUrl, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${c.env.CF_API_TOKEN}` },
  });

  await c.env.AUTH_WORKER.fetch(new Request('https://internal/auth/org', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', 'X-Internal-Secret': c.env.JWT_SECRET },
    body: JSON.stringify({ orgId, worker_script: null }),
  }));

  await c.env.TENANT_CACHE.delete(`org:worker:${orgId}`);
  return c.json({ deleted: true, orgId });
});

export default app;
