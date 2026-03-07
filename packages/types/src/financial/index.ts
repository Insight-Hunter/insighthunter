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
