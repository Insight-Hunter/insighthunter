export interface Env {
  LEDGER: DurableObjectNamespace; // one BookkeepingLedger instance per user, id = userId
  AI: Ai; // Workers AI binding, used for transaction auto-categorization
  AUTH_API_URL: string; // https://auth.insighthunter.app
  ALLOWED_ORIGIN: string; // https://app.insighthunter.app
}

export interface SessionPayload {
  userId: string;
  email: string;
  tier: string;
  issuedAt: number;
  expiresAt: number;
}

export interface Account {
  id: string;
  name: string;
  type: "checking" | "savings" | "credit_card" | "cash" | "other";
  created_at: number;
}

export interface Category {
  id: string;
  name: string;
  kind: "income" | "expense";
}

export interface Transaction {
  id: string;
  account_id: string;
  date: number; // epoch ms
  amount_cents: number; // positive = income, negative = expense
  description: string;
  category_id: string | null;
  ai_suggested: 0 | 1;
  created_at: number;
}
