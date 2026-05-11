// ── Auth ─────────────────────────────────────────────────────────────────────
export interface User {
  id:        string;
  email:     string;
  name:      string;
  tier:      "lite" | "standard" | "enterprise";
  createdAt: string;
}

export interface Session {
  userId:    string;
  expiresAt: number;
  token:     string;
}

// ── QuickBooks ────────────────────────────────────────────────────────────────
export interface QBOConnection {
  realmId:      string;
  accessToken:  string;
  refreshToken: string;
  expiresAt:    number;
  companyName:  string;
}

export interface QBOTokenResponse {
  access_token:  string;
  refresh_token: string;
  token_type:    string;
  expires_in:    number;
  x_refresh_token_expires_in: number;
}

// ── Financial ─────────────────────────────────────────────────────────────────
export interface ProfitLoss {
  periodStart:   string;
  periodEnd:     string;
  totalRevenue:  number;
  totalExpenses: number;
  netIncome:     number;
  rows:          PLRow[];
}

export interface PLRow {
  account:  string;
  amount:   number;
  type:     "income" | "expense";
}

export interface CashSummary {
  balance:   number;
  inflow:    number;
  outflow:   number;
  asOf:      string;
}

// ── Cloudflare Env ────────────────────────────────────────────────────────────
export interface Env {
  APP_ENV:        string;
  APP_URL:        string;
  APP_TIER:       string;
  SESSION_EXPIRY: string;
  JWT_SECRET:     string;
  QBO_CLIENT_ID:     string;
  QBO_CLIENT_SECRET: string;
  QBO_REDIRECT_URI:  string;
  QBO_ENVIRONMENT:   string;
  IH_SESSIONS: KVNamespace;
  IH_CACHE:    KVNamespace;
}
