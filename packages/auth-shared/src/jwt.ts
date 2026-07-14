// JWT verification using Web Crypto API — works in Cloudflare Workers edge runtime
// Supports HS256 (shared secret) and RS256 (public key from auth.insighthunter.app JWKS)

export interface JWTPayload {
  sub: string;
  email?: string;
  name?: string;
  tenant_id?: string;
  role?: string;
  plan?: string;
  iat?: number;
  exp?: number;
  iss?: string;
  aud?: string | string[];
}

export interface JWTVerifyResult {
  valid: boolean;
  payload?: JWTPayload;
  error?: string;
}

function base64UrlDecode(str: string): Uint8Array {
  const padded = str.replace(/-/g, "+").replace(/_/g, "/").padEnd(str.length + ((4 - (str.length % 4)) % 4), "=");
  const binary = atob(padded);
  return Uint8Array.from(binary, (c) => c.charCodeAt(0));
}

export function decodeJWTPayload(token: string): JWTPayload | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    const decoded = new TextDecoder().decode(base64UrlDecode(parts[1]));
    return JSON.parse(decoded) as JWTPayload;
  } catch {
    return null;
  }
}

export function isTokenExpired(payload: JWTPayload): boolean {
  if (!payload.exp) return false;
  return Date.now() / 1000 > payload.exp;
}

// HS256 verification using a shared secret string
export async function verifyHS256(token: string, secret: string): Promise<JWTVerifyResult> {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return { valid: false, error: "malformed_token" };

    const [headerB64, payloadB64, signatureB64] = parts;
    const encoder = new TextEncoder();
    const keyData = encoder.encode(secret);

    const cryptoKey = await crypto.subtle.importKey(
      "raw",
      keyData,
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["verify"]
    );

    const signingInput = encoder.encode(`${headerB64}.${payloadB64}`);
    const signature = base64UrlDecode(signatureB64);

    const valid = await crypto.subtle.verify("HMAC", cryptoKey, signature, signingInput);
    if (!valid) return { valid: false, error: "invalid_signature" };

    const payload = decodeJWTPayload(token);
    if (!payload) return { valid: false, error: "invalid_payload" };
    if (isTokenExpired(payload)) return { valid: false, error: "token_expired" };

    return { valid: true, payload };
  } catch (err) {
    return { valid: false, error: err instanceof Error ? err.message : "unknown_error" };
  }
}

// Fetch JWKS from auth.insighthunter.app and cache in KV or module-level map
const jwksCache = new Map<string, CryptoKey>();

export async function verifyRS256(token: string, jwksUrl: string): Promise<JWTVerifyResult> {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return { valid: false, error: "malformed_token" };

    const [headerB64, payloadB64, signatureB64] = parts;
    const headerStr = new TextDecoder().decode(base64UrlDecode(headerB64));
    const header = JSON.parse(headerStr) as { alg: string; kid?: string };

    if (header.alg !== "RS256") return { valid: false, error: `unsupported_algorithm:${header.alg}` };

    const cacheKey = `${jwksUrl}:${header.kid ?? "default"}`;
    let publicKey = jwksCache.get(cacheKey);

    if (!publicKey) {
      const resp = await fetch(jwksUrl);
      if (!resp.ok) return { valid: false, error: "jwks_fetch_failed" };
      const jwks = await resp.json() as { keys: Array<Record<string, string>> };
      const jwk = header.kid
        ? jwks.keys.find((k) => k["kid"] === header.kid)
        : jwks.keys[0];
      if (!jwk) return { valid: false, error: "jwk_not_found" };

      publicKey = await crypto.subtle.importKey(
        "jwk",
        jwk,
        { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
        false,
        ["verify"]
      );
      jwksCache.set(cacheKey, publicKey);
    }

    const encoder = new TextEncoder();
    const signingInput = encoder.encode(`${headerB64}.${payloadB64}`);
    const signature = base64UrlDecode(signatureB64);

    const valid = await crypto.subtle.verify("RSASSA-PKCS1-v1_5", publicKey, signature, signingInput);
    if (!valid) return { valid: false, error: "invalid_signature" };

    const payload = decodeJWTPayload(token);
    if (!payload) return { valid: false, error: "invalid_payload" };
    if (isTokenExpired(payload)) return { valid: false, error: "token_expired" };

    return { valid: true, payload };
  } catch (err) {
    return { valid: false, error: err instanceof Error ? err.message : "unknown_error" };
  }
}
