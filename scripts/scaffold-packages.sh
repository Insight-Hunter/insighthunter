# packages/types — shared types consumed by all IH workers
# No wrangler.toml — this is a build-time-only package, not a Worker

mkdir -p packages/types/src/{auth,financial,env,common}

# =============================================================================
# package.json
# =============================================================================
cat > packages/types/package.json <<'JSON'
{
  "name": "@insighthunter/types",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "exports": {
    ".":            { "types": "./src/index.ts" },
    "./auth":       { "types": "./src/auth/index.ts" },
    "./financial":  { "types": "./src/financial/index.ts" },
    "./env":        { "types": "./src/env/index.ts" },
    "./common":     { "types": "./src/common/index.ts" }
  },
  "scripts": {
    "type-check": "tsc --noEmit"
  },
  "devDependencies": {
    "@cloudflare/workers-types": "^4.20250310.0",
    "typescript":                "^5.8.2"
  }
}
JSON

# =============================================================================
# tsconfig.json
# =============================================================================
cat > packages/types/tsconfig.json <<'JSON'
{
  "compilerOptions": {
    "target":               "ESNext",
    "module":               "ESNext",
    "moduleResolution":     "bundler",
    "lib":                  ["ESNext"],
    "strict":               true,
    "verbatimModuleSyntax": true,
    "noUnusedLocals":       true,
    "noUnusedParameters":   true,
    "noEmit":               true,
    "types":                ["@cloudflare/workers-types"]
  },
  "include": ["src/**/*"]
}
JSON

# =============================================================================
# src/auth/index.ts
# =============================================================================
cat > packages/types/src/auth/index.ts <<'TS'
export type UserStatus  = "active" | "suspended" | "pending";
export type Role        = "owner" | "admin" | "member" | "viewer";
export type Tier        = "lite" | "standard" | "enterprise";

export interface User {
  id:             string;
  org_id:         string;
  email:          string;
  name:           string;
  password_hash:  string;
  role:           Role;
  tier:           Tier;
  email_verified: number;
  status:         UserStatus;
  created_at:     string;
  updated_at:     string;
}

export interface PublicUser {
  id:            string;
  email:         string;
  name:          string;
  orgId:         string;
  role:          Role;
  tier:          Tier;
  emailVerified: boolean;
}

export interface Org {
  id:         string;
  name:       string;
  tier:       Tier;
  status:     "active" | "suspended";
  created_at: string;
  updated_at: string;
}

export interface SessionRecord {
  userId:    string;
  orgId:     string;
  role:      Role;
  tier:      Tier;
  ip:        string;
  userAgent: string;
  createdAt: number;
  expiresAt: number;
}

export interface AccessTokenPayload {
  sub:   string;
  email: string;
  name:  string;
  orgId: string;
  role:  Role;
  tier:  Tier;
  type:  "access";
  iat:   number;
  exp:   number;
}

export interface RefreshTokenPayload {
  sub:  string;
  jti:  string;
  type: "refresh";
  iat:  number;
  exp:  number;
}

export interface AuthTokens {
  accessToken:  string;
  refreshToken: string;
  expiresIn:    number;
  tokenType:    "Bearer";
}

export interface AuthResponse {
  ok:     true;
  tokens: AuthTokens;
  user:   PublicUser;
}

// ── Request bodies ────────────────────────────────────────────────────────────
export interface RegisterBody {
  name:     string;
  email:    string;
  password: string;
  orgName?: string;
}

export interface LoginBody {
  email:    string;
  password: string;
}

export interface RefreshBody {
  refreshToken: string;
}

export interface ForgotPasswordBody {
  email: string;
}

export interface ResetPasswordBody {
  token:    string;
  password: string;
}

export interface AssignRoleBody {
  userId: string;
  role:   Role;
}
TS

# =============================================================================
# src/financial/index.ts
# =============================================================================
cat > packages/types/src/financial/index.ts <<'TS'
export interface KPISnapshot {
  revenue:     number;
  expenses:    number;
  netIncome:   number;
  cashBalance: number;
  grossMargin: number;
  period:      string;
  asOf:        string;
}

export interface DashboardData {
  kpis:         KPISnapshot;
  recentAlerts: Alert[];
  trendData:    TrendPoint[];
}

export interface TrendPoint {
  period:   string;
  revenue:  number;
  expenses: number;
  net:      number;
}

export interface Alert {
  id:        string;
  type:      "cash_low" | "expense_spike" | "revenue_drop" | "insight";
  message:   string;
  severity:  "info" | "warning" | "critical";
  createdAt: string;
}

export interface ProfitLoss {
  periodStart:   string;
  periodEnd:     string;
  totalRevenue:  number;
  totalExpenses: number;
  netIncome:     number;
  grossMargin:   number;
  rows:          PLRow[];
}

export interface PLRow {
  account:  string;
  amount:   number;
  type:     "income" | "expense";
  category: string;
}

