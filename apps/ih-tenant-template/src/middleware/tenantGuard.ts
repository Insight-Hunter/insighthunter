import { createMiddleware } from 'hono/factory';
import type { Env } from '../worker';

export const tenantGuard = createMiddleware<{ Bindings: Env }>(async (c, next) => {
  const authHeader = c.req.header('Authorization');
  const token = authHeader?.replace('Bearer ', '') || c.req.header('x-ih-token');

  if (!token) return c.json({ error: 'Unauthorized', code: 'NO_TOKEN' }, 401);

  try {
    const encoder = new TextEncoder();
    const keyData = encoder.encode(c.env.JWT_SECRET);
    const cryptoKey = await crypto.subtle.importKey(
      'raw', keyData, { name: 'HMAC', hash: 'SHA-256' }, false, ['verify']
    );

    const [headerB64, payloadB64, sigB64] = token.split('.');
    const sigBuffer = base64urlToBuffer(sigB64);
    const data = encoder.encode(`${headerB64}.${payloadB64}`);
    const valid = await crypto.subtle.verify('HMAC', cryptoKey, sigBuffer, data);

    if (!valid) return c.json({ error: 'Invalid token', code: 'INVALID_TOKEN' }, 401);

    const payload = JSON.parse(atob(payloadB64.replace(/-/g, '+').replace(/_/g, '/')));

    // CRITICAL: Enforce orgId match — tenant isolation guarantee
    if (payload.orgId !== c.env.ORG_ID) {
      return c.json({ error: 'Forbidden', code: 'WRONG_TENANT' }, 403);
    }

    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) {
      return c.json({ error: 'Token expired', code: 'TOKEN_EXPIRED' }, 401);
    }

    c.set('userId' as never, payload.userId);
    c.set('orgId' as never, payload.orgId);
    c.set('tier' as never, payload.tier);
    c.set('email' as never, payload.email);

    await next();
  } catch {
    return c.json({ error: 'Auth failed', code: 'AUTH_FAILED' }, 401);
  }
});

function base64urlToBuffer(b: string): ArrayBuffer {
  const base64 = b.replace(/-/g, '+').replace(/_/g, '/').padEnd(b.length + ((4 - (b.length % 4)) % 4), '=');
  const bin = atob(base64);
  const buf = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) buf[i] = bin.charCodeAt(i);
  return buf.buffer;
}
