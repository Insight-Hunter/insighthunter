export type Tier = "free" | "standard" | "pro";

export const TIER_LIMITS: Record<
  Tier,
  {
    txPerMonth: number;
    qbSync: boolean;
    multiUser: boolean;
    advancedReports: boolean;
    bulkImport: boolean;
    autoReconcile: boolean;
  }
> = {
  free: {
    txPerMonth: 50,
    qbSync: false,
    multiUser: false,
    advancedReports: false,
    bulkImport: false,
    autoReconcile: false,
  },
  standard: {
    txPerMonth: 500,
    qbSync: true,
    multiUser: false,
    advancedReports: true,
    bulkImport: true,
    autoReconcile: false,
  },
  pro: {
    txPerMonth: Infinity,
    qbSync: true,
    multiUser: true,
    advancedReports: true,
    bulkImport: true,
    autoReconcile: true,
  },
};

// ── Cloudflare Env ─────────────────────────────────────────────────────────
export interface Env {
  // Cloudflare bindings
  DB: D1Database;
  TIER_USAGE: KVNamespace;
  SESSION_CACHE: KVNamespace;
  QB_TOKENS: KVNamespace;
  DOCUMENTS: R2Bucket;
  BOOKKEEPING_AGENT: DurableObjectNamespace;
  RECONCILIATION_AGENT: DurableObjectNamespace;
  CLASSIFICATION_QUEUE: Queue<ClassificationJob>;
  QB_SYNC_QUEUE: Queue<QBSyncJob>;
  AI: Ai;
  ANALYTICS: AnalyticsEngineDataset;
  ASSETS: Fetcher;

  // Environment variables
  AUTH_WORKER_URL: string;
  REPORTS_WORKER_URL: string;
  PAYROLL_WORKER_URL: string;
  QB_CLIENT_ID: string;
  QB_CLIENT_SECRET: string;
  QB_REDIRECT_URI: string;
  ENCRYPTION_KEY: string;
  ENVIRONMENT: string;
}

// ── Auth ───────────────────────────────────────────────────────────────────
export interface AuthUser {
  userId: string;
  orgId: string;
  tier: Tier;
  email: string;
  role: "owner" | "admin" | "member";
}

// ── Chart of Accounts ──────────────────────────────────────────────────────
export type AccountType =
  | "asset"
  | "liability"
  | "equity"
  | "revenue"
  | "expense"
  | "cost_of_goods_sold"
  | "other_income"
  | "other_expense";

export type AccountSubtype =
  | "bank"
  | "accounts_receivable"
  | "other_current_asset"
  | "fixed_asset"
  | "other_asset"
  | "accounts_payable"
  | "credit_card"
  | "other_current_liability"
  | "long_term_liability"
  | "equity"
  | "retained_earnings"
  | "income"
  | "other_income"
  | "expense"
  | "other_expense"
  | "cost_of_goods_sold";

export interface Account {
  id: string;
  org_id: string;
  name: string;
  code: string;
  type: AccountType;
  subtype: AccountSubtype;
  description: string | null;
  parent_id: string | null;
  is_active: number; // SQLite boolean
  qb_account_id: string | null;
  balance: number;
  created_at: string;
  updated_at: string;
}

// ── Transactions ───────────────────────────────────────────────────────────
export type TransactionStatus =
  | "pending_classification"
  | "pending_approval"
  | "approved"
  | "posted"
  | "excluded";

export type TransactionSource =
  | "bank_import"
  | "manual"
  | "payroll_je"
  | "qb_sync"
  | "csv_import";

export interface Transaction {
  id: string;
  org_id: string;
  date: string;
  description: string;
  amount: number;
  source: TransactionSource;
  status: TransactionStatus;
  account_id: string | null;
  confidence: number | null;
  ai_reasoning: string | null;
  journal_entry_id: string | null;
  qb_transaction_id: string | null;
  bank_account_ref: string | null;
  metadata: string | null;
  created_at: string;
  updated_at: string;
}

// ── Journal Entries ────────────────────────────────────────────────────────
export type JournalEntryStatus = "draft" | "posted" | "voided";
export type JournalEntryType =
  | "general"
  | "payroll"
  | "bank"
  | "adjustment"
  | "closing"
  | "opening";

export interface JournalEntry {
  id: string;
  org_id: string;
  date: string;
  memo: string;
  reference: string | null;
  type: JournalEntryType;
  status: JournalEntryStatus;
  created_by: string;
  approved_by: string | null;
  qb_journal_entry_id: string | null;
  lines?: JournalEntryLine[];
  created_at: string;
  updated_at: string;
}

export interface JournalEntryLine {
  id: string;
  journal_entry_id: string;
  account_id: string;
  account_name?: string;
  debit: number;
  credit: number;
  description: string | null;
  created_at: string;
}

// ── Reconciliation ─────────────────────────────────────────────────────────
export type ReconciliationStatus =
  | "open"
  | "in_progress"
  | "completed"
  | "discrepancy";

export interface ReconciliationSession {
  id: string;
  org_id: string;
  account_id: string;
  statement_date: string;
  statement_balance: number;
  starting_balance: number;
  status: ReconciliationStatus;
  cleared_balance: number | null;
  difference: number | null;
  created_by: string;
  completed_at: string | null;
  created_at: string;
}

// ── AI Classification Queue ────────────────────────────────────────────────
export type AIQueueStatus = "pending" | "answered" | "skipped";

export interface AIClassificationItem {
  id: string;
  org_id: string;
  transaction_id: string;
  question: string;
  suggested_account_id: string | null;
  suggested_account_name: string | null;
  confidence: number;
  ai_reasoning: string;
  alternatives: string; // JSON array of AIAlternative
  status: AIQueueStatus;
  human_answer: string | null;
  resolved_account_id: string | null;
  created_at: string;
  resolved_at: string | null;
}

export interface AIAlternative {
  account_id: string;
  account_name: string;
  confidence: number;
  reasoning: string;
}

export interface AIClassificationResult {
  suggestedAccountId: string | null;
  suggestedAccountName: string | null;
  confidence: number;
  reasoning: string;
  needsHumanReview: boolean;
  question: string | null;
  alternatives: AIAlternative[];
}

// ── QuickBooks ─────────────────────────────────────────────────────────────
export interface QBConnection {
  org_id: string;
  realm_id: string;
  access_token: string;
  refresh_token: string;
  expires_at: number;
  company_name: string;
  last_synced_at: string | null;
  connected_at: string;
}

// ── Queue Jobs ─────────────────────────────────────────────────────────────
export interface ClassificationJob {
  transactionId: string;
  orgId: string;
  userId: string;
}

export interface QBSyncJob {
  orgId: string;
  direction: "push" | "pull";
  entityType: "account" | "journal_entry" | "transaction";
  entityId?: string;
}

// ── Agent State ────────────────────────────────────────────────────────────
export interface BookkeepingAgentState {
  orgId: string;
  pendingCount: number;
  lastClassifiedAt: string | null;
  processingTransactionId: string | null;
}
