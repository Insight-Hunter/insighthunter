import { z } from 'zod';

export const EnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  JWT_SECRET: z.string().min(32),
  DATABASE_URL: z.string().min(1).optional(),
  CLOUDFLARE_ACCOUNT_ID: z.string().min(1),
  CLOUDFLARE_API_TOKEN: z.string().min(1).optional(),
  D1_DATABASE_ID: z.string().min(1),
  KV_NAMESPACE_ID: z.string().min(1),
  R2_BUCKET: z.string().min(1),
  VECTORIZE_INDEX: z.string().min(1).optional(),
  WORKERS_AI_ACCOUNT: z.string().min(1).optional(),
});

export type AppConfig = z.infer<typeof EnvSchema>;

export function loadConfig(env: unknown): AppConfig {
  return EnvSchema.parse(env);
}
