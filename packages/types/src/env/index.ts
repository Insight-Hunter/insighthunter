// ── Auth Worker env ───────────────────────────────────────────────────────────
export interface AuthEnv {
  DB:       D1Database;
  SESSIONS: KVNamespace;
  TOKENS:   KVNamespace;
  EVENTS:   AnalyticsEngineDataset;

  APP_ENV:              string;
  APP_URL:              string;
  CORS_ORIGIN:          string;
  JWT_EXPIRY:           string;
  REFRESH_EXPIRY:       string;
  RATE_LIMIT_WINDOW:    string;
  RATE_LIMIT_MAX:       string;

  JWT_SECRET:           string;
  REFRESH_SECRET:       string;
  MAILCHANNELS_API_KEY: string;
}

// ── Main API Worker env ───────────────────────────────────────────────────────
export interface MainEnv {
  DB:             D1Database;
  CACHE:          KVNamespace;
  RATE_LIMIT:     KVNamespace;
  REPORTS_BUCKET: R2Bucket;
  REPORT_QUEUE:       Queue;
  NOTIFICATION_QUEUE: Queue;
  EVENTS:         AnalyticsEngineDataset;

  APP_ENV:                 string;
  APP_TIER:                string;
  AUTH_SERVICE_URL:        string;
  AGENTS_SERVICE_URL:      string;
  BOOKKEEPING_SERVICE_URL: string;
  CORS_ORIGIN:             string;
  RATE_LIMIT_WINDOW:       string;
  RATE_LIMIT_MAX:          string;

  JWT_SECRET:      string;
  SERVICE_API_KEY: string;
}

// ── Agents Worker env ─────────────────────────────────────────────────────────
export interface AgentsEnv {
  DB:          D1Database;
  CACHE:       KVNamespace;
  EVENTS:      AnalyticsEngineDataset;
  AI:          Ai;

  APP_ENV:         string;
  CORS_ORIGIN:     string;
  SERVICE_API_KEY: string;
  AI_MODEL:        string;
}

// ── Bookkeeping Worker env ────────────────────────────────────────────────────
export interface BookkeepingEnv {
  DB:          D1Database;
  CACHE:       KVNamespace;
  EVENTS:      AnalyticsEngineDataset;

  APP_ENV:              string;
  CORS_ORIGIN:          string;
  SERVICE_API_KEY:      string;
  QBO_CLIENT_ID:        string;
  QBO_CLIENT_SECRET:    string;
  QBO_REDIRECT_URI:     string;
  QBO_ENVIRONMENT:      string;
}

// ── Lite Frontend env (Astro/Cloudflare adapter) ──────────────────────────────
export interface LiteEnv {
  IH_SESSIONS: KVNamespace;
  IH_CACHE:    KVNamespace;

  APP_ENV:        string;
  APP_URL:        string;
  APP_TIER:       string;
  SESSION_EXPIRY: string;

  JWT_SECRET:        string;
  QBO_CLIENT_ID:     string;
  QBO_CLIENT_SECRET: string;
  QBO_REDIRECT_URI:  string;
  QBO_ENVIRONMENT:   string;
}
