
import { useState, useCallback } from 'react';

const API_URL = 'https://api.insighthunter.app';

export interface ReconciliationStatement {
  date: string;
  endingBalance: number;
  startingBalance?: number;
}

export interface ReconciliationResult {
  accountId: string;
  bookBalance: number;
  statementBalance: number;
  difference: number;
  reconciled: boolean;
  date: string;
}

export interface UnreconciledTransaction {
  id: string;
  date: string;
  description: string;
  amount: number;
  type: 'debit' | 'credit';
  cleared: boolean;
}

interface UseReconciliationOptions {
  companyId: string;
}

export function useReconciliation({ companyId }: UseReconciliationOptions) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ReconciliationResult | null>(null);

  const reconcile = useCallback(
    async (accountId: string, statement: ReconciliationStatement) => {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch(
          `${API_URL}/api/ledger/${companyId}/reconcile`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              accountId,
              statement,
            }),
          }
        );

        if (!response.ok) {
          throw new Error('Reconciliation failed');
        }

        const data = await response.json();
        setResult(data);
        return data;
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [companyId]
  );

  const reset = useCallback(() => {
    setResult(null);
    setError(null);
  }, []);

  return {
    loading,
    error,
    result,
    reconcile,
    reset,
  };
}
