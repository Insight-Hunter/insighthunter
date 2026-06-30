import type { CurrencyCode, UUID } from './common.js';

export enum AccountType {
  Asset = 'asset',
  Liability = 'liability',
  Equity = 'equity',
  Revenue = 'revenue',
  Expense = 'expense',
}

export interface Account {
  id: UUID;
  number: string;
  name: string;
  type: AccountType;
  active: boolean;
}

export interface MoneyAmount {
  amount: number;
  currency: CurrencyCode;
}
