export interface JWTPayload {
  userId: string;
  orgId: string;
  tier: 'lite' | 'standard' | 'pro';
  email: string;
  iat: number;
  exp: number;
}

export async function signJWT(payload: JWTPayload, secret: string): Promise<string> {
  const enc = new TextEncoder();
  const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }))
    .replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
  const body = btoa(JSON.stringify(payload))
    .replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
  const sigInput = `${header}.${body}`;

  const key = await crypto.subtle.importKey(
    'raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
  );
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(sigInput));
  const sigB64 = btoa(String.fromCharCode(...new Uint8Array(sig)))
    .replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');

  return `${sigInput}.${sigB64}`;
}

export async function verifyJWT(token: string, secret: string): Promise<JWTPayload | null> {
  try {
    const [headerB64, payloadB64, sigB64] = token.split('.');
    if (!headerB64 || !payloadB64 || !sigB64) return null;

    const enc = new TextEncoder();
    const key = await crypto.subtle.importKey(
      'raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['verify']
    );

    const sigBuffer = base64urlToBuffer(sigB64);
    const valid = await crypto.subtle.verify('HMAC', key, sigBuffer, enc.encode(`${headerB64}.${payloadB64}`));
    if (!valid) return null;

    const payload = JSON.parse(atob(payloadB64.replace(/-/g, '+').replace(/_/g, '/'))) as JWTPayload;
    if (payload.exp < Math.floor(Date.now() / 1000)) return null;

    return payload;
  } catch {
    return null;
  }
}

function base64urlToBuffer(b: string): ArrayBuffer {
  const base64 = b.replace(/-/g, '+').replace(/_/g, '/').padEnd(b.length + ((4 - (b.length % 4)) % 4), '=');
  const bin = atob(base64);
  const buf = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) buf[i] = bin.charCodeAt(i);
  return buf.buffer;
}
