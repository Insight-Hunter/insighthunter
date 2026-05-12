import { verifyJWT, type JWTPayload } from './jwt';

export interface AuthContext {
  userId: string;
  orgId: string;
  tier: 'lite' | 'standard' | 'pro';
  email: string;
}

export function extractToken(request: Request): string | null {
  const authHeader = request.headers.get('Authorization');
  if (authHeader?.startsWith('Bearer ')) return authHeader.slice(7);

  const cookie = request.headers.get('Cookie') || '';
  const match = cookie.match(/ih_session=([^;]+)/);
  return match?.[1] || null;
}

export async function getAuthContext(request: Request, secret: string): Promise<AuthContext | null> {
  const token = extractToken(request);
  if (!token) return null;

  const payload = await verifyJWT(token, secret);
  if (!payload) return null;

  return {
    userId: payload.userId,
    orgId: payload.orgId,
    tier: payload.tier,
    email: payload.email,
  };
}
