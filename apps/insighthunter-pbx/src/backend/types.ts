// Shared Worker environment (Cloudflare bindings/secrets) and cross-cutting
// backend types. Routes/middleware/services import `Env` from here rather
// than from index.ts, per docs/file-structure.md.

export interface Env {
  DB: D1Database;
  TWILIO_ACCOUNT_SID: string;
  TWILIO_AUTH_TOKEN: string;
}
