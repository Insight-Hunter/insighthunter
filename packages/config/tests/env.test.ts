import { describe, expect, it } from 'vitest';
import { loadConfig } from '../src/env.js';

describe('@ih/config', () => {
  it('parses valid configuration', () => {
    const config = loadConfig({
      NODE_ENV: 'development',
      JWT_SECRET: '12345678901234567890123456789012',
      CLOUDFLARE_ACCOUNT_ID: 'cf-account',
      D1_DATABASE_ID: 'd1-id',
      KV_NAMESPACE_ID: 'kv-id',
      R2_BUCKET: 'bucket-name',
    });

    expect(config.NODE_ENV).toBe('development');
    expect(config.JWT_SECRET).toHaveLength(32);
    expect(config.R2_BUCKET).toBe('bucket-name');
  });

  it('throws on invalid configuration', () => {
    expect(() =>
      loadConfig({
        NODE_ENV: 'development',
        JWT_SECRET: 'short',
        CLOUDFLARE_ACCOUNT_ID: 'cf-account',
        D1_DATABASE_ID: 'd1-id',
        KV_NAMESPACE_ID: 'kv-id',
        R2_BUCKET: 'bucket-name',
      }),
    ).toThrow();
  });
});
