export interface JwtPayload {
  sub: string;
  tenantId: string;
  role: string;
  tier: string;
  iat: number;
  exp: number;
}

export interface ProvisioningMessage {
  tenantId: string;
  userId: string;
  email: string;
  businessName: string;
  tier: string;
  enqueuedAt: string;
}

export interface Env {
  // D1
  AUTH_DB: D1Database;
  // KV
  SESSION_KV: KVNamespace;
  // Queue
  PROVISIONING_QUEUE: Queue<ProvisioningMessage>;
  // Durable Object
  RATE_LIMITER: DurableObjectNamespace;
  // Analytics Engine
  AUTH_ANALYTICS: AnalyticsEngineDataset;
  // Service bindings
  BOOKKEEPING_SERVICE: Fetcher;
  ASSETS: Fetcher;
  // Environment variables
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