export interface CashFlow {
  periodStart:    string;
  periodEnd:      string;
  operatingCash:  number;
  investingCash:  number;
  financingCash:  number;
  netCashChange:  number;
  openingBalance: number;
  closingBalance: number;
}

export interface ForecastResult {
  periods:      ForecastPeriod[];
  confidence:   number;
  generatedAt:  string;
  modelVersion: string;
}

export interface ForecastPeriod {
  period:        string;
  projectedRev:  number;
  projectedExp:  number;
  projectedNet:  number;
  lower:         number;
  upper:         number;
}

export interface Transaction {
  id:          string;
  orgId:       string;
  date:        string;
  description: string;
  amount:      number;
  category:    string;
  account:     string;
  source:      "qbo" | "csv" | "manual";
  createdAt:   string;
}

export interface ReportRecord {
  id:          string;
  orgId:       string;
  type:        "pl" | "cashflow" | "balance_sheet" | "forecast";
  title:       string;
  periodStart: string;
  periodEnd:   string;
  r2Key:       string;
  createdAt:   string;
  createdBy:   string;
}

export interface Insight {
  id:        string;
  orgId:     string;
  summary:   string;
  detail:    string;
  actions:   string[];
  model:     string;
  createdAt: string;
}

export interface Client {
  id:        string;
  orgId:     string;
  name:      string;
  email:     string;
  tier:      "lite" | "standard" | "enterprise";
  status:    "active" | "suspended" | "trial";
  createdAt: string;
}

export interface QBOConnection {
  realmId:      string;
  accessToken:  string;
  refreshToken: string;
  expiresAt:    number;
  companyName:  string;
}

export interface QBOTokenResponse {
  access_token:               string;
  refresh_token:              string;
  token_type:                 string;
  expires_in:                 number;
  x_refresh_token_expires_in: number;
}
TS

# =============================================================================
# src/env/index.ts
# =============================================================================
cat > packages/types/src/env/index.ts <<'TS'
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
TS

# =============================================================================
# src/common/index.ts
# =============================================================================
cat > packages/types/src/common/index.ts <<'TS'
// ── API response wrappers ─────────────────────────────────────────────────────
export interface ApiOk<T> {
  ok:   true;
   T;
}

export interface ApiError {
  ok?:     false;
  error:   string;
  message: string;
  issues?: { field: string; message: string }[];
}

export type ApiResponse<T> = ApiOk<T> | ApiError;

// ── Pagination ────────────────────────────────────────────────────────────────
export interface PaginatedResult<T> {
     T[];
  total:  number;
  limit:  number;
  offset: number;
}

export interface PaginationParams {
  limit?:  number;
  offset?: number;
}

// ── Date helpers ──────────────────────────────────────────────────────────────
export interface DateRange {
  start: string;   // YYYY-MM-DD
  end:   string;   // YYYY-MM-DD
}

// ── Service-to-service ────────────────────────────────────────────────────────
export interface ServiceRequest {
  orgId:   string;
  userId?: string;
}

export interface HealthResponse {
  ok:      true;
  service: string;
  ts:      string;
}
TS

# =============================================================================
# ============================================================================
# src/index.ts — barrel export
# =============================================================================
cat > packages/types/src/index.ts <<'TS'
export * from "./auth/index";
export * from "./financial/index";
export * from "./env/index";
export * from "./common/index";
TS

# =============================================================================
# Done
# =============================================================================
echo ""
echo -e "${BOLD}${GREEN}╔═════════════════════════════════════════════════════════╗${RESET}"
echo -e "${BOLD}${GREEN}║  ✅  packages/types scaffolded                          ║${RESET}"
echo -e "${BOLD}${GREEN}╠═════════════════════════════════════════════════════════╣${RESET}"
echo -e "${GREEN}║  No wrangler.toml — types-only package                  ║${RESET}"
echo -e "${GREEN}║                                                         ║${RESET}"
echo -e "${GREEN}║  Usage in each Worker package.json:                     ║${RESET}"
echo -e "${GREEN}║    \"@insighthunter/types\": \"workspace:*\"                ║${RESET}"
echo -e "${GREEN}║                                                         ║${RESET}"
echo -e "${GREEN}║  Import in Workers:                                     ║${RESET}"
echo -e "${GREEN}║    import type { AuthEnv } from                         ║${RESET}"
echo -e "${GREEN}║      \"@insighthunter/types/env\"                         ║${RESET}"
echo -e "${GREEN}║    import type { ProfitLoss } from                      ║${RESET}"
echo -e "${GREEN}║      \"@insighthunter/types/financial\"                   ║${RESET}"
echo -e "${GREEN}╚═════════════════════════════════════════════════════════╝${RESET}"
echo ""
if command -v tree &> /dev/null; then
  tree packages/types -a --dirsfirst -I "node_modules"
else
  find packages/types -not -path "*/node_modules/*" | sort
fi

