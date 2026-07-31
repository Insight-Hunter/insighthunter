// apps/insighthunter-main/src/authz/session.ts
// Resolves JWT or KV session cookie into a typed session object
// Called by every protected API route

import type { Context } from 'hono';
import type { Env } from '../index';

export type Session = {
  userId: string;
  orgId: string;
  role: string;
  email: string;
  name: string;
};

export async function requireSession(
  c: Context<{ Bindings: Env }>
): Promise<Session | null> {
  // 1. Try Authorization Bearer header
  const authHeader = c.req.header('Authorization');
  const token = authHeader?.startsWith('Bearer ')
    ? authHeader.slice(7)
    : getCookieValue(c.req.header('Cookie') ?? '', 'ih_session');

  if (!token) return null;

  // 2. Check KV session store first (set at login by apps/auth)
  const kvSession = await c.env.SESSIONS.get(`session:${token}`, 'json') as Session | null;
  if (kvSession) return kvSession;

  // 3. Fallback: verify JWT directly
  return verifyJWT(token, c.env.JWT_SECRET);
}

async function verifyJWT(token: string, secret: string): Promise<Session | null> {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;

    const [headerB64, payloadB64, sigB64] = parts;
    const encoder = new TextEncoder();

    const key = await crypto.subtle.importKey(
      'raw',
      encoder.encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['verify']
    );

    const data = encoder.encode(`${headerB64}.${payloadB64}`);
    const sig = Uint8Array.from(
      atob(sigB64.replace(/-/g, '+').replace(/_/g, '/')),
      (ch) => ch.charCodeAt(0)
    );

    const valid = await crypto.subtle.verify('HMAC', key, sig, data);
    if (!valid) return null;

    const payload = JSON.parse(atob(payloadB64)) as {
      sub: string;
      org: string;
      role: string;
      email: string;
      name?: string;
      exp: number;
    };

    if (payload.exp < Math.floor(Date.now() / 1000)) return null;

    return {
      userId: payload.sub,
      orgId: payload.org,
      role: payload.role,
      email: payload.email,
      name: payload.name ?? payload.email,
    };
  } catch {
    return null;
  }
}

function getCookieValue(cookieHeader: string, name: string): string | null {
  const match = cookieHeader.match(new RegExp(`(?:^|;\\s*)${name}=([^;]+)`));
  return match?.[1] ?? null;
}
