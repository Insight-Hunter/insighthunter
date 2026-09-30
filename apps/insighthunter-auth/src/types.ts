export interface Env {
  DB: D1Database;
  SESSIONS: KVNamespace;          // rate limiting + short-lived tokens
  USER_VAULT: DurableObjectNamespace;
  SESSION_SECRET: string;         // wrangler secret — HMAC-SHA256 key (32+ random bytes, hex)
  ALLOWED_ORIGIN: string;         // https://insighthunter.app
  DASHBOARD_URL?: string;         // e.g. https://app.insighthunter.app
  RESEND_API_KEY?: string;        // wrangler secret — transactional email (optional until email flows are wired)
  AUTH_DB: D1Database;
  SESSION_KV: KVNamespace;
  PROVISIONING_QUEUE: Queue<ProvisioningMessage>;
  RATE_LIMITER: DurableObjectNamespace;
  AUTH_ANALYTICS: AnalyticsEngineDataset;
  BOOKKEEPING_SERVICE: Fetcher;
  ASSETS: Fetcher;
  MARKETING_ORIGIN: string;
  APP_ORIGIN: string;
  ACCESS_TOKEN_TTL_SECONDS: string;
  REFRESH_TOKEN_TTL_SECONDS: string;
  JWT_SECRET: string;
  STRIPE_SECRET_KEY: string;
  STRIPE_WEBHOOK_SECRET: string;
  CF_API_TOKEN: string;
  CF_ACCOUNT_ID: string;
}
/** Subscription tiers — must stay in sync with insighthunter-dashboard TIER_RANK. */
export type tier =
  | "lite"
  | "standard"
  | "pro"
  | "enterprise";

export type org_role =
  | "owner"
  | "admin"
  | "member"
  | "viewer";

export type Module =
  | "bookkeeping"
  | "bizforma"
  | "payroll"
  | "reports"
  | "insights"
  | "pbx";

export type status =
  | "active"
  | "suspended"
  | "deleted";

export type name = string;
export type email = string;
export type tenant_id = string;
export type org_name = string;
export type user_id = string;

export interface ProvisioningMessage {
  tenantId: tenant_id;
  user_id: user_id;
  org_name: org_name;
  tier: tier;
  attempt?: number;
}
export interface SessionPayload {
  sub: string;
  tenantId: tenant_id;
  role: org_role;
  tier: tier;
  iat: number;
  exp: number;
  user_id: user_id;
  email: email;
  name: name;     // display name for dashboard greeting
  org_name: string;  // org name shown in nav bar  // controls permission checks in module workers
  issuedAt: number;
  expiresAt: number;
}

export interface UserRecord {
  user_id: user_id;
  email: email;
  password_hash: string;
  name: name;      // full name supplied at registration
  org_name: org_name;  // business / organisation name
  role: org_role;     // user's role within their org
  tier: tier;
  status: status;
  vault_do_id: string;
  created_at: number;
  updated_at: number;
}
export interface RegisterRequest {
  email: email;
  password: string;
  name: name;
  org_name: org_name;
  tier: tier;
}
export interface LoginRequest {
  email: email;
  password: string;
}
