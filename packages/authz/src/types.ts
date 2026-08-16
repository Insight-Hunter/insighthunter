// Core session and org types shared across all InsightHunter Workers

export type OrgRole = "owner" | "admin" | "finance_manager" | "analyst" | "bookkeeper" | "viewer";

export type OrgPlan = "starter" | "growth" | "enterprise";

export type Permission =
  | "org:read"
  | "org:update"
  | "members:read"
  | "members:invite"
  | "members:update"
  | "billing:read"
  | "billing:update"
  | "reports:read"
  | "reports:export"
  | "forecast:read"
  | "forecast:write"
  | "transactions:read"
  | "transactions:write"
  | "documents:read"
  | "documents:write"
  | "payroll:read"
  | "payroll:write"
  | "bookkeeping:read"
  | "bookkeeping:write"
  | "audit:read"
  | "settings:read"
  | "settings:write";

export interface SessionPrincipal {
  userId: string;
  email: string;
  emailVerified: boolean;
  sessionId: string;
  issuedAt: number;
  expiresAt: number;
}

export interface TenantContext {
  orgId: string;
  role: OrgRole;
  permissions: Permission[];
}

export interface AuthContext {
  principal: SessionPrincipal;
  tenant: TenantContext;
}

// KV-backed session shape (written by insighthunter-auth)
export interface IHSession {
  sessionId: string;
  userId: string;
  orgId: string;
  email: string;
  name: string;
  orgName: string;
  orgSlug: string;
  role: OrgRole;
  plan: OrgPlan;
  mfaVerified: boolean;
  createdAt: number;
  expiresAt: number;
}

export interface AuthenticatedUser {
  readonly subject: string;
  readonly email?: string;
  readonly orgId?: string;
}

export interface JwtPayload {
  readonly sub: string;
  readonly email?: string;
  readonly org_id?: string;
  readonly iss?: string;
  readonly aud?: string | string[];
  readonly exp?: number;
  readonly nbf?: number;
  readonly iat?: number;
  readonly [key: string]: unknown;
}

export interface Jwk {
  readonly kty: string;
  readonly kid?: string;
  readonly use?: string;
  readonly alg?: string;
  readonly n?: string;
  readonly e?: string;
}

export interface JwksDocument {
  readonly keys: readonly Jwk[];
}

export interface SessionRecord {
  readonly token: string;
  readonly user: AuthenticatedUser;
  readonly expiresAt: string;
}
