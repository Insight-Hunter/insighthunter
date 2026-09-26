import type { AuthenticatedUser, Jwk, JwksDocument, JwtPayload } from "./types";

type JwtHeader = {
  readonly alg?: string;
  readonly kid?: string;
};

type JwtVerifierOptions = {
  readonly jwksUrl: string;
  readonly issuer?: string;
  readonly audience?: string | string[];
};

type JwtVerifier = {
  readonly verify: (token: string) => Promise<AuthenticatedUser>;
};

export interface JWTVerifyResult {
  valid: boolean;
  payload?: JwtPayload;
  error?: string;
}

function base64UrlDecode(value: string): Uint8Array {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized.padEnd(normalized.length + ((4 - (normalized.length % 4)) % 4), "=");
  const binary = atob(padded);
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

function splitToken(token: string): [string, string, string] {
  const parts = token.split(".");
  if (parts.length !== 3) throw new Error("Invalid JWT format.");
  return [parts[0], parts[1], parts[2]];
}

function decodeSegment<T>(segment: string): T {
  return JSON.parse(new TextDecoder().decode(base64UrlDecode(segment))) as T;
}

function isExpired(payload: JwtPayload): boolean {
  return typeof payload.exp === "number" && payload.exp <= Math.floor(Date.now() / 1000);
}

export function decodeJWTPayload(token: string): JwtPayload | null {
  try {
    const [, payloadSegment] = splitToken(token);
    return decodeSegment<JwtPayload>(payloadSegment);
  } catch {
    return null;
  }
}

export async function verifyHS256(token: string, secret: string): Promise<JWTVerifyResult> {
  try {
    const [headerSegment, payloadSegment, signatureSegment] = splitToken(token);
    const key = await crypto.subtle.importKey(
      "raw",
      new TextEncoder().encode(secret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["verify"],
    );
    const valid = await crypto.subtle.verify(
      "HMAC",
      key,
      base64UrlDecode(signatureSegment).buffer as ArrayBuffer,
      new TextEncoder().encode(`${headerSegment}.${payloadSegment}`).buffer as ArrayBuffer,
    );
    const payload = decodeJWTPayload(token);
    if (!valid) return { valid: false, error: "invalid_signature" };
    if (!payload) return { valid: false, error: "invalid_payload" };
    if (isExpired(payload)) return { valid: false, error: "token_expired" };
    return { valid: true, payload };
  } catch (error) {
    return { valid: false, error: error instanceof Error ? error.message : "unknown_error" };
  }
}

const jwksCache = new Map<string, CryptoKey>();

export async function verifyRS256(token: string, jwksUrl: string): Promise<JWTVerifyResult> {
  try {
    const [headerSegment, payloadSegment, signatureSegment] = splitToken(token);
    const header = decodeSegment<JwtHeader>(headerSegment);
    if (header.alg !== "RS256") return { valid: false, error: "unsupported_algorithm" };

    const cacheKey = `${jwksUrl}:${header.kid ?? "default"}`;
    let publicKey = jwksCache.get(cacheKey);
    if (!publicKey) {
      const response = await fetch(jwksUrl);
      if (!response.ok) return { valid: false, error: "jwks_fetch_failed" };
      const jwks = (await response.json()) as JwksDocument;
      const jwk = header.kid
        ? jwks.keys.find((candidate) => candidate.kid === header.kid)
        : jwks.keys[0];
      if (!jwk) return { valid: false, error: "jwk_not_found" };
      publicKey = await crypto.subtle.importKey(
        "jwk",
        jwk as JsonWebKey,
        { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
        false,
        ["verify"],
      );
      jwksCache.set(cacheKey, publicKey);
    }

    const valid = await crypto.subtle.verify(
      "RSASSA-PKCS1-v1_5",
      publicKey,
      base64UrlDecode(signatureSegment).buffer as ArrayBuffer,
      new TextEncoder().encode(`${headerSegment}.${payloadSegment}`).buffer as ArrayBuffer,
    );
    const payload = decodeJWTPayload(token);
    if (!valid) return { valid: false, error: "invalid_signature" };
    if (!payload) return { valid: false, error: "invalid_payload" };
    if (isExpired(payload)) return { valid: false, error: "token_expired" };
    return { valid: true, payload };
  } catch (error) {
    return { valid: false, error: error instanceof Error ? error.message : "unknown_error" };
  }
}

async function verifyJwtToken(
  token: string,
  options: JwtVerifierOptions,
): Promise<AuthenticatedUser> {
  const [headerSegment, payloadSegment] = splitToken(token);
  const header = decodeSegment<JwtHeader>(headerSegment);
  const payload = decodeSegment<JwtPayload>(payloadSegment);
  if (header.alg !== "RS256") throw new Error("Unsupported JWT algorithm.");
  if (options.issuer && payload.iss !== options.issuer) throw new Error("JWT issuer mismatch.");
  if (isExpired(payload)) throw new Error("JWT has expired.");
  const result = await verifyRS256(token, options.jwksUrl);
  if (!result.valid) throw new Error(result.error ?? "JWT verification failed.");
  if (!payload.sub) throw new Error("JWT does not contain a subject.");
  return { subject: payload.sub, email: payload.email, orgId: payload.org_id };
}

export function createRemoteJwksVerifier(options: JwtVerifierOptions): JwtVerifier {
  return { verify: (token) => verifyJwtToken(token, options) };
}

export async function verifyJwt(
  token: string,
  options: JwtVerifierOptions,
): Promise<AuthenticatedUser> {
  return verifyJwtToken(token, options);
}
