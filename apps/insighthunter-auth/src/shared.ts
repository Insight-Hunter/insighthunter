// shared.ts — Utility helpers shared across all auth route handlers

export const ALLOWED_REDIRECT_HOSTS = new Set([
  "insighthunter.app",
  "www.insighthunter.app",
  "app.insighthunter.app",
  "auth.insighthunter.app",
]);

export const DEFAULT_REDIRECT = "https://app.insighthunter.app/dashboard";
export const SESSION_TTL_SECONDS = 86_400;       // 24 h
export const VERIFY_TOKEN_TTL_SECONDS = 86_400;   // 24 h
export const VALID_PLANS = new Set(["lite", "standard", "pro"]);

// ── Redirect sanitizer ───────────────────────────────────────────────────────

export function sanitizeRedirect(input: string | null): string {
  if (!input) return DEFAULT_REDIRECT;
  try {
    const url = new URL(input);
    if (url.protocol !== "https:") return DEFAULT_REDIRECT;
    if (!ALLOWED_REDIRECT_HOSTS.has(url.hostname)) return DEFAULT_REDIRECT;
    return url.toString().replace(/[\r\n]/g, "");
  } catch {
    return DEFAULT_REDIRECT;
  }
}

// ── Secure cookie builder ────────────────────────────────────────────────────

export function buildSecureCookie(
  name: string,
  value: string,
  domain: string,
  maxAge = SESSION_TTL_SECONDS,
): string {
  return [
    `${name}=${encodeURIComponent(value)}`,
    "Path=/",
    "HttpOnly",
    "Secure",
    "SameSite=Lax",
    `Max-Age=${maxAge}`,
    `Domain=${domain}`,
  ].join("; ");
}

// ── Crypto helpers ───────────────────────────────────────────────────────────

/** Returns a cryptographically-random hex string of `byteLength * 2` chars. */
export function generateToken(byteLength = 32): string {
  const bytes = new Uint8Array(byteLength);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

/** SHA-256 hash of (pepper + password). Not bcrypt — suitable for Workers runtime. */
export async function hashPassword(password: string, pepper: string): Promise<string> {
  const data = new TextEncoder().encode((pepper ?? "ih_default_pepper") + password);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hashBuffer), (b) =>
    b.toString(16).padStart(2, "0"),
  ).join("");
}

// ── JSON / CORS response helpers ─────────────────────────────────────────────

export function jsonResponse(
  body: unknown,
  status = 200,
  extraHeaders: Record<string, string> = {},
): Response {
  return Response.json(body, {
    status,
    headers: {
      "Access-Control-Allow-Origin": "https://insighthunter.app",
      "Access-Control-Allow-Credentials": "true",
      ...extraHeaders,
    },
  });
}

export function corsPreflightResponse(): Response {
  return new Response(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "https://insighthunter.app",
      "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Accept",
      "Access-Control-Allow-Credentials": "true",
      "Access-Control-Max-Age": "86400",
    },
  });
}

// ── Session factory (used by both /callback and /auth/verify) ────────────────

export async function createSession(
  kv: KVNamespace,
  identity: {
    email: string;
    name: string;
    groups: string[];
    user_uuid: string;
  },
  ttl: number,
): Promise<string> {
  const sessionId = generateToken(32);
  await kv.put(
    `session:${sessionId}`,
    JSON.stringify({
      email: identity.email,
      name: identity.name,
      groups: identity.groups,
      user_uuid: identity.user_uuid,
      createdAt: Date.now(),
    }),
    { expirationTtl: ttl },
  );
  return sessionId;
}
