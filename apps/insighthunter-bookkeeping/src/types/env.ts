import type { CategorizationAgent } from '../agents/CategorizationAgent';
import type {
  BookkeepingLedger,
  InvoiceManager,
  BankConnectionManager,
  SubscriptionManager,
} from './../agents/'; // or wherever your DO classes live

export interface Env {
  // ... existing ...
  LEDGER:          DurableObjectNamespace; // BookkeepingLedger
  INVOICES:        DurableObjectNamespace; // InvoiceManager
  BANK_CONNECTION: DurableObjectNamespace; // BankConnectionManager
  SUBSCRIPTIONS:   DurableObjectNamespace; // SubscriptionManager
  TODO_QUEUE:      Queue<TodoJobPayload>;
  AUTH_WORKER:     Fetcher;
  AGENTS_WORKER:   Fetcher;
  PLAID_CLIENT_ID: string;
  PLAID_SECRET:    string;
  PLAID_ENV:       'sandbox' | 'production';
}

export interface Env {
  DB: D1Database;
  KV: KVNamespace;
  R2: R2Bucket;
  IMPORT_QUEUE: Queue<ImportJobPayload>;
  RECONCILIATION_QUEUE: Queue<ReconciliationJobPayload>;
  CATEGORIZATION_AGENT: DurableObjectNamespace;
  AI: Ai;
  ANALYTICS: AnalyticsEngineDataset;
  JWT_SECRET: string;
  AUTH_SERVICE_URL: string;-
  CORS_ORIGINS: string; // comma-separated
  ENVIRONMENT: 'development' | 'staging' | 'production';
}

export interface ImportJobPayload {
  orgId: string;
  userId: string;
  fileKey: string; // R2 object key
  format: 'csv' | 'qbo' | 'ofx';
  accountId?: string;
}

export interface ReconciliationJobPayload {
  orgId: string;
  userId: string;
  accountId: string;
  statementDate: string;
  statementBalance: number; // cents
  currency: string;
}

export interface AuthContext {
  userId: string;
  orgId: string;
  role: 'owner' | 'admin' | 'member' | 'viewer';
  plan: 'free' | 'pro' | 'white_label';
}
