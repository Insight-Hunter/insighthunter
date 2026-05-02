// shared/middleware/session-validator.ts
<<<<<<< HEAD
// JWT session validator imported by every protected Worker.
// Validates tokens issued by auth.insighthunter.app.

import type { AuthUser, BaseEnv } from "../types/index.ts";

export class AuthError extends Error {
  status: number;
  constructor(message: string, status = 401) {
    super(message);
    this.status = status;
  }
}

// Minimal JWT decode — no external deps, uses crypto.subtle for HMAC-SHA256 verify
function base64UrlDecode(str: string): string {
  const base64 = str.replace(/-/g, "+").replace(/_/g, "/");
  const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), "=");
  return atob(padded);
}

async function verifyJWT(
  token: string,
  secret: string
): Promise<Record<string, unknown>> {
  const parts = token.split(".");
  if (parts.length !== 3) throw new AuthError("Malformed token");

  const [headerB64, payloadB64, sigB64] = parts;
  const enc = new TextEncoder();
  const keyData = enc.encode(secret);
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    keyData,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["verify"]
  );

  const signingInput = `${headerB64}.${payloadB64}`;
  const sigBytes = Uint8Array.from(atob(sigB64.replace(/-/g, "+").replace(/_/g, "/")), (c) =>
    c.charCodeAt(0)
  );

  const valid = await crypto.subtle.verify("HMAC", cryptoKey, sigBytes, enc.encode(signingInput));
  if (!valid) throw new AuthError("Invalid token signature");

  const payload = JSON.parse(base64UrlDecode(payloadB64));

  if (payload.exp && Date.now() / 1000 > payload.exp) {
    throw new AuthError("Token expired");
  }

  return payload;
}

// Extract token from Authorization header or ih_session cookie
function extractToken(request: Request): string | null {
  const authHeader = request.headers.get("Authorization");
  if (authHeader?.startsWith("Bearer ")) return authHeader.slice(7);

  const cookie = request.headers.get("Cookie") ?? "";
  const match = cookie.match(/(?:^|;\s*)ih_session=([^;]+)/);
  return match ? decodeURIComponent(match[1]) : null;
}

// Main validation function — call this at the top of every protected route
export async function validateSession(
  request: Request,
  env: BaseEnv
): Promise<AuthUser> {
  const token = extractToken(request);
  if (!token) throw new AuthError("No session token provided");

  const payload = await verifyJWT(token, env.AUTH_SECRET);

  // Validate required claims
  if (!payload.sub || !payload.orgId || !payload.email || !payload.role) {
    throw new AuthError("Token missing required claims");
  }

  return {
    userId: payload.sub as string,
    orgId: payload.orgId as string,
    firmId: payload.firmId as string | undefined,
    email: payload.email as string,
    role: payload.role as AuthUser["role"],
    plan: (payload.plan as AuthUser["plan"]) ?? "lite",
  };
}

// Redirect helper for browser-facing requests that lack a session
export function authRedirect(request: Request, authOrigin: string): Response {
  const redirectUri = encodeURIComponent(request.url);
  return Response.redirect(`${authOrigin}/login?redirect_uri=${redirectUri}`, 302);
}

// Standard 401 JSON response for API requests
export function unauthorizedJson(message = "Unauthorized"): Response {
  return new Response(JSON.stringify({ ok: false, error: message }), {
    status: 401,
    headers: { "content-type": "application/json; charset=utf-8" },
  });
=======
import type { Context, Next } from 'hono';
import type { Session, SessionValidationResult } from '../types';

function decodeJwtPayload(token: string): Record<string, unknown> | null {
  try {
    const parts = token.split('.');
    if (parts.length < 2) return null;
    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const json = atob(base64);
    return JSON.parse(json);
  } catch {
    return null;
  }
}

function getBearerToken(headerValue?: string | null): string | null {
  if (!headerValue) return null;
  if (!headerValue.startsWith('Bearer ')) return null;
  return headerValue.slice(7).trim();
}

export function buildLoginUrl(authBaseUrl: string, appBaseUrl: string) {
  return `${authBaseUrl}/login?redirect_uri=${encodeURIComponent(`${appBaseUrl}/auth/callback`)}`;
}

export function validateSessionToken(
  token: string | null,
  opts: { authBaseUrl: string; appBaseUrl: string; audience: string }
): SessionValidationResult {
  if (!token) {
    return {
      ok: false,
      status: 401,
      error: 'missing_session',
      loginUrl: buildLoginUrl(opts.authBaseUrl, opts.appBaseUrl),
    };
  }

  const payload = decodeJwtPayload(token);
  if (!payload) {
    return { ok: false, status: 401, error: 'invalid_token' };
  }

  const sub = String(payload.sub || '');
  const email = String(payload.email || '');
  const exp = Number(payload.exp || 0);
  const aud = payload.aud as string | string[] | undefined;
  const orgId = String((payload.org as any)?.orgId || payload.orgId || '');
  const role = String((payload.org as any)?.role || payload.role || 'member') as Session['org']['role'];

  if (!sub || !email || !exp || !orgId) {
    return { ok: false, status: 401, error: 'incomplete_session' };
  }

  if (Date.now() / 1000 >= exp) {
    return { ok: false, status: 401, error: 'session_expired' };
  }

  const audienceOk = Array.isArray(aud) ? aud.includes(opts.audience) : aud === opts.audience;
  if (opts.audience && aud && !audienceOk) {
    return { ok: false, status: 403, error: 'invalid_audience' };
  }

  const session: Session = {
    sub,
    email,
    exp,
    iat: typeof payload.iat === 'number' ? payload.iat : undefined,
    iss: typeof payload.iss === 'string' ? payload.iss : undefined,
    aud,
    user: {
      id: sub,
      email,
      firstName: ((payload.user as any)?.firstName ?? null) as string | null,
      lastName: ((payload.user as any)?.lastName ?? null) as string | null,
    },
    org: {
      orgId,
      orgName: ((payload.org as any)?.orgName ?? null) as string | null,
      role,
    },
  };

  return { ok: true, session };
}

export async function sessionValidator(c: Context, next: Next) {
  const authHeader = c.req.header('authorization');
  const altHeader = c.req.header('x-insighthunter-session');
  const token = getBearerToken(authHeader) || altHeader || null;

  const result = validateSessionToken(token, {
    authBaseUrl: c.env.AUTH_BASE_URL,
    appBaseUrl: c.env.APP_BASE_URL,
    audience: c.env.SESSION_AUDIENCE,
  });

  if (!result.ok) {
    return c.json(
      {
        error: result.error,
        loginUrl: result.loginUrl ?? null,
      },
      result.status
    );
  }

  c.set('session', result.session);
  await next();
>>>>>>> origin/main
}
