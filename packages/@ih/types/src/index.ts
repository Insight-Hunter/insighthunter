// ─── InsightHunter Shared Types ───────────────────────────────────────────────

export type Tier = 'free' | 'lite' | 'standard' | 'pro' | 'enterprise';

export interface AuthUser {
  userId: string;
  orgId: string;
  email: string;
  name: string;
  tier: Tier;
  role: 'owner' | 'admin' | 'member' | 'viewer';
}

export interface JWTPayload {
  sub: string;    // userId
  org: string;    // orgId
  email: string;
  tier: Tier;
  role: string;
  iat: number;
  exp: number;
}

export interface Session {
  user: AuthUser;
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
}

export interface Org {
  id: string;
  name: string;
  tier: Tier;
  owner_id: string;
  worker_script: string | null;
  custom_domain: string | null;
  stripe_sub_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface TierLimits {
  transactions_per_month: number | null;  // null = unlimited
  api_calls_per_minute: number | null;
  ai_queries_per_day: number | null;
  payroll_employees: number | null;
  pbx_extensions: number | null;
  storage_gb: number | null;
  custom_worker: boolean;
  white_label: boolean;
  sla_hours: number | null;
}

export interface ApiError {
  error: string;
  code: string;
  status: number;
}

export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}
