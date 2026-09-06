/// <reference types="astro/client" />

interface ImportMetaEnv {
  readonly AUTH_BASE_URL?: string;
  readonly DASHBOARD_BASE_URL?: string;
  readonly STRIPE_SECRET_KEY?: string;
  readonly TURNSTILE_SECRET_KEY?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
