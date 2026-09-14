export interface AccessIdentity {
  email: string;
  aud: string;
}

export function getAccessIdentity(headers: Headers): AccessIdentity | null {
  const email = headers.get("cf-access-authenticated-user-email");
  if (!email) return null;
  return { email, aud: headers.get("cf-access-aud") ?? "unknown" };
}
