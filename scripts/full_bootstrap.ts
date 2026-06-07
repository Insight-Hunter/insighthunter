export interface Env {
  AUTH_WORKER: Fetcher; BOOKKEEPING_WORKER: Fetcher; PAYROLL_WORKER: Fetcher;
  BIZFORMA_WORKER: Fetcher; SCOUT_WORKER: Fetcher; PBX_WORKER: Fetcher; REPORT_WORKER: Fetcher;
  SESSIONS: KVNamespace; RATE_LIMIT: KVNamespace; DB: D1Database;
  API_EVENTS: AnalyticsEngineDataset;
  ENVIRONMENT: string; ALLOWED_ORIGINS: string;
  RATE_LIMIT_WINDOW_SECONDS: string; RATE_LIMIT_MAX_REQUESTS: string; JWT_SECRET?: string;
}

interface JWTPayload { sub: string; org: string; email: string; tier: 'lite'|'standard'|'pro'; iat: number; exp: number; }

const PUBLIC_ROUTE_PATTERNS = [
  { method: 'POST', path: '/https://auth.insighthunter.app/auth/login' },
  { method: 'POST', path: '/https://auth.insighthunter.app/auth/register' },
  { method: 'POST', path: '/https://auth.insighthunter.app/auth/refresh' },
  { method: 'POST', path: '/https://auth.insighthunter.app/auth/forgot-password' },
  { method: 'GET', path: '/api/health' },
  { method: 'GET', path: '/api/version' },
];

function normalizePath(pathname: string): string {
  if (!pathname) return '/';
  const cleaned = pathname.replace(/\/+$/, '');
  return cleaned || '/';
}

function isPublicRoute(method: string, pathname: string): boolean {
  const normalizedMethod = method.toUpperCase();
  const normalizedPath = normalizePath(pathname);

  return PUBLIC_ROUTE_PATTERNS.some((route) => {
    return route.method === normalizedMethod && normalizePath(route.path) === normalizedPath;
  });
}

function getAllowedOrigins(env: Env) { return env.ALLOWED_ORIGINS.split(',').map(o => o.trim()); }

function corsHeaders(origin: string|null, env: Env): Record<string,string> {
  const allowed = getAllowedOrigins(env);
  const isAllowed = origin && (allowed.includes(origin) || env.ENVIRONMENT !== 'production');
  return {
    'Access-Control-Allow-Origin': isAllowed ? (origin ?? '*') : allowed[0] ?? '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-IH-Org',
    'Access-Control-Allow-Credentials': 'true', 'Access-Control-Max-Age': '86400', 'Vary': 'Origin',
  };
}

function addCors(response: Response, origin: string|null, env: Env): Response {
  const headers = new Headers(response.headers);
  for (const [k,v] of Object.entries(corsHeaders(origin, env))) headers.set(k, v);
  return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
}

async function checkRateLimit(ip: string, env: Env): Promise<{ allowed: boolean; remaining: number }> {
  const windowSec = parseInt(env.RATE_LIMIT_WINDOW_SECONDS ?? '60', 10);
  const maxReqs   = parseInt(env.RATE_LIMIT_MAX_REQUESTS   ?? '120', 10);
  const windowStart = Math.floor(Date.now() / 1000 / windowSec) * windowSec;
  const key = `rl:${ip}:${windowStart}`;
  try {
    const raw = await env.RATE_LIMIT.get(key);
    const count = raw ? parseInt(raw, 10) : 0;
    if (count >= maxReqs) return { allowed: false, remaining: 0 };
    env.RATE_LIMIT.put(key, String(count + 1), { expirationTtl: windowSec * 2 });
    return { allowed: true, remaining: maxReqs - count - 1 };
  } catch { return { allowed: true, remaining: maxReqs }; }
}

async function verifyJWT(token: string, secret: string): Promise<JWTPayload|null> {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const [headerB64, payloadB64, sigB64] = parts;
    const enc = new TextEncoder(); const keyData = enc.encode(secret);
    const cryptoKey = await crypto.subtle.importKey('raw', keyData, { name:'HMAC', hash:'SHA-256' }, false, ['verify']);
    const data = enc.encode(`${headerB64}.${payloadB64}`);
    const sig = Uint8Array.from(atob(sigB64.replace(/-/g,'+').replace(/_/g,'/')), c => c.charCodeAt(0));
    const valid = await crypto.subtle.verify('HMAC', cryptoKey, sig, data);
    if (!valid) return null;
    const payload = JSON.parse(atob(payloadB64.replace(/-/g,'+').replace(/_/g,'/'))) as JWTPayload;
    if (payload.exp < Math.floor(Date.now() / 1000)) return null;
    return payload;
  } catch { return null; }
}

