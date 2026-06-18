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

// Cloudflare Email binding type
export interface SendEmail {
  send(message: EmailMessage): Promise<void>;
}

export interface EmailMessage {
  from: { email: string; name?: string };
  to: Array<{ email: string; name?: string }>;
  subject: string;
  content: Array<{ type: string; value: string }>;
}

// Pending registration stored in KV under key `pending:{token}`
export interface PendingRegistration {
  email: string;
  name: string;
  org_name: string;
  plan: string;
  passwordHash: string; // hex-encoded SHA-256 of pepper+password
  createdAt: number;
}

// Re-export from access.ts for convenience
export type { AccessJWTPayload, CloudflareIdentity } from "./access";
