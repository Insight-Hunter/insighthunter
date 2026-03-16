import type { D1Database } from '@cloudflare/workers-types';
import type { PLStatement, PLLineItem } from '../types/statements';
import { AccountType, AccountSubType } from '../types/accounting';
import { getAccountBalances } from '../db/queries';
import { netBalance } from '../lib/doubleEntry';

export async function generatePL(
  db: D1Database,
  orgId: string,
  periodStart: string,
  periodEnd: string,
  currency = 'USD',
): Promise<PLStatement> {
  const balances = await getAccountBalances(db, orgId, periodStart, periodEnd);

  const toLineItem = (b: typeof balances[0]): PLLineItem => ({
    accountId:   b.accountId,
    accountCode: b.accountCode,
    accountName: b.accountName,
    amount:      netBalance(b.accountType as AccountType, b.totalDebit, b.totalCredit),
  });

  const revenue       = balances.filter(b => b.accountType === AccountType.REVENUE && b.accountSubType !== AccountSubType.OTHER_INCOME).map(toLineItem);
  const otherIncome   = balances.filter(b => b.accountSubType === AccountSubType.OTHER_INCOME).map(toLineItem);
  const cogs          = balances.filter(b => b.accountSubType === AccountSubType.COGS).map(toLineItem);
  const expenses      = balances.filter(b => b.accountType === AccountType.EXPENSE && b.accountSubType !== AccountSubType.COGS && b.accountSubType !== AccountSubType.OTHER_EXPENSE).map(toLineItem);
  const otherExpenses = balances.filter(b => b.accountSubType === AccountSubType.OTHER_EXPENSE).map(toLineItem);

  const totalRevenue   = revenue.reduce((s, i) => s + i.amount, 0);
  const totalCogs      = cogs.reduce((s, i) => s + i.amount, 0);
  const grossProfit    = totalRevenue - totalCogs;
  const totalExpenses  = expenses.reduce((s, i) => s + i.amount, 0);
  const operatingIncome = grossProfit - totalExpenses;
  const netIncome      = operatingIncome
    + otherIncome.reduce((s, i) => s + i.amount, 0)
    - otherExpenses.reduce((s, i) => s + i.amount, 0);

  return {
    orgId, periodStart, periodEnd, currency,
    revenue, totalRevenue,
    cogs, totalCogs,
    grossProfit,
    grossMarginPct: totalRevenue ? (grossProfit / totalRevenue) * 100 : 0,
    expenses, totalExpenses,
    operatingIncome,
    otherIncome, otherExpenses,
    netIncome,
    netMarginPct: totalRevenue ? (netIncome / totalRevenue) * 100 : 0,
    generatedAt: new Date().toISOString(),
  };
}
