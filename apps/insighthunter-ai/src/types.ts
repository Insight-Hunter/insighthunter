
import type { KVNamespace, DurableObjectNamespace, D1Database, VectorizeIndex, AnalyticsEngineDataset } from '@cloudflare/workers-types'

export interface Env {
  // wrangler.jsonc bindings
  AI: any;
  VECTORIZE: VectorizeIndex;
  DB: D1Database;
  KV: KVNamespace;
  SESSIONS: KVNamespace;
  AI_SESSIONS: DurableObjectNamespace;
  ANALYTICS: AnalyticsEngineDataset;

  // .dev.vars
  JWT_SECRET: string;

  // custom
  ALLOWED_ORIGINS: string;
}

export interface SessionData {
  user: {
    id: string;
    email: string;
  };
}
