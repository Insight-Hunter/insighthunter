// apps/insighthunter-main/src/types.ts

// ─── App Domain ────────────────────────────────────────────────────────────

export type AppStatus        = 'live' | 'beta' | 'coming-soon';
export type AppCategory      = 'core' | 'addon';
export type SubscriptionTier = 'free' | 'lite' | 'standard' | 'pro';

export interface FAQ {
  q: string;
  a: string;
}

export interface InsightApp {
  slug:          string;
  name:          string;
  icon:          string;
  status:        AppStatus;
  category:      AppCategory;
  /** Display label — e.g. "Core Plan" | "Core Plan · Enterprise" | "Add-on" */
  tier:          string;
  /** Display string — e.g. "$29/mo" | "From $19/mo" */
  price:         string;
  /** Price in cents for Stripe — e.g. 2900 */
  priceMonthly:  number;
  /** e.g. "Single Tenant" | "Single or Multi-Tenant" | "Any Plan" */
  tenancy:       string;
  /** Minimum plan(s) that unlock this app */
  requiredPlans: SubscriptionTier[];
  desc:          string;
  tags:          string[];
  features:      string[];
  faqs:          FAQ[];
  support:       string;
  docsUrl:       string;
  /** Subdomain entry — https://[slug].insighthunter.app/ */
  appUrl:        string;
  /** Static detail page — /features/[slug].html */
  pageUrl:       string;
}

// ─── API Responses ─────────────────────────────────────────────────────────

export interface AppsResponse {
  core:   InsightApp[];
  addons: InsightApp[];
}

export interface AppDetailResponse {
  app:     InsightApp;
  related: InsightApp[];
}

export interface ApiError {
  error:  string;
  status: number;
}

// ─── Auth & Session ────────────────────────────────────────────────────────

export interface LoginRequest {
  email:    string;
  password: string;
}

export interface SignupRequest {
  email:    string;
  password: string;
  fullName: string;
}

export interface AuthResponse {
  success:  boolean;
  token?:   string;
  tier?:    SubscriptionTier;
  userId?:  string;
  email?:   string;
  error?:   string;
}

export interface SessionPayload {
  userId:    string;
  email:     string;
  tier:      SubscriptionTier;
  /** Unix ms timestamp */
  expiresAt: number;
}

export interface AuthValidationResult {
  success: boolean;
  userId:  string;
  email:   string;
  tier:    SubscriptionTier;
}

export interface SessionResponse {
  authenticated: boolean;
  userId:        string;
  email:         string;
  tier:          SubscriptionTier;
  expiresAt:     number | null;
}

// ─── Hono Context Variables ────────────────────────────────────────────────
// Set by session middleware, read in authenticated route handlers

export interface HonoContextVars {
  userId:    string;
  userEmail: string;
  userTier:  SubscriptionTier;
}

// ─── Cloudflare Env Bindings ───────────────────────────────────────────────

export interface Env {
  // ── Storage ────────────────────────────────────────────────────
  /** D1 — users, subscriptions, audit logs */
  DB:            D1Database;
  /** KV — session tokens mapped to SessionPayload JSON */
  SESSIONS:      KVNamespace;
  /** R2 — documents, exports, user uploads */
  ASSETS_BUCKET: R2Bucket;
  /** Cloudflare Static Assets binding */
  ASSETS:        Fetcher;

  // ── Service Bindings ───────────────────────────────────────────
  /** insighthunter-auth worker — login, signup, validate-session, logout */
  AUTH_SERVICE:        Fetcher;
  /** insighthunter-bookkeeping worker — all bookkeeping/ledger logic */
  BOOKKEEPING_SERVICE: Fetcher;

  // ── Secrets — set via: wrangler secret put <NAME> ─────────────
  JWT_SECRET: string;

  // ── Vars ───────────────────────────────────────────────────────
  ENVIRONMENT: 'development' | 'staging' | 'production';
}

// ─── D1 Row Shapes ─────────────────────────────────────────────────────────

export interface UserRow {
  id:            string;
  email:         string;
  full_name:     string;
  password_hash: string;
  tier:          SubscriptionTier;
  created_at:    string;
  updated_at:    string;
}

export interface SubscriptionRow {
  id:                 string;
  user_id:            string;
  stripe_customer_id: string;
  stripe_sub_id:      string;
  plan_slug:          string;
  tier:               SubscriptionTier;
  status:             'active' | 'cancelled' | 'past_due' | 'trialing';
  current_period_end: string;
  created_at:         string;
}

export interface AddonRow {
  id:         string;
  user_id:    string;
  addon_slug: string;
  status:     'active' | 'cancelled';
  created_at: string;
}

export interface AuditLogRow {
  id:         string;
  user_id:    string;
  action:     string;
  metadata:   string; // JSON string
  ip:         string;
  created_at: string;
}

// ─── Stripe Webhook ────────────────────────────────────────────────────────

export type StripeEventType =
  | 'checkout.session.completed'
  | 'customer.subscription.updated'
  | 'customer.subscription.deleted'
  | 'invoice.payment_failed'
  | 'invoice.payment_succeeded';

export interface StripeWebhookEvent {
  id:       string;
  type:     StripeEventType;
  data:     { object: Record<string, unknown> };
  created:  number;
  livemode: boolean;
}

// ─── Pagination ────────────────────────────────────────────────────────────

export interface PaginatedResponse<T> {
  items:   T[];
  total:   number;
  page:    number;
  perPage: number;
  hasMore: boolean;
}

// ─── Utility Types ─────────────────────────────────────────────────────────

/** Make selected keys required, rest optional */
export type RequireKeys<T, K extends keyof T> =
  Required<Pick<T, K>> & Partial<Omit<T, K>>;

/** Deep partial */
export type DeepPartial<T> = {
  [K in keyof T]?: T[K] extends object ? DeepPartial<T[K]> : T[K];
};

/** JSON-safe record */
export type JsonRecord = Record<string, string | number | boolean | null>;
