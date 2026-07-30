export { createRemoteJwksVerifier, verifyJwt } from "./jwt.js";

export function getLoginRedirectUrl(returnTo?: string): string {
  const base = "https://auth.insighthunter.app/login";
  if (!returnTo) return base;
  return '${base}?returnTo=${encodeURIComponent(returnTo)}';
}

export function getRegisterRedirectUrl(returnTo?: string): string {
  const base = "https://auth.insighthunter.app/register";
  if (!returnTo) return base;
  return '${base}?returnTo=${encodeURIComponent(returnTo)}';
}

export function extractSessionToken(request: Request, cookieName = "ih_session"): string | null {
  const authHeader = request.headers.get("authorization") ?? request.headers.get("Authorization");
  if (authHeader?.startsWith("Bearer ")) {
    const token = authHeader.slice("Bearer ".length).trim();
    return token.length > 0 ? token : null;
  }

  const cookieHeader = request.headers.get("cookie") ?? request.headers.get("Cookie");
  if (!cookieHeader) return null;

  const cookies = cookieHeader.split(";");
  for (const rawCookie of cookies) {
    const [rawName, ...rawValueParts] = rawCookie.trim().split("=");
    if (rawName === cookieName) {
      const value = rawValueParts.join("=").trim();
      return value ? decodeURIComponent(value) : null;
    }
  }

  return null;
}
export * from "./jwt.js";
export * from "./tokens.js";
export * from "./browser.js";
export * from "./types.js";
export * from "./redirects.js";
