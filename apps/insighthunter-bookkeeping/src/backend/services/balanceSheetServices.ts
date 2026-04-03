import type { D1Database } from '@cloudflare/workers-types';
import type { BalanceSheet, BalanceSheetLineItem } from '../types/statements';
import { AccountType, AccountSubType } from '../types/accounting';
import { getAccountBalances } from '../db/queries';
import { netBalance } from '../lib/doubleEntry';

const CURRENT_ASSET_SUBTYPES = new Set([AccountSubType.CASH, AccountSubType.ACCOUNTS_RECEIVABLE, AccountSubType.INVENTORY]);
const CURRENT_LIABILITY_SUBTYPES = new Set([AccountSubType.ACCOUNTS_PAYABLE, AccountSubType.CREDIT_CARD]);

export async function generateBalanceSheet(
  db: D1Database, orgId: string, asOf: string, currency = 'USD'
): Promise<BalanceSheet> {
  const balances = await getAccountBalances(db, orgId, undefined, asOf);

  const toItem = (b: typeof balances[0]): BalanceSheetLineItem => ({
    accountId:   b.accountId,
    accountCode: b.accountCode,
    accountName: b.accountName,
    balance:     Math.abs(netBalance(b.accountType as AccountType, b.totalDebit, b.totalCredit)),
  });

  const assets     = balances.filter(b => b.accountType === AccountType.ASSET);
  const liabilities = balances.filter(b => b.accountType === AccountType.LIABILITY);
  const equityRows  = balances.filter(b => b.accountType === AccountType.EQUITY);

  const currentAssets    = assets.filter(b => CURRENT_ASSET_SUBTYPES.has(b.accountSubType as AccountSubType)).map(toItem);
  const nonCurrentAssets = assets.filter(b => !CURRENT_ASSET_SUBTYPES.has(b.accountSubType as AccountSubType)).map(toItem);
  const currentLiabs     = liabilities.filter(b => CURRENT_LIABILITY_SUBTYPES.has(b.accountSubType as AccountSubType)).map(toItem);
  const nonCurrentLiabs  = liabilities.filter(b => !CURRENT_LIABILITY_SUBTYPES.has(b.accountSubType as AccountSubType)).map(toItem);
  const equityItems      = equityRows.map(toItem);

  const totalCurrentAssets    = currentAssets.reduce((s, i) => s + i.balance, 0);
  const totalNonCurrentAssets = nonCurrentAssets.reduce((s, i) => s + i.balance, 0);
  const totalAssets           = totalCurrentAssets + totalNonCurrentAssets;
  const totalCurrentLiabs     = currentLiabs.reduce((s, i) => s + i.balance, 0);
  const totalNonCurrentLiabs  = nonCurrentLiabs.reduce((s, i) => s + i.balance, 0);
  const totalLiabilities      = totalCurrentLiabs + totalNonCurrentLiabs;
  const totalEquity           = equityItems.reduce((s, i) => s + i.balance, 0);
  const totalLiabAndEquity    = totalLiabilities + totalEquity;

  return {
    orgId, asOf, currency,
    assets: {
      current: currentAssets, nonCurrent: nonCurrentAssets,
      totalCurrent: totalCurrentAssets, totalNonCurrent: totalNonCurrentAssets, total: totalAssets,
    },
    liabilities: {
      current: currentLiabs, nonCurrent: nonCurrentLiabs,
      totalCurrent: totalCurrentLiabs, totalNonCurrent: totalNonCurrentLiabs, total: totalLiabilities,
    },
    equity: { items: equityItems, retainedEarnings: 0, total: totalEquity },
    totalLiabilitiesAndEquity: totalLiabAndEquity,
    isBalanced: Math.abs(totalAssets - totalLiabAndEquity) < 2, // 1-cent rounding tolerance
    generatedAt: new Date().toISOString(),
  };
}
