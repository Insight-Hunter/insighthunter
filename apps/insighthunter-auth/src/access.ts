// access.ts — Cloudflare Access JWT validation + identity fetch
// All JWT verification logic lives HERE. index.ts imports from here only.

export interface AccessJWTPayload {
  aud: string[];
  email: string;
  name?: string;
  sub: string;
  iss: string;
  iat: number;
  nbf?: number;
  exp: number;
  groups?: string[];
}

export interface CloudflareIdentity {
  email: string;
  name: string;
  groups: string[];
  user_uuid: string;
  account_id?: string;
}

function decodeBase64Url(input: string): Uint8Array {
  const normalized = input.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized + "=".repeat((4 - (normalized.length % 4)) % 4);
  const binary = atob(padded);
  return Uint8Array.from(binary, (c) => c.charCodeAt(0));
}

function decodeJsonBase64Url<T>(input: string): T {
  const bytes = decodeBase64Url(input);
  const text = new TextDecoder().decode(bytes);
  return JSON.parse(text) as T;
}

/**
 * Validates a Cloudflare Access JWT.
 * Verifies: structure, signature (RS256 via JWKS), aud, iss, exp, nbf.
 */
export async function validateAccessJWT(
  token: string,
  teamDomain: string,
  policyAud: string,
): Promise<AccessJWTPayload | null> {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;

    const [headerB64, payloadB64, sigB64] = parts;
    const header = decodeJsonBase64Url<{ kid: string; alg?: string }>(headerB64);

    // Only accept RS256
    if (header.alg && header.alg !== "RS256") {
      console.warn("[auth] Unexpected JWT alg:", header.alg);
      return null;
    }

    // Fetch JWKS with edge caching (1 hour)
    const certsResp = await fetch(`${teamDomain}/cdn-cgi/access/certs`, {
      cf: { cacheTtl: 3600, cacheEverything: true },
    } as RequestInit);
    if (!certsResp.ok) {
      console.error("[auth] Failed to fetch JWKS:", certsResp.status);
      return null;
    }

    const { keys } = await certsResp.json<{ keys: (JsonWebKey & { kid?: string })[] }>();
    const matchingKey = keys.find((k) => k.kid === header.kid);
    if (!matchingKey) {
      console.warn("[auth] No matching JWK for kid:", header.kid);
      return null;
    }

    const cryptoKey = await crypto.subtle.importKey(
      "jwk",
      matchingKey,
      { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
      false,
      ["verify"],
    );

    const valid = await crypto.subtle.verify(
      "RSASSA-PKCS1-v1_5",
      cryptoKey,
      decodeBase64Url(sigB64),
      new TextEncoder().encode(`${headerB64}.${payloadB64}`),
    );
    if (!valid) {
      console.warn("[auth] JWT signature invalid");
      return null;
    }

    const payload = decodeJsonBase64Url<AccessJWTPayload>(payloadB64);
    const now = Math.floor(Date.now() / 1000);

    // Audience check
    if (!payload.aud?.includes(policyAud)) {
      console.warn("[auth] JWT aud mismatch");
      return null;
    }

    // Issuer check — must equal the team domain exactly
    if (payload.iss !== teamDomain) {
      console.warn("[auth] JWT iss mismatch:", payload.iss);
      return null;
    }

    // Expiry check
    if (payload.exp < now) {
      console.warn("[auth] JWT expired");
      return null;
    }

    // Not-before check (allow 30s clock skew)
    if (payload.nbf && payload.nbf > now + 30) {
      console.warn("[auth] JWT not yet valid (nbf)");
      return null;
    }

    // Sub must be present
    if (!payload.sub) return null;

    return payload;
  } catch (err) {
    console.error("[auth] JWT validation error:", err);
    return null;
  }
}

/**
 * Fetches full user identity from the Cloudflare Access identity endpoint.
 * Extracts ONLY the CF_Authorization cookie — never forwards other cookies.
 */
export async function getIdentity(
  request: Request,
  teamDomain: string,
): Promise<CloudflareIdentity | null> {
  try {
    const rawCookie = request.headers.get("Cookie") ?? "";
    // Extract only the CF_Authorization cookie
    const cfCookie = rawCookie
      .split(";")
      .map((c) => c.trim())
      .find((c) => c.startsWith("CF_Authorization="));

    if (!cfCookie) {
      console.warn("[auth] CF_Authorization cookie not found");
      return null;
    }

    const res = await fetch(`${teamDomain}/cdn-cgi/access/get-identity`, {
      headers: { Cookie: cfCookie },
    });

    if (!res.ok) {
      console.warn("[auth] getIdentity response not OK:", res.status);
      return null;
    }

    const identity = await res.json<CloudflareIdentity>();
    if (!identity?.email) return null;

    return identity;
  } catch (err) {
    console.error("[auth] getIdentity error:", err);
    return null;
  }
}