function trackApiEvent(env: Env, method: string, path: string, status: number, orgId: string|null, latencyMs: number): void {
  try { env.API_EVENTS.writeDataPoint({ doubles:[status, latencyMs], blobs:[method, path, env.ENVIRONMENT], indexes:[orgId ?? 'anonymous'] }); } catch {}
}

function getWorkerForPath(path: string, env: Env): Fetcher|null {
  const n = path.replace(/^\/api/, '');
  if (n.startsWith('/auth'))        return env.AUTH_WORKER;
  if (n.startsWith('/bookkeeping')) return env.BOOKKEEPING_WORKER;
  if (n.startsWith('/payroll'))     return env.PAYROLL_WORKER;
  if (n.startsWith('/bizforma'))    return env.BIZFORMA_WORKER;
  if (n.startsWith('/scout'))       return env.SCOUT_WORKER;
  if (n.startsWith('/pbx'))         return env.PBX_WORKER;
  if (n.startsWith('/report'))      return env.REPORT_WORKER;
  return null;
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const startMs = Date.now();
    const url = new URL(request.url);
    const origin = request.headers.get('Origin');

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders(origin, env) });
    }
    if (url.pathname === '/api/health') {
      return addCors(Response.json({ status:'ok', service:'insighthunter-dispatch', env: env.ENVIRONMENT }), origin, env);
    }
    if (url.pathname === '/api/version') {
      return addCors(Response.json({ version:'1.0.0', build: new Date().toISOString().split('T')[0] }), origin, env);
    }

    const clientIP = request.headers.get('CF-Connecting-IP') ?? 'unknown';
    const { allowed, remaining } = await checkRateLimit(clientIP, env);
    if (!allowed) {
      // FIX 1: Response.json takes the options block as the second parameter, headers must live inside it
      return addCors(Response.json({ error:'Rate limit exceeded. Please slow down and try again.' }, { status:429, headers:{ 'Retry-After': env.RATE_LIMIT_WINDOW_SECONDS ?? '60', 'X-RateLimit-Remaining':'0' } }), origin, env);
    }

    let authenticatedUser: JWTPayload|null = null;
    if (!isPublicRoute(request.method, url.pathname)) {
      const authHeader = request.headers.get('Authorization') ?? '';
      const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
      if (!token) return addCors(Response.json({ error:'Authentication required.' }, { status:401 }), origin, env);
      const secret = env.JWT_SECRET ?? '';
      if (!secret) { console.error('[dispatch] JWT_SECRET not configured'); return addCors(Response.json({ error:'Server configuration error.' }, { status:500 }), origin, env); }
      authenticatedUser = await verifyJWT(token, secret);
      if (!authenticatedUser) return addCors(Response.json({ error:'Invalid or expired token. Please sign in again.' }, { status:401 }), origin, env);
    }

    const targetWorker = getWorkerForPath(url.pathname, env);
    if (!targetWorker) return addCors(Response.json({ error:`No route found for ${url.pathname}` }, { status:404 }), origin, env);

    const enrichedHeaders = new Headers(request.headers);
    enrichedHeaders.set('X-IH-Request-ID', crypto.randomUUID());
    enrichedHeaders.set('X-IH-Dispatch-At', new Date().toISOString());
    enrichedHeaders.set('X-RateLimit-Remaining', String(remaining));
    if (authenticatedUser) {
      enrichedHeaders.set('X-IH-User', authenticatedUser.sub);
      enrichedHeaders.set('X-IH-Org',  authenticatedUser.org);
      enrichedHeaders.set('X-IH-Email',authenticatedUser.email);
      enrichedHeaders.set('X-IH-Tier', authenticatedUser.tier);
    }

    const forwardUrl = new URL(request.url);
    forwardUrl.pathname = forwardUrl.pathname.replace(/^\/api(?=\/|$)/, '') || '/';
    const enrichedRequest = new Request(forwardUrl.toString(), {
      method: request.method,
      headers: enrichedHeaders,
      body: ['GET','HEAD','DELETE'].includes(request.method) ? undefined : request.body,
    });

    let downstreamResponse: Response;
    try {
      downstreamResponse = await targetWorker.fetch(enrichedRequest);
    } catch (err) {
      console.error(`[dispatch] Downstream worker error: ${err}`);
      return addCors(Response.json({ error: 'Downstream worker failed.' }, { status: 502 }), origin, env);
    }

    // FIX 2: Wrapped the ending block correctly, tracking analytics before returning the final response
    trackApiEvent(env, request.method, url.pathname, downstreamResponse.status, authenticatedUser?.org ?? null, Date.now() - startMs);
    return addCors(downstreamResponse, origin, env);
  }
};
