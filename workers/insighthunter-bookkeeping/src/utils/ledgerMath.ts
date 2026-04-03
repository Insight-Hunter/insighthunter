// src/utils/ledgerMath.ts

/**
 * Accounting utilities for double-entry bookkeeping
 */

export type AccountType =
  | 'asset'
  | 'liability'
  | 'equity'
  | 'revenue'
  | 'expense'
  | 'cost-of-goods-sold';

export type EntryType = 'debit' | 'credit';

/**
 * Determines the normal balance for an account type
 * Assets, Expenses, and COGS have debit balances
 * Liabilities, Equity, and Revenue have credit balances
 */
export function getNormalBalance(accountType: AccountType): EntryType {
  switch (accountType) {
    case 'asset':
    case 'expense':
    case 'cost-of-goods-sold':
      return 'debit';
    case 'liability':
    case 'equity':
    case 'revenue':
      return 'credit';
  }
}

/**
 * Calculates the new balance after applying an entry
 */
export function calculateBalance(
  currentBalance: number,
  entryType: EntryType,
  amount: number,
  accountType: AccountType
): number {
  const normalBalance = getNormalBalance(accountType);

  if (entryType === normalBalance) {
    // Increase balance
    return currentBalance + amount;
  } else {
    // Decrease balance
    return currentBalance - amount;
  }
}

/**
 * Validates that debits equal credits in a transaction
 */
export function validateTransaction(entries: {
  type: EntryType;
  amount: number;
}[]): {
  isValid: boolean;
  debitTotal: number;
  creditTotal: number;
  difference: number;
} {
  const debitTotal = entries
    .filter((e) => e.type === 'debit')
    .reduce((sum, e) => sum + e.amount, 0);

  const creditTotal = entries
    .filter((e) => e.type === 'credit')
    .reduce((sum, e) => sum + e.amount, 0);

  const difference = debitTotal - creditTotal;

  // Allow for small floating-point errors (0.01)
  const isValid = Math.abs(difference) < 0.01;

  return {
    isValid,
    debitTotal,
    creditTotal,
    difference,
  };
}

/**
 * Formats a currency value
 */
export function formatCurrency(
  amount: number,
  options?: {
    currency?: string;
    showSign?: boolean;
    parenthesesForNegative?: boolean;
  }
): string {
  const {
    currency = 'USD',
    showSign = false,
    parenthesesForNegative = false,
  } = options || {};

  const isNegative = amount < 0;
  const absAmount = Math.abs(amount);

  const formatted = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(absAmount);

  if (isNegative && parenthesesForNegative) {
    return `(${formatted})`;
  }

  if (isNegative) {
    return `-${formatted}`;
  }

  if (showSign && amount > 0) {
    return `+${formatted}`;
  }

  return formatted;
}

/**
 * Parses a currency string to a number
 */
export function parseCurrency(value: string): number {
  // Remove currency symbols, commas, and parentheses
  const cleaned = value.replace(/[$,()]/g, '').trim();

  // Check if it was in parentheses (negative)
  const isNegative = value.includes('(') && value.includes(')');

  const num = parseFloat(cleaned);

  if (isNaN(num)) {
    return 0;
  }

  return isNegative ? -num : num;
}

/**
 * Calculates the accounting equation: Assets = Liabilities + Equity
 */
export function verifyAccountingEquation(balanceSheet: {
  assets: { total: number };
  liabilities: { total: number };
  equity: { total: number };
}): {
  isBalanced: boolean;
  leftSide: number;
  rightSide: number;
  difference: number;
} {
  const leftSide = balanceSheet.assets.total;
  const rightSide = balanceSheet.liabilities.total + balanceSheet.equity.total;
  const difference = leftSide - rightSide;

  return {
    isBalanced: Math.abs(difference) < 0.01,
    leftSide,
    rightSide,
    difference,
  };
}

/**
 * Calculates financial ratios
 */
