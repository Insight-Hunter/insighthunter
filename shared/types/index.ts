// shared/types/index.ts
// Central type exports for all InsightHunter workers

export interface AuthUser {
  userId: string;
  orgId: string;       // business_id — tenant key used in ALL D1 queries
  firmId?: string;     // set when user belongs to an accounting firm
  email: string;
  role: "owner" | "admin" | "member" | "advisor" | "staff";
  plan: "lite" | "standard" | "pro";
}

export interface Session {
  token: string;
  user: AuthUser;
  expiresAt: number;
}

export interface OrgContext {
  orgId: string;
  firmId?: string;
  user: AuthUser;
}

// Standard API response envelope
export interface ApiResponse<T = unknown> {
  ok: boolean;
  data?: T;
  error?: string;
  code?: string;
}

// Pagination
export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

// Cloudflare binding env base — extend per app
export interface BaseEnv {
  AUTH_SECRET: string;          // JWT signing secret from auth.insighthunter.app
  AUTH_ORIGIN: string;          // https://auth.insighthunter.app
  ENVIRONMENT: string;          // production | staging | development
}

// shared/types/index.ts
export * from './auth';
export * from './env';

