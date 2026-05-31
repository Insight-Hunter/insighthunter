/**
 * insighthunter-dispatch/src/index.ts
 *
 * Central API Gateway for InsightHunter.
 *
 * Responsibilities:
 *   1. CORS — enforce allowed origins on all requests.
 *   2. Rate limiting — per-IP sliding window via KV.
 *   3. JWT authentication — verify Bearer token on protected routes,
 *      inject X-IH-User / X-IH-Org / X-IH-Tier headers for downstream workers.
 *   4. Request routing — forward to the correct sub-worker based on path prefix.
 *   5. Telemetry — write API usage events to Analytics Engine.
 *
 * Route map:
 *   POST /api/auth/login       → AUTH_WORKER  (public)
 *   POST /api/auth/register    → AUTH_WORKER  (public)
 *   POST /api/auth/refresh     → AUTH_WORKER  (public)
 *   *    /api/auth/*           → AUTH_WORKER  (protected)
 *   *    /api/bookkeeping/*    → BOOKKEEPING_WORKER
 *   *    /api/payroll/*        → PAYROLL_WORKER
 *   *    /api/bizforma/*       → BIZFORMA_WORKER
 *   *    /api/scout/*          → SCOUT_WORKER
 *   *    /api/pbx/*            → PBX_WORKER
 *   *    /api/report/*         → REPORT_WORKER
 *   GET  /api/health           → inline (no auth)
 *   GET  /api/version          → inline (no auth)
 */

export interface Env {
  // ── Downstream sub-workers ──────────────────────────────────────────
  AUTH_WORKER:        Fetcher;
  BOOKKEEPING_WORKER: Fetcher;
  PAYROLL_WORKER:     Fetcher;
  BIZFORMA_WORKER:    Fetcher;
  SCOUT_WORKER:       Fetcher;
  PBX_WORKER:         Fetcher;
  REPORT_WORKER:      Fetcher;

  // ── KV namespaces ───────────────────────────────────────────────────
  SESSIONS:    KVNamespace;  // JWT session store
  RATE_LIMIT:  KVNamespace;  // rate limit counters

  // ── D1 database ─────────────────────────────────────────────────────
  DB: D1Database;

  // ── Analytics Engine ────────────────────────────────────────────────
  API_EVENTS: AnalyticsEngineDataset;

  // ── Env vars ────────────────────────────────────────────────────────
  ENVIRONMENT:               string;
  ALLOWED_ORIGINS:           string;
  RATE_LIMIT_WINDOW_SECONDS: string;
  RATE_LIMIT_MAX_REQUESTS:   string;
  JWT_SECRET?:               string;
}

// ── JWT payload shape ──────────────────────────────────────────────────────
interface JWTPayload {
  sub:   string;   // userId
  org:   string;   // orgId
  email: string;
  tier:  'lite' | 'standard' | 'pro';
  iat:   number;
  exp:   number;
}

// ── Routes that skip JWT verification ──────────────────────────────────────
const PUBLIC_ROUTES: Array<{ method: string; path: string }> = [
  { method: 'POST',   path: '/api/auth/login' },
  { method: 'POST',   path: '/api/auth/register' },
  { method: 'POST',   path: '/api/auth/refresh' },
  { method: 'POST',   path: '/api/auth/forgot-password' },
  { method: 'GET',    path: '/api/health' },
  { method: 'GET',    path: '/api/version' },
];

// ──────────────────────────────────────────────────────────────────────────
// CORS helpers
// ──────────────────────────────────────────────────────────────────────────

function getAllowedOrigins(env: Env): string[] {
  return env.ALLOWED_ORIGINS.split(',').map(o => o.trim());
}

function corsHeaders(origin: string | null, env: Env): Record<string, string> {
  const allowed = getAllowedOrigins(env);
  const isAllowed = origin && (allowed.includes(origin) || env.ENVIRONMENT !== 'production');

  return {
    'Access-Control-Allow-Origin':      isAllowed ? (origin ?? '*') : allowed[0] ?? '*',
    'Access-Control-Allow-Methods':     'GET, POST, PUT, PATCH, DELETE, OPTIONS',
    'Access-Control-Allow-Headers':     'Content-Type, Authorization, X-IH-Org',
    'Access-Control-Allow-Credentials': 'true',
    'Access-Control-Max-Age':           '86400',
    'Vary':                             'Origin',
  };
}

function addCors(response: Response, origin: string | null, env: Env): Response {
  const headers = new Headers(response.headers);
  for (const [k, v] of Object.entries(corsHeaders(origin, env))) {
    headers.set(k, v);
  }
  return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
}

