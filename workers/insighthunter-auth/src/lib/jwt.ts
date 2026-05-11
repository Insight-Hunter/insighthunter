import type { JWTPayload } from '../types/auth';

const ALG    = { name: 'HMAC', hash: 'SHA-256' };
const ENCODE = (s: string) => btoa(s).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
const DECODE = (s: string) => atob(s.replace(/-/g, '+').replace(/_/g, '/'));

async function importKey(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    'raw', new TextEncoder().encode(secret), ALG, false, ['sign', 'verify']
  );
}

export async function signJWT(payload: Omit<JWTPayload, 'iat' | 'exp'>, secret: string, expiresInSeconds = 900): Promise<string> {
  const header  = ENCODE(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const body    = ENCODE(JSON.stringify({ ...payload, iat: Math.floor(Date.now() / 1000), exp: Math.floor(Date.now() / 1000) + expiresInSeconds }));
  const key     = await importKey(secret);
  const sig     = await crypto.subtle.sign(ALG, key, new TextEncoder().encode(`${header}.${body}`));
  const sigB64  = ENCODE(String.fromCharCode(...new Uint8Array(sig)));
  return `${header}.${body}.${sigB64}`;
}

export async function verifyJWT(token: string, secret: string): Promise<JWTPayload | null> {
  try {
    const [header, body, sig] = token.split('.');
    const key     = await importKey(secret);
    const valid   = await crypto.subtle.verify(
      ALG, key,
      Uint8Array.from(DECODE(sig), c => c.charCodeAt(0)),
      new TextEncoder().encode(`${header}.${body}`)
    );
    if (!valid) return null;
    const payload = JSON.parse(DECODE(body)) as JWTPayload;
    if (payload.exp < Math.floor(Date.now() / 1000)) return null;
    return payload;
  } catch {
    return null;
  }
}
