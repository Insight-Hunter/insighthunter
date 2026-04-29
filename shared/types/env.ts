// shared/types/env.ts
export type SharedPlatformEnv = {
  AUTH_BASE_URL: string;
  APP_BASE_URL: string;
  SESSION_AUDIENCE: string;
};

export type FinopsEnv = SharedPlatformEnv & {
  DB: D1Database;
  RECEIPTS_BUCKET: R2Bucket;
  MERCURY_SYNC: KVNamespace;
  ANALYTICS: AnalyticsEngineDataset;
  NOTIFICATIONS: Queue;
};
