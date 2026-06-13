import { AccessJWTPayload, CloudflareIdentity } from "./types";

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
 * Validates a Cloudflare Access JWT using the public JWKS endpoint.
 * Verifies signature, audience (AUD), and expiration.
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

    // Decode header to get kid
    const header = decodeJsonBase64Url<{ kid: string; alg: string }>(headerB64);

    // Fetch public keys from Cloudflare Access JWKS endpoint
    const certsUrl = `${teamDomain}/cdn-cgi/access/certs`;
    const certsResp = await fetch(certsUrl, {
      cf: { cacheTtl: 3600, cacheEverything: true },
    } as RequestInit);
    if (!certsResp.ok) return null;

    const { keys } = await certsResp.json<{ keys: JsonWebKey[] & { kid?: string }[] }>();
    const matchingKey = keys.find((k: any) => k.kid === header.kid);
    if (!matchingKey) return null;

    const cryptoKey = await crypto.subtle.importKey(
      "jwk",
      matchingKey,
      { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
      false,
      ["verify"],
    );

    const signingInput = new TextEncoder().encode(`${headerB64}.${payloadB64}`);
    const signature = decodeBase64Url(sigB64);

    const valid = await crypto.subtle.verify(
      "RSASSA-PKCS1-v1_5",
      cryptoKey,
      signature,
      signingInput,
    );
    if (!valid) return null;

    const payload = decodeJsonBase64Url<AccessJWTPayload>(payloadB64);

    // Validate audience
    if (!payload.aud || !payload.aud.includes(policyAud)) return null;

    // Validate expiry
    if (payload.exp < Math.floor(Date.now() / 1000)) return null;

    return payload;
  } catch (err) {
    console.error("[auth] JWT validation error:", err);
    return null;
  }
}

/**
 * Fetches full user identity from Cloudflare Access identity endpoint.
 * Requires the CF_Authorization cookie to be present on the request.
 */
export async function getIdentity(
  request: Request,
  teamDomain: string,
): Promise<CloudflareIdentity | null> {
  try {
    const res = await fetch(`${teamDomain}/cdn-cgi/access/get-identity`, {
      headers: { Cookie: request.headers.get("Cookie") ?? "" },
    });
    if (!res.ok) return null;
    return await res.json<CloudflareIdentity>();
  } catch (err) {
    console.error("[auth] getIdentity error:", err);
    return null;
  }
}
