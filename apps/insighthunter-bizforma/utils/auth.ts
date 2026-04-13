import type { AuthContext, Env } from '../types/env';

export function buildLoginUrl(env: Env, redirectUri: string) {
  return `${env.AUTH_ORIGIN}/login?redirect_uri=${encodeURIComponent(redirectUri)}&audience=${encodeURIComponent(env.AUTH_AUDIENCE)}`;
}

export function buildSignupUrl(env: Env, redirectUri: string) {
  return `${env.AUTH_ORIGIN}/register?redirect_uri=${encodeURIComponent(redirectUri)}&audience=${encodeURIComponent(env.AUTH_AUDIENCE)}`;
}

export async function introspectAccessToken(env: Env, token: string): Promise<AuthContext | null> {
  const res = await fetch(`${env.AUTH_ORIGIN}${env.AUTH_INTROSPECT_PATH}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` },
    body: JSON.stringify({ audience: env.AUTH_AUDIENCE })
  });
  if (!res.ok) return null;
  const data = await res.json<any>();
  if (!data?.active || !data?.sub || !data?.tenantId) return null;
  return { sub: data.sub, email: data.email, tenantId: data.tenantId, roles: Array.isArray(data.roles) ? data.roles : ['owner'] };
}
