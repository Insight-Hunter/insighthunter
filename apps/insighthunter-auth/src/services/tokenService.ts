
import type { KVNamespace } from '@cloudflare/workers-types';
import type { AuthUser, JWTPayload, TokenPair, AuthContext } from '../types/auth';
import { signJWT, verifyJWT } from '../lib/jwt';

const ACCESS_TTL  = 900;          // 15 min
const REFRESH_TTL = 2592000;      // 30 days

export async function issueTokenPair(user: AuthUser, secret: string, kv: KVNamespace): Promise<TokenPair> {
  const payload = { sub: user.id, org: user.orgId, email: user.email, role: user.role, plan: user.plan };
  const [accessToken, refreshToken] = await Promise.all([
    signJWT(payload, secret, ACCESS_TTL),
    signJWT(payload, secret, REFRESH_TTL),
  ]);
  // Store refresh token in KV — keyed by userId for easy revocation
  await kv.put(`refresh:${user.id}:${refreshToken.slice(-16)}`, refreshToken, { expirationTtl: REFRESH_TTL });
  return { accessToken, refreshToken, expiresIn: ACCESS_TTL };
}

export async function verifyAccessToken(token: string, secret: string): Promise<AuthContext | null> {
  const payload = await verifyJWT(token, secret);
  if (!payload) return null;
  return {
    userId: payload.sub,
    orgId:  payload.org,
    email:  payload.email,
    name:   '',             // hydrated by /auth/me if needed
    role:   payload.role as AuthContext['role'],
    plan:   payload.plan as AuthContext['plan'],
  };
}

export async function rotateRefreshToken(
  env: { JWT_SECRET: string; REFRESH_SECRET: string; TOKENS: KVNamespace },
  token: string,
  fetchUser: (id: string) => Promise<AuthUser | null>
): Promise<TokenPair | null> {
  const payload = await verifyJWT(token, env.REFRESH_SECRET);
  if (!payload) return null;

  const user = await fetchUser(payload.sub as string);
  if (!user) return null;

  const isValid = await env.TOKENS.get(`refresh:${user.id}:${token.slice(-16)}`);
  if (!isValid) return null;

  await env.TOKENS.delete(`refresh:${user.id}:${token.slice(-16)}`);
  return issueTokenPair(user, env.JWT_SECRET, env.TOKENS);
}

export async function revokeUserTokens(userId: string, kv: KVNamespace): Promise<void> {
  const list = await kv.list({ prefix: `refresh:${userId}:` });
  await Promise.all(list.keys.map(k => kv.delete(k.name)));
}
