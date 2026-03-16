import type { Transaction } from '../types/accounting';
import type { PLStatement, BalanceSheet, CashFlowStatement } from '../types/statements';
import { fromMinorUnits, formatCurrency } from '../lib/currencyUtils';

export function transactionsToCSV(transactions: Transaction[]): string {
  const header = 'id,date,description,amount,currency,status,category_id,account_id,source,created_at';
  const rows = transactions.map(t =>
    [t.id, t.date, `"${t.description.replace(/"/g, '""')}"`,
     fromMinorUnits(t.amount, t.currency), t.currency, t.status,
     t.categoryId ?? '', t.accountId, t.source, t.createdAt].join(',')
  );
  return [header, ...rows].join('\n');
}

export function plToCSV(pl: PLStatement): string {
  const lines: string[] = [
    'section,account_code,account_name,amount_cents,amount_formatted',
    ...pl.revenue.map(i => `Revenue,${i.accountCode},${i.accountName},${i.amount},${formatCurrency(i.amount, pl.currency)}`),
    `,,Total Revenue,${pl.totalRevenue},${formatCurrency(pl.totalRevenue, pl.currency)}`,
    ...pl.cogs.map(i => `COGS,${i.accountCode},${i.accountName},${i.amount},${formatCurrency(i.amount, pl.currency)}`),
    `,,Gross Profit,${pl.grossProfit},${formatCurrency(pl.grossProfit, pl.currency)}`,
    ...pl.expenses.map(i => `Expense,${i.accountCode},${i.accountName},${i.amount},${formatCurrency(i.amount, pl.currency)}`),
    `,,Net Income,${pl.netIncome},${formatCurrency(pl.netIncome, pl.currency)}`,
  ];
  return lines.join('\n');
}

export function plToHTML(pl: PLStatement): string {
  const fmt = (n: number) => formatCurrency(n, pl.currency);
  return `<!DOCTYPE html><html><head><meta charset="utf-8">
    <style>body{font-family:sans-serif;padding:2rem}table{border-collapse:collapse;width:100%}
    td,th{border:1px solid #ddd;padding:8px}th{background:#f5f5f5}.total{font-weight:bold}</style></head>
  <body>
    <h1>Profit & Loss</h1>
    <p>${pl.orgId} | ${pl.periodStart} – ${pl.periodEnd}</p>
    <table>
      <tr><th>Account</th><th>Amount</th></tr>
      <tr><td colspan="2"><strong>Revenue</strong></td></tr>
      ${pl.revenue.map(i => `<tr><td>${i.accountCode} ${i.accountName}</td><td>${fmt(i.amount)}</td></tr>`).join('')}
      <tr class="total"><td>Total Revenue</td><td>${fmt(pl.totalRevenue)}</td></tr>
      <tr class="total"><td>Gross Profit (${pl.grossMarginPct.toFixed(1)}%)</td><td>${fmt(pl.grossProfit)}</td></tr>
      <tr><td colspan="2"><strong>Expenses</strong></td></tr>
      ${pl.expenses.map(i => `<tr><td>${i.accountCode} ${i.accountName}</td><td>${fmt(i.amount)}</td></tr>`).join('')}
      <tr class="total"><td>Net Income (${pl.netMarginPct.toFixed(1)}%)</td><td>${fmt(pl.netIncome)}</td></tr>
    </table>
    <p>Generated: ${pl.generatedAt}</p>
  </body></html>`;
}
