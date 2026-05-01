export interface AuthContext {
  sub: string;
  email: string;
  tenantId: string;
  roles: string[];
  sessionId?: string;
}

export interface Env {
  DB: D1Database;
  SESSIONS: KVNamespace;
  DOCUMENTS: R2Bucket;
  AI: Ai;
  ASSETS: Fetcher;
  AUTH_ORIGIN: string;
  AUTH_AUDIENCE: string;
  APP_ORIGIN: string;
  PROVISIONING_ENABLED?: string;
  PROVISIONING_API?: Fetcher;
  FORMATION_AGENT: DurableObjectNamespace;
  COMPLIANCE_AGENT: DurableObjectNamespace;
  DOCUMENT_QUEUE?: Queue;
  REMINDER_QUEUE?: Queue;
  ANALYTICS?: AnalyticsEngineDataset;
}

export type AppBindings = {
  Bindings: Env;
  Variables: {
    auth: AuthContext;
    requestId: string;
  };
};
