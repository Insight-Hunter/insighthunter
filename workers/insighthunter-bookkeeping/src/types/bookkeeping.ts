// src/types/bookkeeping.ts
export interface Transaction {
  id: string;
  date: string;
  description: string;
  entries: JournalEntry[];
  status: 'draft' | 'posted';
  createdAt: string;
  updatedAt?: string;
  memo?: string;
  tags?: string[];
  source?: 'manual' | 'import' | 'bank' | 'quickbooks';
  sourceId?: string;
}

export interface JournalEntry {
  accountId: string;
  accountName: string;
  type: 'debit' | 'credit';
  amount: number;
  memo?: string;
}

export interface Account {
  id: string;
  name: string;
  type: AccountType;
  subtype?: string;
  description?: string;
  balance?: number;
  currency: string;
  parentId?: string;
  isActive: boolean;
}

export type AccountType =
  | 'asset'
  | 'liability'
  | 'equity'
  | 'revenue'
  | 'expense'
  | 'cost-of-goods-sold';

export interface BalanceSheet {
  assets: {
    currentAssets: LineItem[];
    fixedAssets: LineItem[];
    total: number;
  };
  liabilities: {
    currentLiabilities: LineItem[];
    longTermLiabilities: LineItem[];
    total: number;
  };
  equity: {
    items: LineItem[];
    total: number;
  };
  date: string;
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
