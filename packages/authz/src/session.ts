// Session cookie helpers
export function createSessionCookie(token: string, maxAgeSeconds: number): string {
  return [
    `ih_session=${token}`,
    "Path=/",
    "HttpOnly",
    "Secure",
    "SameSite=Lax",
    `Max-Age=${maxAgeSeconds}`,
    "Domain=.insighthunter.app",
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
    "Domain=.insighthunter.app",
  ].join("; ");
}
