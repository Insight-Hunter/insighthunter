import type { AuthenticatedUser, SessionRecord } from "./types.js";

export function createSessionCookie(token: string, maxAgeSeconds: number): string {
  return [
    `ih_session=${token}`,
    "Path=/",
    "HttpOnly",
    "Secure",
    "SameSite=Lax",
    `Max-Age=${maxAgeSeconds}`,
  ].join("; ");
}

export function clearSessionCookie(): string {
  return [
    "ih_session=",
    "Path=/",
    "HttpOnly",
    "Secure",
    "SameSite=Lax",
    "Max-Age=0",
  ].join("; ");
}

export function makeSessionRecord(
  token: string,
  user: AuthenticatedUser,
  ttlSeconds: number,
): SessionRecord {
  return {
    token,
    user,
    expiresAt: new Date(Date.now() + ttlSeconds * 1000).toISOString(),
  };
}
