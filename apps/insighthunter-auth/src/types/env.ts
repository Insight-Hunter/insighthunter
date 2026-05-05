export interface Env {
  IH_AUTH_DB: D1Database;
  IH_AUTH_KV: KVNamespace;
  IH_WELCOME_QUEUE: Queue;
  AI: Ai;
  JWT_SECRET: string;
  PLATFORM_SERVICE_TOKEN: string;
  GOOGLE_CLIENT_ID: string;
  GOOGLE_CLIENT_SECRET: string;
}
