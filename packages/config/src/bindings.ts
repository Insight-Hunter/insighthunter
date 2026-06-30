export interface CloudflareBindings {
  JWT_SECRET: string;
  DATABASE_URL?: string;
  CLOUDFLARE_ACCOUNT_ID: string;
  CLOUDFLARE_API_TOKEN?: string;
  D1_DATABASE_ID: string;
  KV_NAMESPACE_ID: string;
  R2_BUCKET: string;
  VECTORIZE_INDEX?: string;
  WORKERS_AI_ACCOUNT?: string;
}
