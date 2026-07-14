// Environment bindings for insighthunter-bizforma Cloudflare Worker
// Keep in sync with wrangler.jsonc bindings

export interface BizformaEnv {
  // D1 — relational database
  DB: D1Database;

  // R2 — document vault
  DOCUMENTS: R2Bucket;

  // KV — caching, feature flags, rate limits
  CACHE: KVNamespace;

  // Queues — async jobs
  PDF_QUEUE: Queue<{ type: string; doc_id: string; r2_key: string }>;
  REMINDER_QUEUE: Queue<{ type: string; case_id: string; event_id: string; user_id: string }>;

  // Analytics Engine
  ANALYTICS: AnalyticsEngineDataset;

  // Durable Object — FormationAgent
  FORMATION_AGENT: DurableObjectNamespace;

  // Workers AI
  AI: Ai;

  // Vars from wrangler.jsonc
  APP_NAME: string;
  ENVIRONMENT: string;
  AUTH_URL: string;
  APP_URL: string;
  JWKS_URL: string;
  JWT_SECRET?: string;
  INTERNAL_SECRET?: string; // for cron/internal endpoints
}
