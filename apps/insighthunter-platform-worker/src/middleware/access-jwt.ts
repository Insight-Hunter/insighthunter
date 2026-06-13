// src/middleware/access-jwt.ts
export interface Env {
  POLICY_AUD: string;    // ad7e412e-ea27-4bc0-b4d2-c7b1b194f0ec
  TEAM_DOMAIN: string;   // https://insighthunter.cloudflareaccess.com
}

interface JWTPayload {
  aud: string[];
  email: string;
  exp: number;
  iss: string;
  sub: string;
}

async function validateAccessJWT(request: Request, env: Env): Promise<JWTPayload | null> {
  const token = request.headers.get("Cf-Access-Jwt-Assertion");
  if (!token) return null;

  // Fetch public keys from Cloudflare Access JWKS endpoint
  const certsUrl = `${env.TEAM_DOMAIN}/cdn-cgi/access/certs`;
  const certsResp = await fetch(certsUrl);
  const { keys } = await certsResp.json<{ keys: JsonWebKey[] }>();

  // Decode header to find the right key
  const [headerB64] = token.split(".");
  const header = JSON.parse(atob(headerB64));

  const matchingKey = keys.find((k: any) => k.kid === header.kid);
  if (!matchingKey) return null;

  const cryptoKey = await crypto.subtle.importKey(
    "jwk",
    matchingKey,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["verify"]
  );

  const [, payloadB64, sigB64] = token.split(".");
  const signingInput = new TextEncoder().encode(`${headerB64}.${payloadB64}`);
  const signature = Uint8Array.from(atob(sigB64.replace(/-/g, "+").replace(/_/g, "/")), c => c.charCodeAt(0));

  const valid = await crypto.subtle.verify("RSASSA-PKCS1-v1_5", cryptoKey, signature, signingInput);
  if (!valid) return null;

  const payload: JWTPayload = JSON.parse(atob(payloadB64));

  // Validate audience and expiration
  if (!payload.aud.includes(env.POLICY_AUD)) return null;
  if (payload.exp < Math.floor(Date.now() / 1000)) return null;

  return payload;
}

// Use in your main Worker handler:
export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const jwtPayload = await validateAccessJWT(request, env);

    if (!jwtPayload) {
      return new Response("Unauthorized — Access JWT missing or invalid", {
        status: 401,
        headers: { "WWW-Authenticate": "Bearer" },
      });
    }

    // JWT is valid — jwtPayload.email has the user's identity
    // Continue to your normal Worker logic below
    return new Response(`Hello, ${jwtPayload.email}!`);
  },
};
