export interface Env {
  DB:          D1Database;
  KV:          KVNamespace;
  ANALYTICS:   AnalyticsEngineDataset;
  JWT_SECRET:  string;
  CORS_ORIGINS: string;
  ENVIRONMENT: 'development' | 'staging' | 'production';
  APP_BASE_URL: string;
}
