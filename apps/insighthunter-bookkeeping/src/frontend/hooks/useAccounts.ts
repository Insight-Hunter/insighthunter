import { useQuery } from "@tanstack/react-query";
import { useApiBase } from "./useApi";

export interface Account {
  id: string;
  name: string;
  code: string;
  type: string;
  subtype: string;
  balance: number;
}

export function useAccounts() {
  const { apiFetch } = useApiBase();
  const query = useQuery<Account[]>({
    queryKey: ["accounts"],
    queryFn: () => apiFetch<Account[]>("/accounts"),
  });
  return query;
}
