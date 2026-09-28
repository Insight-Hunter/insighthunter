import type { BookkeepingSummary, ProfitLossReport } from "./types";

export function buildProfitLoss(summary: BookkeepingSummary): ProfitLossReport {
  const income = summary.byCategory
    .filter((c) => c.kind === "income" && c.category)
    .map((c) => ({ category: c.category as string, totalCents: c.total_cents, count: c.count }));

  const expenses = summary.byCategory
    .filter((c) => c.kind === "expense" && c.category)
    .map((c) => ({ category: c.category as string, totalCents: Math.abs(c.total_cents), count: c.count }));

  return {
    type: "profit_loss",
    periodStart: summary.periodStart,
    periodEnd: summary.periodEnd,
    income,
    expenses,
    totalIncomeCents: summary.incomeCents,
    totalExpenseCents: Math.abs(summary.expenseCents),
    netIncomeCents: summary.netCents,
  };
}

export function profitLossToCsv(report: ProfitLossReport): string {
  const rows: string[] = ["Section,Category,Amount,Transaction Count"];
  for (const row of report.income) {
    rows.push(`Income,${escapeCsv(row.category)},${(row.totalCents / 100).toFixed(2)},${row.count}`);
  }
  rows.push(`Income,Total Income,${(report.totalIncomeCents / 100).toFixed(2)},`);
  for (const row of report.expenses) {
    rows.push(`Expense,${escapeCsv(row.category)},${(row.totalCents / 100).toFixed(2)},${row.count}`);
  }
  rows.push(`Expense,Total Expenses,${(report.totalExpenseCents / 100).toFixed(2)},`);
  rows.push(`Net,Net Income,${(report.netIncomeCents / 100).toFixed(2)},`);
  return rows.join("\n");
}

function escapeCsv(value: string): string {
  if (value.includes(",") || value.includes('"')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}
