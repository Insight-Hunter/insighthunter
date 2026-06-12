export interface EmailBinding {
  send(message: unknown): Promise<void>;
}

export interface Env {
  DB: D1Database;
  IH_AUTH_DB: D1Database;
  SESSIONS: KVNamespace;
  REFRESH_TOKENS: KVNamespace;
  IH_AUTH_KV: KVNamespace;
  KV: KVNamespace;
  TOKENS: KVNamespace;
  EMAIL: EmailBinding;
  AUTH_EVENTS: AnalyticsEngineDataset;
  EVENTS: AnalyticsEngineDataset;
  JWT_SECRET: string;
  ENVIRONMENT: string;
  APP_ENV: string;
  APP_URL: string;
  COOKIE_DOMAIN: string;
  REFRESH_EXPIRY?: string;
  RATE_LIMIT_WINDOW?: string;
  RATE_LIMIT_MAX?: string;
  PLATFORM_SERVICE_TOKEN: string;
  GOOGLE_CLIENT_ID: string;
  GOOGLE_CLIENT_SECRET: string;
  AI?: Ai;
  IH_WELCOME_QUEUE?: Queue;
  PROVISION_QUEUE: Queue;
  BOOKKEEPING_AGENT: DurableObjectNamespace;
  CF_ACCOUNT_ID: string;
  CF_API_TOKEN: string;
  WFP_DISPATCH_NAMESPACE: string;
  PLATFORM_API_URL: string;
}
