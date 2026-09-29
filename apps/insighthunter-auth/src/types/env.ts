// src/types/env.ts
// Cloudflare bindings + environment contract for insighthunter-auth.
// Secrets (JWT_SECRET, STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET, CF_API_TOKEN)
// must be set via `wrangler secret put <NAME>` — never placed in wrangler.jsonc vars.

export interface Env {
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

export interface ProvisioningMessage {
  tenantId: string;
  userId: string;
  organizationName: string;
  tier: 'startup' | 'standard' | 'pro';
  attempt?: number;
}

export interface SessionPayload {
  sub: string;
  tenantId: string;
  role: 'owner' | 'admin' | 'member';
  tier: 'startup' | 'standard' | 'pro';
  iat: number;
  exp: number;
}
