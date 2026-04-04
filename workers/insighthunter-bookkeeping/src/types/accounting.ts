export enum AccountType {
    ASSET = 'ASSET',
    LIABILITY = 'LIABILITY',
    EQUITY = 'EQUITY',
    REVENUE = 'REVENUE',
    EXPENSE = 'EXPENSE',
  }
  
  export enum AccountSubType {
    CASH = 'CASH',
    ACCOUNTS_RECEIVABLE = 'ACCOUNTS_RECEIVABLE',
    INVENTORY = 'INVENTORY',
    FIXED_ASSET = 'FIXED_ASSET',
    OTHER_ASSET = 'OTHER_ASSET',
    ACCOUNTS_PAYABLE = 'ACCOUNTS_PAYABLE',
    CREDIT_CARD = 'CREDIT_CARD',
    LOAN = 'LOAN',
    OTHER_LIABILITY = 'OTHER_LIABILITY',
    OWNERS_EQUITY = 'OWNERS_EQUITY',
    RETAINED_EARNINGS = 'RETAINED_EARNINGS',
    OPERATING_REVENUE = 'OPERATING_REVENUE',
    OTHER_INCOME = 'OTHER_INCOME',
    COGS = 'COGS',
    OPERATING_EXPENSE = 'OPERATING_EXPENSE',
    OTHER_EXPENSE = 'OTHER_EXPENSE',
  }
  
  export enum TransactionStatus {
    PENDING = 'PENDING',
    POSTED = 'POSTED',
    VOID = 'VOID',
    RECONCILED = 'RECONCILED',
  }
  
  export enum ReconciliationStatus {
    UNRECONCILED = 'UNRECONCILED',
    MATCHED = 'MATCHED',
    UNMATCHED = 'UNMATCHED',
    MANUALLY_CLEARED = 'MANUALLY_CLEARED',
  }
  
  export interface Account {
    id: string;
    orgId: string;
    code: string;
    name: string;
    type: AccountType;
    subType: AccountSubType;
    parentId: string | null;
    currency: string;
    isActive: boolean;
    description: string | null;
    createdAt: string;
    updatedAt: string;
  }
  
  export interface Transaction {
    id: string;
    orgId: string;
    date: string;
    description: string;
    amount: number; // cents
    currency: string;
    status: TransactionStatus;
    categoryId: string | null;
    accountId: string;
    externalId: string | null;
    source: 'manual' | 'import' | 'api';
    metadata: Record<string, unknown> | null;
    createdAt: string;
    updatedAt: string;
  }
  
  export interface JournalEntry {
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
  
  export interface JournalLine {
    id: string;
    entryId: string;
    accountId: string;
    debit: number;  // cents; 0 if this leg is a credit
    credit: number; // cents; 0 if this leg is a debit
    memo: string | null;
    lineOrder: number;
  }
  
  export interface Category {
    id: string;
    orgId: string;
    name: string;
    accountId: string;
    parentId: string | null;
    color: string | null;
    isSystem: boolean;
    createdAt: string;
  }
  
  export interface CategoryRule {
    id: string;
    orgId: string;
    categoryId: string;
    pattern: string;
    field: 'description' | 'amount' | 'merchant';
    priority: number;
    isActive: boolean;
    createdAt: string;
  }
  
  export interface ReconciliationRecord {
    id: string;
    orgId: string;
    accountId: string;
    statementDate: string;
    statementBalance: number;
    clearedBalance: number;
    difference: number;
    status: ReconciliationStatus;
    reconciledAt: string | null;
    reconciledBy: string | null;
    createdAt: string;
  }
  