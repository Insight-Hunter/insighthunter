interface Env {
  // Service Bindings
  AUTH_WORKER: Fetcher;

  // Durable Object Bindings
  CFO_AGENT: DurableObjectNamespace;
  FORECAST_AGENT: DurableObjectNamespace;
  REPORT_AGENT: DurableObjectNamespace;
  ONBOARDING_AGENT: DurableObjectNamespace;
  NEW_AGENT: DurableObjectNamespace;

  // KV Namespaces
  CACHE: KVNamespace;

  // Vectorize
  VECTORIZE: VectorizeIndex;

  // Analytics Engine
  EVENTS: AnalyticsEngineDataset;

  // AI
  AI: unknown;

  // Environment Variables
  ENVIRONMENT: 'development' | 'production';
  SITE_URL: string;
  AI_MODEL: string;
  AI_MODEL_PRO: string;

  // Secrets
  TURNSTILE_SECRET: string;
  JWT_SECRET: string;
}
