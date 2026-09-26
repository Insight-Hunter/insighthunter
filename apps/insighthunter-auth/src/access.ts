/**
 * Cloudflare Access identity helpers.
 *
 * When a route is protected by a Cloudflare Access policy, CF injects two
 * headers on every authenticated request:
 *
 *   Cf-Access-Authenticated-User-Email  — verified email of the logged-in user
 *   Cf-Access-Jwt-Assertion             — signed JWT (audience = Access App AUD)
 *
 * These headers are stripped by CF before reaching the Worker on public routes,
 * so they are safe to trust on internal/admin routes that sit behind an Access
 * policy.
 *
 * Usage (e.g. an admin-only route in index.ts):
 *
 *   const identity = getAccessIdentity(request.headers);
 *   if (!identity) return new Response("Forbidden", { status: 403 });
 *   // identity.email is the CF Access-verified admin email
 */
export interface AccessIdentity {
  email: string;
  aud: string;
}

/**
 * Returns the CF Access identity from request headers, or null if the headers
 * are absent (i.e. the request did not come through a CF Access policy).
 */
export function getAccessIdentity(headers: Headers): AccessIdentity | null {
  const email = headers.get("Cf-Access-Authenticated-User-Email");
  if (!email) return null;
  return {
    email,
    aud: headers.get("Cf-Access-Jwt-Assertion") ?? "unknown",
  };
}
