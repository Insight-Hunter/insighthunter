export type UserStatus  = "active" | "suspended" | "pending";
export type Role        = "owner" | "admin" | "member" | "viewer";
export type Tier        = "lite" | "standard" | "enterprise";

export interface User {
  id:             string;
  org_id:         string;
  email:          string;
  name:           string;
  password_hash:  string;
  role:           Role;
  tier:           Tier;
  email_verified: number;
  status:         UserStatus;
  created_at:     string;
  updated_at:     string;
}

export interface PublicUser {
  id:            string;
  email:         string;
  name:          string;
  orgId:         string;
  role:          Role;
  tier:          Tier;
  emailVerified: boolean;
}

export interface Org {
  id:         string;
  name:       string;
  tier:       Tier;
  status:     "active" | "suspended";
  created_at: string;
  updated_at: string;
}

export interface SessionRecord {
  userId:    string;
  orgId:     string;
  role:      Role;
  tier:      Tier;
  ip:        string;
  userAgent: string;
  createdAt: number;
  expiresAt: number;
}

export interface AccessTokenPayload {
  sub:   string;
  email: string;
  name:  string;
  orgId: string;
  role:  Role;
  tier:  Tier;
  type:  "access";
  iat:   number;
  exp:   number;
}

export interface RefreshTokenPayload {
  sub:  string;
  jti:  string;
  type: "refresh";
  iat:  number;
  exp:  number;
}

export interface AuthTokens {
  accessToken:  string;
  refreshToken: string;
  expiresIn:    number;
  tokenType:    "Bearer";
}

export interface AuthResponse {
  ok:     true;
  tokens: AuthTokens;
  user:   PublicUser;
}

// ── Request bodies ────────────────────────────────────────────────────────────
export interface RegisterBody {
  name:     string;
  email:    string;
  password: string;
  orgName?: string;
}

export interface LoginBody {
  email:    string;
  password: string;
}

export interface RefreshBody {
  refreshToken: string;
}

export interface ForgotPasswordBody {
  email: string;
}

export interface ResetPasswordBody {
  token:    string;
  password: string;
}

export interface AssignRoleBody {
  userId: string;
  role:   Role;
}
