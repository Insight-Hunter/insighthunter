// src/hooks/useBooks.ts
import { useState, useCallback, useEffect } from 'react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8787';

// Represents a single account in the chart of accounts
export interface Account {
  id: string;
  name: string;
  type: 'asset' | 'liability' | 'equity' | 'revenue' | 'expense';
  balance: number;
  subAccounts?: Account[];
}

// Represents a journal entry
export interface JournalEntry {
  id: string;
  date: string;
  description: string;
  transactions: {
    accountId: string;
    amount: number;
    type: 'debit' | 'credit';
  }[];
}

// Data structure for the Balance Sheet report
export interface BalanceSheet {
  date: string;
  assets: {
    total: number;
    breakdown: { [category: string]: number };
  };
  liabilities: {
    total: number;
    breakdown: { [category:string]: number };
  };
  equity: {
    total: number;
    breakdown: { [category: string]: number };
  };
}

// Data structure for the Profit & Loss (Income Statement) report
export interface ProfitLoss {
  startDate: string;
  endDate: string;
  revenue: {
    total: number;
    breakdown: { [category: string]: number };
  };
  costOfGoodsSold: {
      total: number;
      breakdown: { [category: string]: number };
  };
  grossProfit: number;
  expenses: {
    total: number;
    breakdown: { [category: string]: number };
  };
  netIncome: number;
}


interface UseBooksOptions {
  companyId: string;
}

export function useBooks({ companyId }: UseBooksOptions) {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchAccounts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${API_URL}/api/ledger/${companyId}/accounts`);
      if (!response.ok) {
        throw new Error('Failed to fetch accounts');
      }
      const data = await response.json();
      setAccounts(await response.json());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
    } finally {
      setLoading(false);
    }
  }, [companyId]);

  useEffect(() => {
    if (companyId) {
      fetchAccounts();
    }
  }, [companyId, fetchAccounts]);

  return {
    accounts,
    loading,
    error,
    refetchAccounts: fetchAccounts,
  };
}
