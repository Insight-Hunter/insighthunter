<<<<<<< HEAD
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
=======
import type { AuthenticatedUser, Jwk, JwksDocument, JwtPayload } from "./types.js";

type JwtHeader = {
  readonly alg?: string;
  readonly kid?: string;
  readonly typ?: string;
};

type JwtVerifierOptions = {
  readonly jwksUrl: string;
  readonly issuer?: string;
  readonly audience?: string | string[];
};

type JwtVerifier = {
  readonly verify: (token: string) => Promise<AuthenticatedUser>;
};

type CryptoSubtleLike = {
  importKey: (
    format: string,
    keyData: JsonWebKey,
    algorithm: string | AlgorithmIdentifier,
    extractable: boolean,
    keyUsages: readonly string[],
  ) => Promise<CryptoKey>;
  verify: (
    algorithm: string | AlgorithmIdentifier,
    key: CryptoKey,
    signature: ArrayBuffer | ArrayBufferView,
    data: ArrayBuffer | ArrayBufferView,
  ) => Promise<boolean>;
};

type CryptoApiLike = {
  readonly subtle?: CryptoSubtleLike;
};

const RS256_IMPORT_ALGORITHM: globalThis.RsaHashedImportParams = {
  name: "RSASSA-PKCS1-v1_5",
  hash: "SHA-256",
};

const RS256_VERIFY_ALGORITHM: AlgorithmIdentifier = {
  name: "RSASSA-PKCS1-v1_5",
};

function getSubtleCrypto(): CryptoSubtleLike {
  const cryptoApi = (globalThis as typeof globalThis & { crypto?: CryptoApiLike }).crypto;

  if (!cryptoApi?.subtle) {
    throw new Error("Web Crypto API is not available in this runtime.");
  }

  return cryptoApi.subtle;
}

function base64UrlDecode(value: string): Uint8Array {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padding = normalized.length % 4;
  const padded = padding === 0 ? normalized : normalized + "=".repeat(4 - padding);

  const binary = globalThis.atob(padded);
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

function decodeSegment<T>(segment: string): T {
  const bytes = base64UrlDecode(segment);
  const decoded = new TextDecoder().decode(bytes);
  return JSON.parse(decoded) as T;
}

function splitToken(token: string): [string, string, string] {
  const parts = token.split(".");

  if (parts.length !== 3) {
    throw new Error("Invalid JWT format.");
  }

  return [parts[0], parts[1], parts[2]];
}

function normalizeAudience(value?: string | string[]): readonly string[] {
  if (!value) {
    return [];
  }

  return Array.isArray(value) ? value : [value];
}

function isAudienceAllowed(
  tokenAudience: string | string[] | undefined,
  expectedAudience: readonly string[],
): boolean {
  const allowedAudiences = normalizeAudience(tokenAudience);

  if (allowedAudiences.length === 0) {
    return expectedAudience.length === 0;
  }

  return allowedAudiences.some((audience) => expectedAudience.includes(audience));
}

async function getJwks(jwksUrl: string): Promise<JwksDocument> {
  const response = await fetch(jwksUrl);

  if (!response.ok) {
    throw new Error(`Unable to fetch JWKS: ${response.status}`);
  }

  return (await response.json()) as JwksDocument;
}

function getVerificationAlgorithm(jwk: Jwk): AlgorithmIdentifier {
  if (jwk.kty !== "RSA") {
    throw new Error(`Unsupported JWK key type: ${jwk.kty}`);
  }

  return RS256_VERIFY_ALGORITHM;
}

async function importVerificationKey(jwk: Jwk): Promise<CryptoKey> {
  if (jwk.kty !== "RSA") {
    throw new Error(`Unsupported JWK key type: ${jwk.kty}`);
  }

  const subtle = getSubtleCrypto();
  const keyData = {
    ...jwk,
    kty: jwk.kty,
  } as JsonWebKey;

  return subtle.importKey(
    "jwk",
    keyData,
    RS256_IMPORT_ALGORITHM,
    false,
    ["verify"],
  );
}

async function verifySignature(token: string, jwk: Jwk): Promise<boolean> {
  const [headerSegment, payloadSegment, signatureSegment] = splitToken(token);
  const signingInput = `${headerSegment}.${payloadSegment}`;
  const signature = base64UrlDecode(signatureSegment);
  const subtle = getSubtleCrypto();
  const key = await importVerificationKey(jwk);
  const data = new TextEncoder().encode(signingInput);

  return subtle.verify(
    getVerificationAlgorithm(jwk),
    key,
    signature,
    data,
  );
}

async function verifyJwtToken(token: string, options: JwtVerifierOptions): Promise<AuthenticatedUser> {
  if (!token) {
    throw new Error("A JWT is required.");
  }

  const [headerSegment, payloadSegment] = splitToken(token);
  const header = decodeSegment<JwtHeader>(headerSegment);
  const payload = decodeSegment<JwtPayload>(payloadSegment);
  const now = Math.floor(Date.now() / 1000);

  if (payload.iss && options.issuer && payload.iss !== options.issuer) {
    throw new Error("JWT issuer mismatch.");
  }

  if (payload.aud && !isAudienceAllowed(payload.aud, normalizeAudience(options.audience))) {
    throw new Error("JWT audience mismatch.");
  }

  if (typeof payload.exp === "number" && payload.exp <= now) {
    throw new Error("JWT has expired.");
  }

  if (typeof payload.nbf === "number" && payload.nbf > now) {
    throw new Error("JWT is not yet valid.");
  }

  const jwks = await getJwks(options.jwksUrl);
  const jwk = jwks.keys.find((candidate) => candidate.kid === header.kid);

  if (!jwk) {
    throw new Error("No matching JWK was found for this JWT.");
  }

  const isValidSignature = await verifySignature(token, jwk);

  if (!isValidSignature) {
    throw new Error("JWT signature verification failed.");
  }

  if (!payload.sub) {
    throw new Error("JWT does not contain a subject.");
  }

  return {
    subject: payload.sub,
    email: payload.email,
    orgId: payload.org_id,
  };
}

export function createRemoteJwksVerifier(options: JwtVerifierOptions): JwtVerifier {
  return {
    verify: async (token: string) => verifyJwtToken(token, options),
  };
}

export async function verifyJwt(token: string, options: JwtVerifierOptions): Promise<AuthenticatedUser> {
  return verifyJwtToken(token, options);
>>>>>>> 3c37f2b (auth and main)
}
