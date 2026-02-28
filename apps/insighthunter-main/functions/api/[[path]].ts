// apps/insighthunter-main/functions/api/[[path]].ts
import { Hono }          from 'hono';
import { cors }          from 'hono/cors';
import { secureHeaders } from 'hono/secure-headers';
import type {
  Env,
  HonoContextVars,
  AuthValidationResult,
  SessionPayload,
  AppsResponse,
  AppDetailResponse,
  SessionResponse,
} from '../../src/types';
import {
  CORE_APPS,
  ADDON_APPS,
  getApp,
  getRelatedApps,
} from './../../src/data/apps';

// ─── App ───────────────────────────────────────────────────────────────────
const api = new Hono<{ Bindings: Env; Variables: HonoContextVars }>()
  .basePath('/api');

// ─── Allowed origins ───────────────────────────────────────────────────────
const ALLOWED_ORIGINS = [
  'https://insighthunter.app',
  'https://www.insighthunter.app',
  'https://lite.insighthunter.app',
  'https://standard.insighthunter.app',
  'https://pro.insighthunter.app',
  'https://pbx.insighthunter.app',
  'https://bookkeeping.insighthunter.app',
  'https://payroll.insighthunter.app',
  'https://scout.insighthunter.app',
  'https://bizforma.insighthunter.app',
  'http://localhost:8788',   // Pages dev server
  'http://localhost:8787',   // Worker dev server
];

// ─── Helpers ───────────────────────────────────────────────────────────────

/** Proxy a request to a service binding, optionally injecting headers */
async function proxyTo(
  service:      Fetcher,
  request:      Request,
  extraHeaders?: Record<string, string>,
): Promise<Response> {
  if (!extraHeaders) return service.fetch(request);
  const proxied = new Request(request);
  Object.entries(extraHeaders).forEach(([k, v]) => proxied.headers.set(k, v));
  return service.fetch(proxied);
}

/**
 * Call AUTH_SERVICE /api/validate-session with the caller's Cookie header.
 * Returns null if the session is missing, invalid, or the auth service errors.
 */
async function validateSession(
  request: Request,
  env:     Env,
): Promise<AuthValidationResult | null> {
  if (!env.AUTH_SERVICE) return null;

  try {
    const validationUrl       = new URL(request.url);
    validationUrl.pathname    = '/api/validate-session';

    const validationReq = new Request(validationUrl.toString(), {
      method:  'GET',
      headers: { Cookie: request.headers.get('Cookie') ?? '' },
    });

    const res = await env.AUTH_SERVICE.fetch(validationReq);
    if (!res.ok) return null;

    return res.json<AuthValidationResult>();
  } catch (err) {
    console.error('[validate-session]', err);
    return null;
  }
}

