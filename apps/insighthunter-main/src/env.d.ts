/// <reference path="../.astro/types.d.ts" />
/// <reference types="astro/client" />
/// <reference types="@cloudflare/workers-types" />

type Runtime = import('@astrojs/cloudflare').Runtime<Env>;

declare namespace App {
  interface Locals extends Runtime {
    user?: {
      id: string;
      email: string;
      plan: 'lite' | 'standard' | 'pro';
    };
  }
}

interface Env {
  DB: D1Database;
  KV: KVNamespace;
  AUTH: Fetcher;
  ENVIRONMENT: string;
}
