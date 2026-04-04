import type { D1Database } from '@cloudflare/workers-types';
import type { CashFlowStatement, CashFlowLineItem } from '../types/statements';
import { AccountType, AccountSubType } from '../types/accounting';
import { getAccountBalances } from '../db/queries';
import { netBalance } from '../lib/doubleEntry';

export async function generateCashFlow(
  db: D1Database, orgId: string, periodStart: string, periodEnd: string, currency = 'USD'
): Promise<CashFlowStatement> {
  const balances = await getAccountBalances(db, orgId, periodStart, periodEnd);

  const get = (subType: AccountSubType, type: AccountType) =>
    balances.find(b => b.accountSubType === subType && b.accountType === type);

  const cash        = get(AccountSubType.CASH, AccountType.ASSET);
  const ar          = get(AccountSubType.ACCOUNTS_RECEIVABLE, AccountType.ASSET);
  const ap          = get(AccountSubType.ACCOUNTS_PAYABLE, AccountType.LIABILITY);
  const revenue     = balances.filter(b => b.accountType === AccountType.REVENUE);
  const expenses    = balances.filter(b => b.accountType === AccountType.EXPENSE);
  const fixedAssets = get(AccountSubType.FIXED_ASSET, AccountType.ASSET);
  const loans       = get(AccountSubType.LOAN, AccountType.LIABILITY);

  const totalRevenue  = revenue.reduce((s, b) => s + netBalance(AccountType.REVENUE, b.totalDebit, b.totalCredit), 0);
  const totalExpenses = expenses.reduce((s, b) => s + netBalance(AccountType.EXPENSE, b.totalDebit, b.totalCredit), 0);
  const arChange      = ar    ? -netBalance(AccountType.ASSET,     ar.totalDebit,    ar.totalCredit)    : 0;
  const apChange      = ap    ?  netBalance(AccountType.LIABILITY, ap.totalDebit,    ap.totalCredit)    : 0;

  const operatingItems: CashFlowLineItem[] = [
    { label: 'Net Income',                     amount: totalRevenue - totalExpenses },
    { label: 'Change in Accounts Receivable',  amount: arChange },
    { label: 'Change in Accounts Payable',     amount: apChange },
  ];
  const operatingNet = operatingItems.reduce((s, i) => s + i.amount, 0);

  const investingItems: CashFlowLineItem[] = fixedAssets
    ? [{ label: 'Capital Expenditures', accountId: fixedAssets.accountId, amount: -netBalance(AccountType.ASSET, fixedAssets.totalDebit, fixedAssets.totalCredit) }]
    : [];
  const investingNet = investingItems.reduce((s, i) => s + i.amount, 0);

  const financingItems: CashFlowLineItem[] = loans
    ? [{ label: 'Net Borrowings', accountId: loans.accountId, amount: netBalance(AccountType.LIABILITY, loans.totalDebit, loans.totalCredit) }]
    : [];
  const financingNet = financingItems.reduce((s, i) => s + i.amount, 0);

  const netChange     = operatingNet + investingNet + financingNet;
  const beginningCash = cash ? netBalance(AccountType.ASSET, cash.totalDebit, cash.totalCredit) - netChange : 0;

  return {
    orgId, periodStart, periodEnd, currency,
    operating:       { items: operatingItems,  netCash: operatingNet },
    investing:       { items: investingItems,  netCash: investingNet },
    financing:       { items: financingItems,  netCash: financingNet },
    netChangeInCash: netChange,
    beginningCash,
    endingCash: beginningCash + netChange,
    generatedAt: new Date().toISOString(),
  };
}
