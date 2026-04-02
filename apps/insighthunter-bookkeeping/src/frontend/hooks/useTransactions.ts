import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useApiBase } from "./useApi";

export interface Transaction {
  id: string;
  date: string;
  description: string;
  amount: number;
  status: string;
  account_id: string | null;
  confidence: number | null;
  ai_reasoning: string | null;
  source: string;
}

export function useTransactions(status?: string) {
  const { apiFetch } = useApiBase();
  const query = useQuery<Transaction[]>({
    queryKey: ["transactions", status],
    queryFn: () =>
      apiFetch<Transaction[]>(
        `/transactions${status ? `?status=${status}` : ""}`
      ),
  });
  return query;
}

export function useCreateTransaction() {
  const { apiFetch } = useApiBase();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: {
      date: string;
      description: string;
      amount: number;
      source?: string;
    }) =>
      apiFetch<{ id: string }>("/transactions", {
        method: "POST",
        body: JSON.stringify(input),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["transactions"] });
    },
  });
}
