import { createMiddleware } from 'hono/factory';

export const verifyJWT = createMiddleware(async (c, next) => {
  const authHeader = c.req.header('Authorization');
  const token = authHeader?.replace('Bearer ', '') || c.req.header('x-ih-token');

  if (!token) {
    return c.json({ error: 'Unauthorized', code: 'NO_TOKEN' }, 401);
  }

  try {
    const secret = (c.env as any).JWT_SECRET as string;
    const encoder = new TextEncoder();
    const keyData = encoder.encode(secret);

    const cryptoKey = await crypto.subtle.importKey(
      'raw',
      keyData,
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['verify']
    );

    const [headerB64, payloadB64, sigB64] = token.split('.');
    if (!headerB64 || !payloadB64 || !sigB64) {
      return c.json({ error: 'Invalid token format', code: 'INVALID_TOKEN' }, 401);
    }

    const sigBuffer = base64urlToBuffer(sigB64);
    const data = encoder.encode(`${headerB64}.${payloadB64}`);

    const valid = await crypto.subtle.verify('HMAC', cryptoKey, sigBuffer, data);
    if (!valid) return c.json({ error: 'Invalid signature', code: 'INVALID_SIGNATURE' }, 401);

    const payload = JSON.parse(atob(payloadB64.replace(/-/g, '+').replace(/_/g, '/')));

    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) {
      return c.json({ error: 'Token expired', code: 'TOKEN_EXPIRED' }, 401);
    }

    c.set('userId' as never, payload.userId);
    c.set('orgId' as never, payload.orgId);
    c.set('tier' as never, payload.tier);
    c.set('email' as never, payload.email);

    await next();
  } catch {
    return c.json({ error: 'Token verification failed', code: 'VERIFY_FAILED' }, 401);
  }
});

function base64urlToBuffer(base64url: string): ArrayBuffer {
  const base64 = base64url.replace(/-/g, '+').replace(/_/g, '/');
  const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '=');
  const binary = atob(padded);
  const buffer = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) buffer[i] = binary.charCodeAt(i);
  return buffer.buffer;
}
