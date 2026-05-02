// shared/types/auth.ts
export type AuthUser = {
  id: string;
  email: string;
  firstName?: string | null;
  lastName?: string | null;
};

export type OrgContext = {
  orgId: string;
  orgName?: string | null;
  role: 'owner' | 'admin' | 'member' | 'viewer';
};

export type Session = {
  sub: string;
  email: string;
  exp: number;
  iat?: number;
  iss?: string;
  aud?: string | string[];
  user: AuthUser;
  org: OrgContext;
};

export type SessionValidationResult =
  | { ok: true; session: Session }
  | { ok: false; status: 401 | 403; error: string; loginUrl?: string };
