import { Hono } from 'hono';
import { cors } from 'hono/cors';

// ── Types ─────────────────────────────────────────────────────────────────────

type OrgRole = 'owner' | 'admin' | 'member' | 'viewer';
type OrgPlan = 'starter' | 'growth' | 'pro' | 'enterprise';

interface IHSession {
  sessionId: string;
  userId: string;
  orgId: string;
  email: string;
  name: string;
  orgName: string;
  orgSlug: string;
  role: OrgRole;
  plan: OrgPlan;
  mfaVerified: boolean;
  createdAt: number;
  expiresAt: number;
}

type Bindings = {
  KV_SESSIONS: KVNamespace;
  AUTH_URL: string;       // https://auth.insighthunter.app
  DASHBOARD_URL: string;  // https://app.insighthunter.app
  ENVIRONMENT: string;    // production | development
};

// ── Subdomain → downstream origin map ──────────────────────────────────────────
//
// Each Worker is deployed at its own *.workers.dev origin (or custom domain).
// The gateway validates the session then proxies with injected identity headers.
// Update these values after each wrangler deploy.

const ROUTE_MAP: Record<string, { origin: string; requiredPlan?: OrgPlan[] }> = {
  'app':          { origin: 'https://insighthunter-main.workers.dev' },
  'platform':     { origin: 'https://insighthunter-platform.workers.dev' },
  'bookkeeping':  { origin: 'https://insighthunter-bookkeeping.workers.dev',  requiredPlan: ['growth', 'pro', 'enterprise'] },
  'insights':     { origin: 'https://insighthunter-insights.workers.dev' },
  'advisor':      { origin: 'https://insighthunter-advisor.workers.dev',      requiredPlan: ['growth', 'pro', 'enterprise'] },
  'reports':      { origin: 'https://insighthunter-report.workers.dev',       requiredPlan: ['growth', 'pro', 'enterprise'] },
  'payroll':      { origin: 'https://insighthunter-payroll.workers.dev',      requiredPlan: ['pro', 'enterprise'] },
  'scout':        { origin: 'https://insighthunter-scout.workers.dev',        requiredPlan: ['pro', 'enterprise'] },
  'pbx':          { origin: 'https://insighthunter-pbx.workers.dev',          requiredPlan: ['pro', 'enterprise'] },
  'bizforma':     { origin: 'https://insighthunter-bizforma.workers.dev',     requiredPlan: ['growth', 'pro', 'enterprise'] },
  'notifications':{ origin: 'https://insighthunter-notifications.workers.dev' },
  'finops':       { origin: 'https://insighthunter-finops.workers.dev',       requiredPlan: ['pro', 'enterprise'] },
  'dispatch':     { origin: 'https://insighthunter-dispatch.workers.dev' },
};

const PLAN_RANK: Record<OrgPlan, number> = {
  starter: 0, growth: 1, pro: 2, enterprise: 3,
};

function planSufficient(userPlan: OrgPlan, required: OrgPlan[]): boolean {
  return required.some(r => PLAN_RANK[userPlan] >= PLAN_RANK[r]);
}

// ── App ───────────────────────────────────────────────────────────────────────

const app = new Hono<{ Bindings: Bindings }>();

