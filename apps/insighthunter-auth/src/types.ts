// types.ts — Shared types for insighthunter-auth Worker

export interface Env {
  // Cloudflare Access — SECRETS (set via `wrangler secret put`)
  TEAM_DOMAIN: string;    // https://insighthunter.cloudflareaccess.com
  POLICY_AUD: string;     // AUD tag from Zero Trust → Application → Overview

  // KV: session store
  SESSIONS: KVNamespace;

  // Analytics Engine: auth event logging
  AUTH_EVENTS: AnalyticsEngineDataset;

  // Runtime environment
  ENVIRONMENT: string;    // "production" | "staging"
  APP_ORIGIN: string;     // https://insighthunter.app
  COOKIE_DOMAIN: string;  // insighthunter.app
}

// Re-export from access.ts for convenience
export type { AccessJWTPayload, CloudflareIdentity } from "./access";
