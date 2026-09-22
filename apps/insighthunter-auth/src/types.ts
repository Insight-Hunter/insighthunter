export interface Env {
  DB: D1Database;
  SESSIONS: KVNamespace;
  USER_VAULT: DurableObjectNamespace;
  SESSION_SECRET: string; // wrangler secret — HMAC key for session tokens
  ALLOWED_ORIGIN: string; // e.g. https://insighthunter.app
}

/** Subscription tiers — must stay in sync with insighthunter-dashboard TIER_RANK. */
export type Tier = "lite" | "standard" | "pro" | "enterprise";

export type OrgRole = "owner" | "admin" | "member" | "viewer";

export type Module =
  | "bookkeeping"
  | "bizforma"
  | "payroll"
  | "reports"
  | "insights"
  | "pbx";

export interface UserRecord {
  id: string;
  email: string;
  password_hash: string;
  name: string;      // full name supplied at registration
  org_name: string;  // business / organisation name
  role: OrgRole;     // user's role within their org
  tier: Tier;
  status: "active" | "suspended" | "deleted";
  vault_do_id: string;
  created_at: number;
  updated_at: number;
}

/**
 * SessionPayload is embedded inside the signed token.
 * Keep this small — it travels in every request header/cookie.
 */
export interface SessionPayload {
  userId: string;
  email: string;
  name: string;     // display name for dashboard greeting
  orgName: string;  // org name shown in nav bar
  role: OrgRole;    // controls permission checks in module workers
  tier: Tier;
  issuedAt: number;
  expiresAt: number;
}

export interface RegisterRequest {
  email: string;
  password: string;
  name?: string;
  orgName?: string;
  tier?: Tier;
}

export interface LoginRequest {
  email: string;
  password: string;
}
