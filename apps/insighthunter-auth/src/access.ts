export interface AccessIdentity {
  email: string;
  aud: string;
}

// Reserved for admin and internal routes protected by Cloudflare Access.
// Public auth routes use the session cookie instead and must not trust these headers.
export function getAccessIdentity(headers: Headers): AccessIdentity | null {
  const email = headers.get("cf-access-authenticated-user-email");
  if (!email) return null;
  return { email, aud: headers.get("cf-access-aud") ?? "unknown" };
}
