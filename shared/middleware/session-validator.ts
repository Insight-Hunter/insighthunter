// shared/middleware/session-validator.ts
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
}
