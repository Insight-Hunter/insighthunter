// apps/insighthunter-bizforma/types/env.ts

export interface AuthContext {
  sub: string;
  email: string;
  tenantId: string;
  roles: string[];
  sessionId?: string;
  expiresAt?: string;
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
}

export type AppBindings = {
  Bindings: Env;
  Variables: {
    auth: AuthContext | null;
    requestId: string;
  };
};

export interface ApiSuccess<T> {
  ok: true;
  data: T;
}

export interface ApiError {
  ok: false;
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}