// Security headers on every response
app.use('*', async (c, next) => {
  await next();
  c.header('X-Frame-Options', 'DENY');
  c.header('X-Content-Type-Options', 'nosniff');
  c.header('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
  c.header('Referrer-Policy', 'strict-origin-when-cross-origin');
});

// CORS — only insighthunter.app origins
app.use('*', cors({
  origin: (origin) => {
    if (!origin) return null;
    if (origin.endsWith('.insighthunter.app') || origin === 'https://insighthunter.app') return origin;
    return null;
  },
  credentials: true,
  allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
}));

// ── Session resolver ────────────────────────────────────────────────────────────

async function resolveSession(kv: KVNamespace, cookieHeader: string | undefined): Promise<IHSession | null> {
  if (!cookieHeader) return null;
  const match = cookieHeader.match(/ih_session=([^;\s]+)/);
  const sessionId = match?.[1];
  if (!sessionId) return null;

  const session = await kv.get(`session:${sessionId}`, 'json') as IHSession | null;
  if (!session) return null;
  if (session.expiresAt < Math.floor(Date.now() / 1000)) return null;
  return session;
}

function isBrowserRequest(req: Request): boolean {
  const accept = req.headers.get('Accept') ?? '';
  return accept.includes('text/html');
}

// ── Public endpoints ────────────────────────────────────────────────────────────

app.get('/health', (c) =>
  c.json({ ok: true, service: 'insighthunter-gateway', ts: Date.now(), env: c.env.ENVIRONMENT }),
);

// Diagnostic: who am I? (requires valid session)
app.get('/__gateway/me', async (c) => {
  const session = await resolveSession(c.env.KV_SESSIONS, c.req.header('cookie'));
  if (!session) return c.json({ authenticated: false }, 401);
  return c.json({
    authenticated: true,
    userId: session.userId,
    orgId: session.orgId,
    email: session.email,
    name: session.name,
    role: session.role,
    plan: session.plan,
    orgSlug: session.orgSlug,
    expiresAt: new Date(session.expiresAt * 1000).toISOString(),
  });
});

// ── Main proxy handler ───────────────────────────────────────────────────────────
//
// Handles ALL traffic routed through gateway.insighthunter.app
// Cloudflare Routes sends *.insighthunter.app/* here; gateway resolves
// subdomain → downstream Worker origin and proxies with identity headers.

app.all('*', async (c) => {
  const url = new URL(c.req.url);

  // Extract subdomain from Host header (works in CF Workers)
  const host = c.req.header('host') ?? url.hostname;
  const subdomain = host.split('.')[0] ?? 'app';

  const route = ROUTE_MAP[subdomain];

  // Unknown subdomain — 404
  if (!route) {
    return c.json({ error: 'Unknown subdomain', subdomain }, 404);
  }

  // Resolve session from ih_session cookie
  const session = await resolveSession(c.env.KV_SESSIONS, c.req.header('cookie'));

  // Not authenticated
  if (!session) {
    if (isBrowserRequest(c.req.raw)) {
      const returnTo = encodeURIComponent(url.toString());
      return c.redirect(`${c.env.AUTH_URL}/login?redirect=${returnTo}`, 302);
    }
    return c.json({ error: 'Unauthorized', message: 'Valid session required.' }, 401);
  }

  // Plan enforcement
  if (route.requiredPlan && !planSufficient(session.plan, route.requiredPlan)) {
    if (isBrowserRequest(c.req.raw)) {
      return c.redirect(`${c.env.DASHBOARD_URL}/upgrade?feature=${subdomain}`, 302);
    }
    return c.json({
      error: 'plan_required',
      message: `This feature requires one of: ${route.requiredPlan.join(', ')}`,
      currentPlan: session.plan,
      upgradeUrl: 'https://platform.insighthunter.app/billing',
    }, 402);
  }

  // Build proxied request with identity headers injected
  const targetUrl = route.origin + url.pathname + url.search;

  const proxyHeaders = new Headers(c.req.raw.headers);

  // Strip the incoming host — downstream Worker sets its own
  proxyHeaders.delete('host');

  // Inject verified identity — downstream Workers trust these, no re-auth needed
  proxyHeaders.set('X-User-Id',    session.userId);
  proxyHeaders.set('X-Org-Id',     session.orgId);
  proxyHeaders.set('X-User-Email', session.email);
  proxyHeaders.set('X-User-Name',  session.name);
  proxyHeaders.set('X-User-Role',  session.role);
  proxyHeaders.set('X-Org-Plan',   session.plan);
  proxyHeaders.set('X-Org-Slug',   session.orgSlug);
  proxyHeaders.set('X-Org-Name',   session.orgName);
  proxyHeaders.set('X-Gateway',    'insighthunter-gateway'); // downstream can verify provenance

  const proxyRequest = new Request(targetUrl, {
    method: c.req.method,
    headers: proxyHeaders,
    body: ['GET', 'HEAD'].includes(c.req.method) ? null : c.req.raw.body,
    redirect: 'manual',
  });

  try {
    const response = await fetch(proxyRequest);

    // Pass downstream response back, adding gateway header
    const responseHeaders = new Headers(response.headers);
    responseHeaders.set('X-Served-By', 'insighthunter-gateway');

    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: responseHeaders,
    });
  } catch (err) {
    console.error(`[gateway] proxy error → ${targetUrl}`, err);
    return c.json({ error: 'upstream_error', message: 'Upstream Worker unavailable.' }, 502);
  }
});

export default app;
