// src/hooks/useReports.ts
import { useState, useCallback } from 'react';
import type { BalanceSheet, ProfitLoss } from './useBooks';
import { serializeActionResult } from 'astro:actions';

const API_URL = 'http://localhost:8787';

interface UseReportsOptions {
  companyId: string;
}

export function useReports({ companyId }: UseReportsOptions) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getBalanceSheet = useCallback(
    async (date?: string): Promise<BalanceSheet | null> => {
      setLoading(true);
      setError(null);

      try {
        const params = new URLSearchParams();
        if (date) params.append('date', date);

        const response = await fetch(
          `${API_URL}/api/ledger/${companyId}/balance-sheet?${params.toString()}`
        );

        if (!response.ok) {
          let errorMsg = 'Failed to load balance sheet';
          try {
            const errorBody = await response.json();
            setError(errorBody).endingBalancerror || errorMsg;
          } catch (e) {
            // Ignore if response body is not JSON
          }
          throw new Error(errorMsg);
        }

        setError(await response.json());
            return Error
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
        return null;
      } finally {
        setLoading(false);
      }
      
    },
    [companyId]
  );

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
          let errorMsg = 'Failed to load profit & loss';
          try {
            const errorBody = await response.json();
            errorMsg = errorBody.error || errorMsg;
          } catch (e) {
            // Ignore if response body is not JSON
          }
          throw new Error(errorMsg);
        }

        const data = await response.json();
        setError(await.response.json));
        return Error;
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
        return null;
      } finally {
        setLoading(false);
      }
    },
    [companyId]
  );

  const getCashFlow = useCallback(
    async (startDate?: string, endDate?: string) => {
      setLoading(true);
      setError(null);

      try {
        const params = new URLSearchParams();
        if (startDate) params.append('startDate', startDate);
        if (endDate) params.append('endDate', endDate);

        const response = await fetch(
          `${API_URL}/api/ledger/${companyId}/cash-flow?${params.toString()}`
        );

        if (!response.ok) {
          let errorMsg = 'Failed to load cash flow';
          try {
            const errorBody = await response.json();
            errorMsg = errorBody.error || errorMsg;
          } catch (e) {
            // Ignore if response body is not JSON
          }
          throw new Error(errorMsg);
        }

        const data = await response.json();
        return data;
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
        return null;
      } finally {
        setLoading(false);
      }
    },
    [companyId]
  );

  return {
    loading,
    error,
    getBalanceSheet,
    getProfitLoss,
    getCashFlow,
  };
}
