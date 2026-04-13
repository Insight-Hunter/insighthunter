export interface Env {
  DB:          D1Database;
  KV:          KVNamespace;
  ANALYTICS:   AnalyticsEngineDataset;
  JWT_SECRET:  string;
  CORS_ORIGINS: string;
  ENVIRONMENT: 'development' | 'staging' | 'production';
  APP_BASE_URL: string;
  // KV
  SESSION_KV: KVNamespace;

  // Workers for Platforms dispatcher
  TENANT_DISPATCHER: DispatchNamespace;

  // Durable Objects (in bookkeeping worker, referenced via DO binding)
  BOOKKEEPING_AGENT: DurableObjectNamespace;

  // Queues
  PROVISION_QUEUE: Queue<ProvisionMessage>;

  // Analytics Engine
  BILLING_EVENTS: AnalyticsEngineDataset;

  // Secrets & vars
  CF_API_TOKEN: string;       // WfP + KV management
  CF_ACCOUNT_ID: string;
  WFP_DISPATCH_NAMESPACE: string;
  JWT_SECRET: string;
  AUTH_WORKER_URL: string;
}

export interface ProvisionMessage {
  type: "provision" | "seed_bookkeeping" | "deprovision";
  orgId: string;
  tier?: string;
  kvNamespaceId?: string;
  retryCount?: number;
}

export interface ClassificationJob {
  orgId: string;
  transactionId: string;
  description: string;
  amount: number;
}
