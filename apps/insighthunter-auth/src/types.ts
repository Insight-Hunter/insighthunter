// types.ts — Shared types for insighthunter-auth Worker

export interface Env {
  // Cloudflare Access — SECRETS (set via `wrangler secret put`)
  TEAM_DOMAIN: string;    // https://insighthunter.cloudflareaccess.com
  POLICY_AUD: string;     // AUD tag from Zero Trust → Application → Overview

  // KV: session store + pending registrations
  SESSIONS: KVNamespace;

  // Analytics Engine: auth event logging
  AUTH_EVENTS: AnalyticsEngineDataset;

  // Email: transactional delivery (Cloudflare Email Routing / MailChannels)
  // Bind as: { binding = "EMAIL", destination_address = "noreply@insighthunter.app" }
  // Or use wrangler.toml send_email binding for MailChannels worker integration
  EMAIL: SendEmail;

  // Runtime environment
  ENVIRONMENT: string;    // "production" | "staging"
  APP_ORIGIN: string;     // https://insighthunter.app
  COOKIE_DOMAIN: string;  // insighthunter.app

  // Secret: PBKDF2 pepper / salt prefix for password hashing
  PASSWORD_PEPPER: string; // set via `wrangler secret put PASSWORD_PEPPER`
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
