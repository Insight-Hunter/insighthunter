export interface Env {
  DB: D1Database;
  SESSIONS: KVNamespace;
  USER_VAULT: DurableObjectNamespace;
  SESSION_SECRET: string; // wrangler secret, HMAC key for session tokens
  ALLOWED_ORIGIN: string; // e.g. https://insighthunter.app
}

export type Tier = "startup" | "standard" | "pro";
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
  tier: Tier;
  status: "active" | "suspended" | "deleted";
  vault_do_id: string;
  created_at: number;
  updated_at: number;
}

export interface SessionPayload {
  userId: string;
  email: string;
  tier: Tier;
  issuedAt: number;
  expiresAt: number;
}

export interface RegisterRequest {
  email: string;
  password: string;
  tier?: Tier;
}

export interface LoginRequest {
  email: string;
  password: string;
}
