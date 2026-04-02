import type { JWTPayload, AuthUser } from '@ih/types';

// ─── Base64URL helpers ────────────────────────────────────────────────────────

function base64urlEncode(data: ArrayBuffer | string): string {
  let bytes: Uint8Array;
  if (typeof data === 'string') {
    bytes = new TextEncoder().encode(data);
  } else {
    bytes = new Uint8Array(data);
  }
  let binary = '';
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

function base64urlDecode(str: string): string {
  const padded = str.replace(/-/g, '+').replace(/_/g, '/');
  const padding = (4 - (padded.length % 4)) % 4;
  const base64 = padded + '='.repeat(padding);
  return atob(base64);
}

// ─── HMAC-SHA256 signing ──────────────────────────────────────────────────────

async function importKey(secret: string): Promise<CryptoKey> {
  const keyData = new TextEncoder().encode(secret);
  return crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify']
  );
}

async function hmacSign(message: string, secret: string): Promise<string> {
  const key = await importKey(secret);
  const msgBytes = new TextEncoder().encode(message);
  const sig = await crypto.subtle.sign('HMAC', key, msgBytes);
  return base64urlEncode(sig);
}

async function hmacVerify(message: string, signature: string, secret: string): Promise<boolean> {
  const key = await importKey(secret);
  const msgBytes = new TextEncoder().encode(message);
  // Decode signature back to ArrayBuffer
  const padded = signature.replace(/-/g, '+').replace(/_/g, '/');
  const padding = (4 - (padded.length % 4)) % 4;
  const binary = atob(padded + '='.repeat(padding));
  const sigBytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) sigBytes[i] = binary.charCodeAt(i);
  return crypto.subtle.verify('HMAC', key, sigBytes, msgBytes);
}

// ─── JWT sign / verify ────────────────────────────────────────────────────────

/**
 * Signs a JWT payload using HMAC-SHA256.
 * Adds iat and exp automatically.
 */
export async function signJWT(
  payload: Omit<JWTPayload, 'iat' | 'exp'>,
  secret: string,
  ttlSeconds: number
): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const fullPayload: JWTPayload = {
    ...payload,
    iat: now,
    exp: now + ttlSeconds,
  };

  const header = base64urlEncode(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const body = base64urlEncode(JSON.stringify(fullPayload));
  const signingInput = `${header}.${body}`;
  const signature = await hmacSign(signingInput, secret);

  return `${signingInput}.${signature}`;
}

/**
 * Verifies a JWT and returns the decoded payload.
 * Throws on invalid signature or expired token.
 */
export async function verifyJWT(token: string, secret: string): Promise<JWTPayload> {
  const parts = token.split('.');
  if (parts.length !== 3) throw new Error('Invalid JWT format');

  const [header, body, signature] = parts;
  const signingInput = `${header}.${body}`;

  const valid = await hmacVerify(signingInput, signature, secret);
  if (!valid) throw new Error('Invalid JWT signature');

  const payload = JSON.parse(base64urlDecode(body)) as JWTPayload;
  const now = Math.floor(Date.now() / 1000);
  if (payload.exp < now) throw new Error('JWT has expired');

  return payload;
}

/**
 * Extracts the Bearer token from an Authorization header.
 * Returns null if the header is missing or malformed.
 */
export function extractBearer(authHeader: string | null | undefined): string | null {
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
  const token = authHeader.slice(7).trim();
  return token.length > 0 ? token : null;
}

/**
 * Converts a verified JWTPayload into an AuthUser object.
 */
export function jwtToAuthUser(payload: JWTPayload): AuthUser {
  return {
    userId: payload.sub,
    orgId: payload.org,
    email: payload.email,
    name: (payload as unknown as Record<string, string>).name ?? '',
    tier: payload.tier,
    role: payload.role as AuthUser['role'],
  };
}
