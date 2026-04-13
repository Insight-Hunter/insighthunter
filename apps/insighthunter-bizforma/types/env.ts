export interface AuthContext {
  sub: string;
  email?: string;
  tenantId: string;
  roles: string[];
}

export interface Env {
  DB: D1Database;
  SESSIONS: KVNamespace;
  CACHE: KVNamespace;
  DOCUMENTS: R2Bucket;
  ASSETS: Fetcher;
  DOCUMENT_QUEUE: Queue;
  REMINDER_QUEUE: Queue;
  AI: Ai;
  FORMATION_AGENT: DurableObjectNamespace;
  COMPLIANCE_AGENT: DurableObjectNamespace;
  APP_ORIGIN: string;
  AUTH_ORIGIN: string;
  AUTH_AUDIENCE: string;
  AUTH_INTROSPECT_PATH: string;
  PROVISIONING_ENABLED: string;
}
