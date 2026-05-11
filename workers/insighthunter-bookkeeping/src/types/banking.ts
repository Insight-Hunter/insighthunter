// src/types/banking.ts
export interface BankConnection {
  id: string;
  userId: string;
  companyId: string;
  institutionId: string;
  institutionName: string;
  accountId: string;
  accountName: string;
  accountType: 'checking' | 'savings' | 'credit_card' | 'investment';
  accountMask: string;
  balance: number;
  currency: string;
  plaidItemId: string;
  plaidAccessToken: string;
  status: 'active' | 'disconnected' | 'error';
  lastSync: string;
  createdAt: string;
  updatedAt: string;
}

export interface BankTransaction {
  id: string;
  bankConnectionId: string;
  transactionId: string; // Plaid transaction ID
  date: string;
  name: string;
  merchantName?: string;
  amount: number;
  category: string[];
  pending: boolean;
  matched: boolean;
  matchedTransactionId?: string;
  createdAt: string;
}

export interface PlaidLinkToken {
  linkToken: string;
  expiration: string;
}
