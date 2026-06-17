// src/types/bookkeeping.ts

export interface ReconciliationState {
  sessionId: string;
  orgId: string;
  clearedTransactionIds: string[];
  clearedTotal: number;
}
export interface JournalEntry {
    accountId: string;
    accountName: string;
    type: 'debit' | 'credit';
    amount: number;
    id: string;
    orgId: string;
    transactionId: string | null;
    date: string;
    reference: string | null;
    memo: string | null;
    lines: JournalLine[];
    isBalanced: boolean;
    createdBy: string;
    createdAt: string;
  }
export interface ProfitLoss {
  revenue: LineItem[];
  costOfGoodsSold: LineItem[];
  expenses: LineItem[];
  totalRevenue: number;
  totalCOGS: number;
  grossProfit: number;
  totalExpenses: number;
  netIncome: number;
  startDate: string;
  endDate: string;
}

export interface LineItem {
  name: string;
  amount: number;
}

export interface Client {
  id: string;
  name: string;
  email: string;
  phone?: string;
  address?: string;
  taxId?: string;
  createdAt: string;
  updatedAt?: string;
}
