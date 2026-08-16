export function extractAuthToken(request: Request): string | null {
  const authHeader = request.headers.get("authorization") ?? request.headers.get("Authorization");

  if (!authHeader) return null;

  const match = authHeader.match(/^Bearer\s+(.+)$/i);
  if (match?.[1]) return match[1].trim();

  return null;
}

export function extractSessionToken(request: Request, cookieName = "ih_session"): string | null {
  const cookieHeader = request.headers.get("cookie") ?? request.headers.get("Cookie");
  if (!cookieHeader) return null;

  const cookies = cookieHeader.split(";");

  for (const cookie of cookies) {
    const [rawName, ...rawValue] = cookie.trim().split("=");
    if (rawName === cookieName) {
      const value = rawValue.join("=");
      return value ? decodeURIComponent(value) : null;
    }
  }

  return null;
}