function corsPreflightResponse(origin: string | null, env: Env): Response {
  return new Response(null, { status: 204, headers: corsHeaders(origin, env) });
}

// ──────────────────────────────────────────────────────────────────────────
// Rate limiting (sliding window counter in KV)
// ──────────────────────────────────────────────────────────────────────────

async function checkRateLimit(
  ip: string,
  env: Env
): Promise<{ allowed: boolean; remaining: number }> {
  const windowSec = parseInt(env.RATE_LIMIT_WINDOW_SECONDS ?? '60', 10);
  const maxReqs   = parseInt(env.RATE_LIMIT_MAX_REQUESTS   ?? '120', 10);

  const windowStart = Math.floor(Date.now() / 1000 / windowSec) * windowSec;
  const key         = `rl:${ip}:${windowStart}`;

  try {
    const raw = await env.RATE_LIMIT.get(key);
    const count = raw ? parseInt(raw, 10) : 0;

    if (count >= maxReqs) {
      return { allowed: false, remaining: 0 };
    }

    // Increment counter — fire-and-forget
    env.RATE_LIMIT.put(key, String(count + 1), { expirationTtl: windowSec * 2 });
    return { allowed: true, remaining: maxReqs - count - 1 };
  } catch {
    // On KV failure, allow the request through rather than blocking
    return { allowed: true, remaining: maxReqs };
  }
}

// ──────────────────────────────────────────────────────────────────────────
// JWT verification (Web Crypto — no Node deps)
// ──────────────────────────────────────────────────────────────────────────

async function verifyJWT(token: string, secret: string): Promise<JWTPayload | null> {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;

    const [headerB64, payloadB64, sigB64] = parts;

    // Verify signature
    const enc     = new TextEncoder();
    const keyData = enc.encode(secret);
    const cryptoKey = await crypto.subtle.importKey(
      'raw', keyData,
      { name: 'HMAC', hash: 'SHA-256' },
      false, ['verify']
    );

    const data = enc.encode(`${headerB64}.${payloadB64}`);
    const sig  = Uint8Array.from(atob(sigB64.replace(/-/g, '+').replace(/_/g, '/')), c => c.charCodeAt(0));
    const valid = await crypto.subtle.verify('HMAC', cryptoKey, sig, data);
    if (!valid) return null;

    // Decode payload
    const payload = JSON.parse(atob(payloadB64.replace(/-/g, '+').replace(/_/g, '/'))) as JWTPayload;

    // Check expiry
    if (payload.exp < Math.floor(Date.now() / 1000)) return null;

    return payload;
  } catch {
    return null;
  }
}

// ──────────────────────────────────────────────────────────────────────────
// Analytics telemetry (fire-and-forget)
// ──────────────────────────────────────────────────────────────────────────

function trackApiEvent(
  env: Env,
  method: string,
  path: string,
  status: number,
  orgId: string | null,
  latencyMs: number
): void {
  try {
    env.API_EVENTS.writeDataPoint({
      doubles: [status, latencyMs],
      blobs:   [method, path, env.ENVIRONMENT],
      indexes: [orgId ?? 'anonymous'],
    });
  } catch {
    // Never let telemetry break the request
  }
}

// ──────────────────────────────────────────────────────────────────────────
// Route to downstream worker
// ──────────────────────────────────────────────────────────────────────────

function getWorkerForPath(path: string, env: Env): Fetcher | null {
  // Strip /api prefix for matching
  const normalized = path.replace(/^\/api/, '');

  if (normalized.startsWith('/auth'))        return env.AUTH_WORKER;
  if (normalized.startsWith('/bookkeeping')) return env.BOOKKEEPING_WORKER;
  if (normalized.startsWith('/payroll'))     return env.PAYROLL_WORKER;
  if (normalized.startsWith('/bizforma'))    return env.BIZFORMA_WORKER;
  if (normalized.startsWith('/scout'))       return env.SCOUT_WORKER;
  if (normalized.startsWith('/pbx'))         return env.PBX_WORKER;
  if (normalized.startsWith('/report'))      return env.REPORT_WORKER;

  return null;
}

function isPublicRoute(method: string, pathname: string): boolean {
  return PUBLIC_ROUTES.some(
    r => r.method === method && pathname === r.path
  );
}

