import type { Env, AuthContext } from '../types';

function base64UrlDecode(str: string): Uint8Array {
  const padded = str.replace(/-/g, '+').replace(/_/g, '/').padEnd(str.length + (4 - str.length % 4) % 4, '=');
  const bin = atob(padded);
  return Uint8Array.from(bin, c => c.charCodeAt(0));
}

async function getHmacKey(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['verify'],
  );
}

export async function verifyJwt(token: string, secret: string): Promise<Record<string, unknown>> {
  const parts = token.split('.');
  if (parts.length !== 3) throw new Error('Invalid JWT structure');

  const [headerB64, payloadB64, sigB64] = parts;
  const key = await getHmacKey(secret);
  const data = new TextEncoder().encode(`${headerB64}.${payloadB64}`);
  const sig  = base64UrlDecode(sigB64);

  const valid = await crypto.subtle.verify('HMAC', key, sig, data);
  if (!valid) throw new Error('JWT signature invalid');

  const payload = JSON.parse(new TextDecoder().decode(base64UrlDecode(payloadB64)));
  if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) throw new Error('JWT expired');

  return payload;
}

export async function authMiddleware(
  request: Request, env: Env
): Promise<AuthContext | Response> {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return new Response(JSON.stringify({ error: 'Missing authorization header' }), {
      status: 401, headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const token = authHeader.slice(7);
    const payload = await verifyJwt(token, env.JWT_SECRET);
    return {
      userId: payload.sub as string,
      orgId:  payload.org_id as string,
      role:   (payload.role as AuthContext['role']) ?? 'member',
      plan:   (payload.plan as AuthContext['plan']) ?? 'free',
    };
  } catch (err) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401, headers: { 'Content-Type': 'application/json' },
    });
  }
}
