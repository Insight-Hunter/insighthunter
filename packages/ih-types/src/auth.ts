export interface AuthUser {
  userId: string;
  orgId: string;
  email: string;
  tier: 'lite' | 'standard' | 'pro';
}

export interface Session {
  userId: string;
  orgId: string;
  email: string;
  tier: 'lite' | 'standard' | 'pro';
  expiresAt: number;
}

export interface OrgContext {
  orgId: string;
  businessName: string;
  tier: 'lite' | 'standard' | 'pro';
}

export interface JWTPayload extends AuthUser {
  iat: number;
  exp: number;
}
