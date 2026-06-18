// types.ts — Shared types for insighthunter-auth Worker

export interface Env {
  // ── Cloudflare Access secrets (set via `wrangler secret put`) ──────────────
  TEAM_DOMAIN: string;    // https://insighthunter.cloudflareaccess.com
  POLICY_AUD: string;     // AUD tag from Zero Trust → Application → Overview

  // ── Email+Password auth secrets ────────────────────────────────────────────
  PASSWORD_PEPPER: string; // Random pepper mixed into every password hash

  // ── KV: session + registration state store ────────────────────────────────
  SESSIONS: KVNamespace;

  // ── Cloudflare Email (native send_email binding) ───────────────────────────
  EMAIL: SendEmail;

  // ── Analytics Engine: auth event logging ─────────────────────────────────
  AUTH_EVENTS: AnalyticsEngineDataset;

  // ── Runtime config (non-secret vars) ──────────────────────────────────────
  ENVIRONMENT: string;    // "production" | "staging"
  APP_ORIGIN: string;     // https://insighthunter.app
  APP_URL: string;        // https://app.insighthunter.app
  COOKIE_DOMAIN: string;  // insighthunter.app
}

// Re-export from access.ts for convenience
export type { AccessJWTPayload, CloudflareIdentity } from "./access";