// ──────────────────────────────────────────────────────────────────────────
// Main handler
// ──────────────────────────────────────────────────────────────────────────

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const startMs = Date.now();
    const url     = new URL(request.url);
    const origin  = request.headers.get('Origin');

    // ── 1. CORS preflight ──────────────────────────────────────────────
    if (request.method === 'OPTIONS') {
      return corsPreflightResponse(origin, env);
    }

    // ── 2. Health & version (no auth, no rate limit) ───────────────────
    if (url.pathname === '/api/health') {
      return addCors(
        Response.json({ status: 'ok', service: 'insighthunter-dispatch', env: env.ENVIRONMENT }),
        origin, env
      );
    }
    if (url.pathname === '/api/version') {
      return addCors(
        Response.json({ version: '1.0.0', build: new Date().toISOString().split('T')[0] }),
        origin, env
      );
    }

    // ── 3. Rate limiting ──────────────────────────────────────────────
    const clientIP = request.headers.get('CF-Connecting-IP') ?? 'unknown';
    const { allowed, remaining } = await checkRateLimit(clientIP, env);

    if (!allowed) {
      const resp = Response.json(
        { error: 'Rate limit exceeded. Please slow down and try again.' },
        {
          status: 429,
          headers: {
            'Retry-After': env.RATE_LIMIT_WINDOW_SECONDS ?? '60',
            'X-RateLimit-Remaining': '0',
          }
        }
      );
      return addCors(resp, origin, env);
    }

    // ── 4. JWT authentication for protected routes ────────────────────
    let authenticatedUser: JWTPayload | null = null;
    const isPublic = isPublicRoute(request.method, url.pathname);

    if (!isPublic) {
      const authHeader = request.headers.get('Authorization') ?? '';
      const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;

      if (!token) {
        return addCors(
          Response.json({ error: 'Authentication required.' }, { status: 401 }),
          origin, env
        );
      }

      const secret = env.JWT_SECRET ?? '';
      if (!secret) {
        console.error('[dispatch] JWT_SECRET not configured');
        return addCors(
          Response.json({ error: 'Server configuration error.' }, { status: 500 }),
          origin, env
        );
      }

      authenticatedUser = await verifyJWT(token, secret);

      if (!authenticatedUser) {
        return addCors(
          Response.json({ error: 'Invalid or expired token. Please sign in again.' }, { status: 401 }),
          origin, env
        );
      }
    }

    // ── 5. Route to downstream worker ─────────────────────────────────
    const targetWorker = getWorkerForPath(url.pathname, env);

    if (!targetWorker) {
      return addCors(
        Response.json({ error: `No route found for ${url.pathname}` }, { status: 404 }),
        origin, env
      );
    }

    // Build enriched request — inject user identity headers so downstream
    // workers never have to verify JWTs themselves (trust the dispatch boundary).
    const enrichedHeaders = new Headers(request.headers);
    enrichedHeaders.set('X-IH-Request-ID', crypto.randomUUID());
    enrichedHeaders.set('X-IH-Dispatch-At', new Date().toISOString());
    enrichedHeaders.set('X-RateLimit-Remaining', String(remaining));

    if (authenticatedUser) {
      enrichedHeaders.set('X-IH-User',  authenticatedUser.sub);
      enrichedHeaders.set('X-IH-Org',   authenticatedUser.org);
      enrichedHeaders.set('X-IH-Email', authenticatedUser.email);
      enrichedHeaders.set('X-IH-Tier',  authenticatedUser.tier);
    }

    const enrichedRequest = new Request(request.url, {
      method:  request.method,
      headers: enrichedHeaders,
      body:    ['GET', 'HEAD', 'DELETE'].includes(request.method) ? undefined : request.body,
    });

    let downstreamResponse: Response;

    try {
      downstreamResponse = await targetWorker.fetch(enrichedRequest);
    } catch (err) {
      console.error(`[dispatch] Downstream error on ${url.pathname}:`, err);

      ctx.waitUntil(
        Promise.resolve(
          trackApiEvent(env, request.method, url.pathname, 502, authenticatedUser?.org ?? null, Date.now() - startMs)
        )
      );

      return addCors(
        Response.json(
          { error: 'Upstream service error. Please try again shortly.' },
          { status: 502 }
        ),
        origin, env
      );
    }

    // ── 6. Telemetry ──────────────────────────────────────────────────
    ctx.waitUntil(
      Promise.resolve(
        trackApiEvent(
          env,
          request.method,
          url.pathname,
          downstreamResponse.status,
          authenticatedUser?.org ?? null,
          Date.now() - startMs
        )
      )
    );

    // ── 7. Return with CORS ────────────────────────────────────────────
    return addCors(downstreamResponse, origin, env);
  },
} satisfies ExportedHandler<Env>;
