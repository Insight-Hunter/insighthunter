export interface Env {
  JWT_SECRET: string;
  DB: D1Database;
  RECONCILIATION_AGENT: DurableObjectNamespace;
}