export function calculateRatios(
  balanceSheet: {
    assets: { currentAssets: { amount: number }[]; total: number };
    liabilities: { currentLiabilities: { amount: number }[]; total: number };
    equity: { total: number };
  },
  profitLoss: {
    totalRevenue: number;
    netIncome: number;
  }
) {
  const currentAssets = balanceSheet.assets.currentAssets.reduce(
    (sum, item) => sum + item.amount,
    0
  );

  const currentLiabilities = balanceSheet.liabilities.currentLiabilities.reduce(
    (sum, item) => sum + item.amount,
    0
  );

  // Current Ratio = Current Assets / Current Liabilities
  const currentRatio =
    currentLiabilities > 0 ? currentAssets / currentLiabilities : 0;

  // Debt-to-Equity Ratio = Total Liabilities / Total Equity
  const debtToEquityRatio =
    balanceSheet.equity.total > 0
      ? balanceSheet.liabilities.total / balanceSheet.equity.total
      : 0;

  // Return on Assets (ROA) = Net Income / Total Assets
  const returnOnAssets =
    balanceSheet.assets.total > 0
      ? profitLoss.netIncome / balanceSheet.assets.total
      : 0;

  // Return on Equity (ROE) = Net Income / Total Equity
  const returnOnEquity =
    balanceSheet.equity.total > 0
      ? profitLoss.netIncome / balanceSheet.equity.total
      : 0;

  // Profit Margin = Net Income / Revenue
  const profitMargin =
    profitLoss.totalRevenue > 0
      ? profitLoss.netIncome / profitLoss.totalRevenue
      : 0;

  return {
    currentRatio: currentRatio.toFixed(2),
    debtToEquityRatio: debtToEquityRatio.toFixed(2),
    returnOnAssets: (returnOnAssets * 100).toFixed(2) + '%',
    returnOnEquity: (returnOnEquity * 100).toFixed(2) + '%',
    profitMargin: (profitMargin * 100).toFixed(2) + '%',
  };
}

/**
 * Rounds to two decimal places (for currency)
 */
export function roundCurrency(value: number): number {
  return Math.round(value * 100) / 100;
}

/**
 * Checks if two currency values are equal (accounting for floating point)
 */
export function currencyEquals(a: number, b: number, tolerance = 0.01): boolean {
  return Math.abs(a - b) < tolerance;
}

/**
 * Calculates percentage change between two values
 */
export function percentageChange(oldValue: number, newValue: number): number {
  if (oldValue === 0) return newValue === 0 ? 0 : 100;
  return ((newValue - oldValue) / Math.abs(oldValue)) * 100;
}

/**
 * Formats a percentage
 */
export function formatPercentage(
  value: number,
  options?: { decimals?: number; showSign?: boolean }
): string {
  const { decimals = 1, showSign = false } = options || {};
  const formatted = value.toFixed(decimals);

  if (showSign && value > 0) {
    return `+${formatted}%`;
  }

  return `${formatted}%`;
}

/**
 * Calculates depreciation using straight-line method
 */
export function calculateStraightLineDepreciation(
  cost: number,
  salvageValue: number,
  usefulLife: number
): {
  annualDepreciation: number;
  monthlyDepreciation: number;
  depreciationRate: number;
} {
  const annualDepreciation = (cost - salvageValue) / usefulLife;
  const monthlyDepreciation = annualDepreciation / 12;
  const depreciationRate = annualDepreciation / cost;

  return {
    annualDepreciation: roundCurrency(annualDepreciation),
    monthlyDepreciation: roundCurrency(monthlyDepreciation),
    depreciationRate: roundCurrency(depreciationRate),
  };
}

/**
 * Common journal entry templates
 */
export const journalTemplates = {
  cashSale: (amount: number) => [
    { accountName: 'Cash', type: 'debit' as const, amount },
    { accountName: 'Sales Revenue', type: 'credit' as const, amount },
  ],

  creditSale: (amount: number) => [
    { accountName: 'Accounts Receivable', type: 'debit' as const, amount },
    { accountName: 'Sales Revenue', type: 'credit' as const, amount },
  ],

  cashPurchase: (amount: number) => [
    { accountName: 'Inventory', type: 'debit' as const, amount },
    { accountName: 'Cash', type: 'credit' as const, amount },
  ],

  creditPurchase: (amount: number) => [
    { accountName: 'Inventory', type: 'debit' as const, amount },
    { accountName: 'Accounts Payable', type: 'credit' as const, amount },
  ],

  payExpense: (amount: number, expenseAccount: string) => [
    { accountName: expenseAccount, type: 'debit' as const, amount },
    { accountName: 'Cash', type: 'credit' as const, amount },
  ],

  receivePayment: (amount: number) => [
    { accountName: 'Cash', type: 'debit' as const, amount },
    { accountName: 'Accounts Receivable', type: 'credit' as const, amount },
  ],

  makePayment: (amount: number) => [
    { accountName: 'Accounts Payable', type: 'debit' as const, amount },
    { accountName: 'Cash', type: 'credit' as const, amount },
  ],

  depreciation: (amount: number) => [
    { accountName: 'Depreciation Expense', type: 'debit' as const, amount },
    {
      accountName: 'Accumulated Depreciation',
      type: 'credit' as const,
      amount,
    },
  ],

  accrueExpense: (amount: number, expenseAccount: string) => [
    { accountName: expenseAccount, type: 'debit' as const, amount },
    { accountName: 'Accrued Expenses', type: 'credit' as const, amount },
  ],

  deferRevenue: (amount: number) => [
    { accountName: 'Cash', type: 'debit' as const, amount },
    { accountName: 'Deferred Revenue', type: 'credit' as const, amount },
  ],
};
