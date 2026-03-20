import { Hono } from 'hono';
import { cors } from 'hono/cors';

interface Env {
  DISPATCHER: DispatchNamespace;
  PLATFORM_DB: D1Database;
  ROUTING_CACHE: KVNamespace;
  EVENTS: AnalyticsEngineDataset;
  JWT_SECRET: string;
}

interface PlatformUser {
  user_id: string;
  worker_name: string;
  plan: 'lite' | 'standard' | 'pro';
  status: 'active' | 'suspended' | 'provisioning';
}

// Plan-based CPU limits enforced at dispatch layer
const PLAN_LIMITS: Record<string, { cpuMs: number }> = {
  lite:     { cpuMs: 5_000  },
  standard: { cpuMs: 15_000 },
  pro:      { cpuMs: 30_000 },
};

// HMAC-SHA256 JWT verification using Web Crypto API (no external deps)
async function verifyJWT(
  token: string,
  secret: string,
): Promise<{ sub: string; plan: string; email: string } | null> {
  try {
    const [headerB64, payloadB64, sigB64] = token.split('.');
    if (!headerB64 || !payloadB64 || !sigB64) return null;

    const enc = new TextEncoder();
    const cryptoKey = await crypto.subtle.importKey(
      'raw',
      enc.encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['verify'],
    );

    const sig = Uint8Array.from(
      atob(sigB64.replace(/-/g, '+').replace(/_/g, '/')),
      (c) => c.charCodeAt(0),
    );
    const valid = await crypto.subtle.verify(
      'HMAC', cryptoKey, sig,
      enc.encode(`${headerB64}.${payloadB64}`),
    );
    if (!valid) return null;

    const payload = JSON.parse(
      atob(payloadB64.replace(/-/g, '+').replace(/_/g, '/')),
    );
    if (payload.exp && payload.exp < Date.now() / 1000) return null;

    return { sub: payload.sub, plan: payload.plan ?? 'lite', email: payload.email ?? '' };
  } catch {
    return null;
  }
}

const app = new Hono<{ Bindings: Env }>();

app.use(
  '*',
  cors({
    origin: ['https://app.insighthunter.com', 'https://insighthunter.com'],
    allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowHeaders: ['Authorization', 'Content-Type', 'X-Request-ID'],
  }),
);

app.get('/health', (c) => c.json({ status: 'ok', ts: Date.now() }));

// All user API traffic routes through here
app.all('/api/*', async (c) => {
  const requestId = c.req.header('X-Request-ID') ?? crypto.randomUUID();

  const auth = c.req.header('Authorization');
  if (!auth?.startsWith('Bearer ')) {
    return c.json({ error: 'Unauthorized', requestId }, 401);
  }

  const claims = await verifyJWT(auth.slice(7), c.env.JWT_SECRET);
  if (!claims) {
    return c.json({ error: 'Invalid or expired token', requestId }, 401);
  }

  const userId = claims.sub;
  const cacheKey = `route:${userId}`;

  // Fast path: routing cache (avoids D1 hit on every request)
  let user = await c.env.ROUTING_CACHE.get<PlatformUser>(cacheKey, 'json');

  if (!user) {
    const row = await c.env.PLATFORM_DB
      .prepare('SELECT user_id, worker_name, plan, status FROM platform_users WHERE user_id = ?')
      .bind(userId)
      .first<PlatformUser>();

    if (!row) return c.json({ error: 'Account not found', requestId }, 404);
    if (row.status === 'provisioning') {
      return c.json({ error: 'Account setup in progress (~30s). Retry shortly.', requestId }, 202);
    }
    if (row.status === 'suspended') {
      return c.json({ error: 'Account suspended. Contact support@insighthunter.com', requestId }, 403);
    }

    user = row;
    // Cache for 1 hour; invalidate via ROUTING_CACHE.delete on plan/status change
    await c.env.ROUTING_CACHE.put(cacheKey, JSON.stringify(user), { expirationTtl: 3600 });
  }

  // Meter usage for billing
  c.env.EVENTS.writeDataPoint({
    blobs: [userId, user.plan, c.req.method, new URL(c.req.url).pathname],
    doubles: [1],
    indexes: [userId],
  });

  // Enforce plan-tier CPU limits at dispatch
  const limits = PLAN_LIMITS[user.plan] ?? PLAN_LIMITS.lite;

  try {
    const userWorker = c.env.DISPATCHER.get(user.worker_name, {}, { limits });

    // Inject user context headers for the user worker
    const headers = new Headers(c.req.raw.headers);
    headers.set('X-User-ID', userId);
    headers.set('X-User-Plan', user.plan);
    headers.set('X-Request-ID', requestId);

    const fwd = new Request(c.req.raw.url, {
      method: c.req.method,
      headers,
      body: ['GET', 'HEAD'].includes(c.req.method) ? undefined : c.req.raw.body,
    });

    return await userWorker.fetch(fwd);
  } catch (err) {
    console.error(`[dispatch] error worker=${user.worker_name}`, err);
    return c.json({ error: 'Upstream error, please retry.', requestId }, 503);
  }
});

export default app;
