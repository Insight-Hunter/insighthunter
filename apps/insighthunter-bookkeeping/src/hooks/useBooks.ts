// src/hooks/useBooks.ts
import { useState, useEffect, useCallback } from 'react';

const API_URL = 'http://localhost:8787';

export interface Transaction {
  id?: string;
  date: string;
  description: string;
  entries: JournalEntry[];
  status?: 'draft' | 'posted';
  createdAt?: string;
  memo?: string;
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
  type: 'asset' | 'liability' | 'equity' | 'revenue' | 'expense' | 'cost-of-goods-sold';
  subtype?: string;
  description?: string;
  balance?: number;
}

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

interface UseBooksOptions {
  companyId: string;
  autoLoad?: boolean;
}

export function useBooks({ companyId, autoLoad = true }: UseBooksOptions) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load transactions from the API
  const loadTransactions = useCallback(
    async (filters?: {
      startDate?: string;
      endDate?: string;
      accountId?: string;
    }) => {
      setLoading(true);
      setError(null);

      try {
        const params = new URLSearchParams();
        if (filters?.startDate) params.append('startDate', filters.startDate);
        if (filters?.endDate) params.append('endDate', filters.endDate);
        if (filters?.accountId) params.append('accountId', filters.accountId);

        const response = await fetch(
          `${API_URL}/api/ledger/${companyId}/transactions?${params.toString()}`
        );

        if (!response.ok) {
          throw new Error('Failed to load transactions');
        }

        const data = await response.json();
        setTransactions(data.transactions || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
        console.error('Error loading transactions:', err);
      } finally {
        setLoading(false);
      }
    },
    [companyId]
  );

  // Create a new transaction
  const createTransaction = useCallback(
    async (transaction: Transaction) => {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch(
          `${API_URL}/api/ledger/${companyId}/transaction`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(transaction),
          }
        );

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to create transaction');
        }

        const data = await response.json();
        
        // Add the new transaction to the state
        setTransactions((prev) => [data.transaction, ...prev]);
        
        return data.transaction;
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
        console.error('Error creating transaction:', err);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [companyId]
  );

  // Load balance sheet
  const getBalanceSheet = useCallback(async (): Promise<BalanceSheet | null> => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `${API_URL}/api/ledger/${companyId}/balance-sheet`
      );

      if (!response.ok) {
        throw new Error('Failed to load balance sheet');
      }

      const data = await response.json();
      return data;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      console.error('Error loading balance sheet:', err);
      return null;
    } finally {
      setLoading(false);
    }
  }, [companyId]);

  // Load profit & loss statement
  const getProfitLoss = useCallback(
    async (startDate?: string, endDate?: string): Promise<ProfitLoss | null> => {
      setLoading(true);
      setError(null);

      try {
        const params = new URLSearchParams();
        if (startDate) params.append('startDate', startDate);
        if (endDate) params.append('endDate', endDate);

        const response = await fetch(
          `${API_URL}/api/ledger/${companyId}/profit-loss?${params.toString()}`
        );

        if (!response.ok) {
          throw new Error('Failed to load profit & loss');
        }

        const data = await response.json();
        return data;
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
        console.error('Error loading profit & loss:', err);
        return null;
      } finally {
        setLoading(false);
      }
    },
    [companyId]
  );

  // Get account balance
  const getAccountBalance = useCallback(
    (accountId: string): number => {
      const account = accounts.find((a) => a.id === accountId);
      return account?.balance || 0;
    },
    [accounts]
  );

  // Calculate trial balance
  const getTrialBalance = useCallback(() => {
    let totalDebits = 0;
    let totalCredits = 0;

    accounts.forEach((account) => {
      const balance = account.balance || 0;
      
      // Assets, Expenses, and COGS have debit balances
      if (
        account.type === 'asset' ||
        account.type === 'expense' ||
        account.type === 'cost-of-goods-sold'
      ) {
        totalDebits += balance;
      } else {
        // Liabilities, Equity, and Revenue have credit balances
        totalCredits += balance;
      }
    });

    return {
      debits: totalDebits,
      credits: totalCredits,
      isBalanced: Math.abs(totalDebits - totalCredits) < 0.01,
      difference: totalDebits - totalCredits,
    };
  }, [accounts]);

  // Auto-load transactions on mount
  useEffect(() => {
    if (autoLoad) {
      loadTransactions();
    }
  }, [autoLoad, loadTransactions]);

  return {
    transactions,
    accounts,
    loading,
    error,
    loadTransactions,
    createTransaction,
    getBalanceSheet,
    getProfitLoss,
    getAccountBalance,
    getTrialBalance,
  };
}

// Hook for managing a single transaction draft
export function useTransactionDraft() {
  const [draft, setDraft] = useState<Transaction>({
    date: new Date().toISOString().split('T')[0],
    description: '',
    entries: [
      { accountId: '', accountName: '', type: 'debit', amount: 0 },
      { accountId: '', accountName: '', type: 'credit', amount: 0 },
    ],
  });

  const updateField = useCallback((field: keyof Transaction, value: any) => {
    setDraft((prev) => ({ ...prev, [field]: value }));
  }, []);

  const updateEntry = useCallback(
    (index: number, field: keyof JournalEntry, value: any) => {
      setDraft((prev) => {
        const entries = [...prev.entries];
        entries[index] = { ...entries[index], [field]: value };
        return { ...prev, entries };
      });
    },
    []
  );

  const addEntry = useCallback((type: 'debit' | 'credit' = 'debit') => {
    setDraft((prev) => ({
      ...prev,
      entries: [
        ...prev.entries,
        { accountId: '', accountName: '', type, amount: 0 },
      ],
    }));
  }, []);

  const removeEntry = useCallback((index: number) => {
    setDraft((prev) => ({
      ...prev,
      entries: prev.entries.filter((_, i) => i !== index),
    }));
  }, []);

  const reset = useCallback(() => {
    setDraft({
      date: new Date().toISOString().split('T')[0],
      description: '',
      entries: [
        { accountId: '', accountName: '', type: 'debit', amount: 0 },
        { accountId: '', accountName: '', type: 'credit', amount: 0 },
      ],
    });
  }, []);

  // Calculate if the transaction is balanced
  const isBalanced = useCallback(() => {
    const debits = draft.entries
      .filter((e) => e.type === 'debit')
      .reduce((sum, e) => sum + Number(e.amount), 0);

    const credits = draft.entries
      .filter((e) => e.type === 'credit')
      .reduce((sum, e) => sum + Number(e.amount), 0);

    return Math.abs(debits - credits) < 0.01;
  }, [draft]);

  const getTotals = useCallback(() => {
    const debits = draft.entries
      .filter((e) => e.type === 'debit')
      .reduce((sum, e) => sum + Number(e.amount), 0);

    const credits = draft.entries
      .filter((e) => e.type === 'credit')
      .reduce((sum, e) => sum + Number(e.amount), 0);

    return { debits, credits, difference: debits - credits };
  }, [draft]);

  return {
    draft,
    updateField,
    updateEntry,
    addEntry,
    removeEntry,
    reset,
    isBalanced: isBalanced(),
    totals: getTotals(),
  };
}