/** Return a consistent JSON 401 response */
function unauthorized(message = 'Unauthorized'): Response {
  return new Response(
    JSON.stringify({ success: false, error: message }),
    {
      status:  401,
      headers: { 'Content-Type': 'application/json' },
    },
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// Global Middleware
// ═══════════════════════════════════════════════════════════════════════════

api.use('*', secureHeaders());

api.use('*', cors({
  origin: (origin) =>
    ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0],
  credentials:   true,
  allowMethods:  ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowHeaders:  ['Content-Type', 'Authorization'],
  exposeHeaders: ['X-Request-Id'],
  maxAge:        86400,
}));

// Attach a unique request ID to every response
api.use('*', async (c, next) => {
  const requestId = crypto.randomUUID();
  c.res.headers.set('X-Request-Id', requestId);
  await next();
});

// ═══════════════════════════════════════════════════════════════════════════
// 1. PUBLIC ROUTES — no session required
// ═══════════════════════════════════════════════════════════════════════════

// ── Health ─────────────────────────────────────────────────────────────────
api.get('/health', (c) =>
  c.json({
    status:  'ok',
    ts:      new Date().toISOString(),
    version: '1.0.0',
    env:     c.env.ENVIRONMENT ?? 'unknown',
  }),
);

// ── GET /api/apps — all apps split by category ─────────────────────────────
api.get('/apps', (c) => {
  const payload: AppsResponse = {
    core:   CORE_APPS,
    addons: ADDON_APPS,
  };
  return c.json(payload);
});

// ── GET /api/apps/:slug — single app + related ─────────────────────────────
api.get('/apps/:slug', (c) => {
  const { slug } = c.req.param();

  // Validate slug format — alphanumeric + hyphens only
  if (!/^[a-z0-9-]+$/.test(slug)) {
    return c.json({ error: 'Invalid app slug' }, 400);
  }

  const found = getApp(slug);
  if (!found) {
    return c.json({ error: `App "${slug}" not found` }, 404);
  }

  const payload: AppDetailResponse = {
    app:     found,
    related: getRelatedApps(slug),
  };
  return c.json(payload);
});

// ── POST /api/login — proxy to AUTH_SERVICE ────────────────────────────────
api.post('/login', async (c) => {
  if (!c.env.AUTH_SERVICE) {
    return c.json({ error: 'Auth service unavailable' }, 503);
  }
  try {
    const res = await proxyTo(c.env.AUTH_SERVICE, c.req.raw);
    return new Response(res.body, {
      status:  res.status,
      headers: res.headers,
    });
  } catch (err) {
    console.error('[login]', err);
    return c.json({ error: 'Auth service error' }, 502);
  }
});

// ── POST /api/signup — proxy to AUTH_SERVICE ───────────────────────────────
api.post('/signup', async (c) => {
  if (!c.env.AUTH_SERVICE) {
    return c.json({ error: 'Auth service unavailable' }, 503);
  }
  try {
    const res = await proxyTo(c.env.AUTH_SERVICE, c.req.raw);
    return new Response(res.body, {
      status:  res.status,
      headers: res.headers,
    });
  } catch (err) {
    console.error('[signup]', err);
    return c.json({ error: 'Auth service error' }, 502);
  }
});

// ── POST /api/webhooks/stripe ──────────────────────────────────────────────
// Stripe signs the payload — do NOT auth-gate, do NOT modify body
api.post('/webhooks/stripe', async (c) => {
  if (!c.env.BOOKKEEPING_SERVICE) {
    return c.json({ error: 'Bookkeeping service unavailable' }, 503);
  }
  try {
    const res = await proxyTo(c.env.BOOKKEEPING_SERVICE, c.req.raw);
    return new Response(res.body, {
      status:  res.status,
      headers: res.headers,
    });
  } catch (err) {
    console.error('[stripe-webhook]', err);
    return c.json({ error: 'Webhook relay error' }, 502);
  }
});

// ── OPTIONS preflight — handled by cors() middleware above ─────────────────

// ═══════════════════════════════════════════════════════════════════════════
// 2. SESSION VALIDATION MIDDLEWARE
//    Applied to all routes defined AFTER this point
// ═══════════════════════════════════════════════════════════════════════════

api.use('*', async (c, next) => {
  const authResult = await validateSession(c.req.raw, c.env);

  if (!authResult?.success) {
    return unauthorized();
  }

  // Attach verified identity to Hono context for downstream handlers
  c.set('userId',    authResult.userId);
  c.set('userEmail', authResult.email);
  c.set('userTier',  authResult.tier);

  await next();
});

// ═══════════════════════════════════════════════════════════════════════════
// 3. AUTHENTICATED ROUTES
// ═══════════════════════════════════════════════════════════════════════════

// ── GET /api/session — return verified identity to the frontend ────────────
api.get('/session', async (c) => {
  const userId = c.get('userId');
  const email  = c.get('userEmail');
  const tier   = c.get('userTier');

  // Optionally enrich with KV data (expiry etc.)
  try {
    const cookieHeader = c.req.header('Cookie') ?? '';
    const token        = cookieHeader.match(/ih_token=([^;]+)/)?.[1]
                      ?? c.req.header('Authorization')?.replace('Bearer ', '');

    const sessionData = token
      ? await c.env.SESSIONS.get<SessionPayload>(`session:${token}`, 'json')
      : null;

    const payload: SessionResponse = {
      authenticated: true,
      userId,
      email,
      tier:          (sessionData?.tier ?? tier) as SessionPayload['tier'],
      expiresAt:     sessionData?.expiresAt ?? null,
    };

    return c.json(payload);
  } catch (err) {
    console.error('[session]', err);
    // Still return basic session data even if KV lookup fails
    return c.json({
      authenticated: true,
      userId,
      email,
      tier,
      expiresAt: null,
    } satisfies SessionResponse);
  }
});

// ── POST /api/logout — proxy to AUTH_SERVICE ───────────────────────────────
api.post('/logout', async (c) => {
  if (!c.env.AUTH_SERVICE) {
    return c.json({ error: 'Auth service unavailable' }, 503);
  }
  try {
    const res = await proxyTo(c.env.AUTH_SERVICE, c.req.raw);
    return new Response(res.body, {
      status:  res.status,
      headers: res.headers,
    });
  } catch (err) {
    console.error('[logout]', err);
    return c.json({ error: 'Auth service error' }, 502);
  }
});

// ── POST /api/password — proxy password change to AUTH_SERVICE ────────────
api.post('/password', async (c) => {
  if (!c.env.AUTH_SERVICE) {
    return c.json({ error: 'Auth service unavailable' }, 503);
  }
  try {
    const res = await proxyTo(c.env.AUTH_SERVICE, c.req.raw, {
      'X-Authenticated-User-Id': c.get('userId'),
      'X-User-Tier':             c.get('userTier'),
    });
    return new Response(res.body, {
      status:  res.status,
      headers: res.headers,
    });
  } catch (err) {
    console.error('[password]', err);
    return c.json({ error: 'Auth service error' }, 502);
  }
});

// ── ALL /api/* (catch-all) ─────────────────────────────────────────────────
// Forward all remaining authenticated requests to BOOKKEEPING_SERVICE,
// injecting the verified user identity as trusted internal headers
api.all('/*', async (c) => {
  if (!c.env.BOOKKEEPING_SERVICE) {
    return c.json({ error: 'Bookkeeping service unavailable' }, 503);
  }

  try {
    const res = await proxyTo(
      c.env.BOOKKEEPING_SERVICE,
      c.req.raw,
      {
        'X-Authenticated-User-Id': c.get('userId'),
        'X-User-Email':            c.get('userEmail'),
        'X-User-Tier':             c.get('userTier'),
      },
    );
    return new Response(res.body, {
      status:  res.status,
      headers: res.headers,
    });
  } catch (err) {
    console.error('[bookkeeping-proxy]', err);
    return c.json({ error: 'Service error' }, 502);
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// Error boundary & 404
// ═══════════════════════════════════════════════════════════════════════════

api.onError((err, c) => {
  console.error('[api-error]', c.req.method, c.req.path, err);
  return c.json({ error: 'Internal server error' }, 500);
});

api.notFound((c) =>
  c.json(
    { error: `Route not found: ${c.req.method} ${c.req.path}` },
    404,
  ),
);

// ═══════════════════════════════════════════════════════════════════════════
// Cloudflare Pages Functions export
// ═══════════════════════════════════════════════════════════════════════════

export const onRequest: PagesFunction<Env> = (context) =>
    api.fetch(
      context.request,
      context.env,
      {
          waitUntil: context.waitUntil.bind(context),
          passThroughOnException: context.passThroughOnException.bind(context),
          props: undefined
      },
    );
  
