import type { ParsedImportRow } from './csv-parser';

export type NormalizedBankRow = {
  sourceDate?: string;
  sourceDescription?: string;
  sourceAmount?: number;
  normalizedDate?: string;
  normalizedDescription?: string;
  normalizedAmount?: number;
  category?: string;
  confidence: number;
};

export function normalizeBankRow(row: ParsedImportRow): NormalizedBankRow {
  const desc = row.description?.trim() ?? '';
  const normalizedDescription = desc.replace(/\s+/g, ' ');
  const normalizedAmount = typeof row.amount === 'number' ? Math.abs(row.amount) : undefined;
  const category = inferCategory(normalizedDescription);

  return {
    sourceDate: row.date,
    sourceDescription: row.description,
    sourceAmount: row.amount,
    normalizedDate: row.date,
    normalizedDescription,
    normalizedAmount,
    category,
    confidence: category ? 0.72 : 0.4,
  };
}

function inferCategory(description: string): string {
  const text = description.toLowerCase();
  if (text.includes('uber') || text.includes('lyft')) return 'Transportation';
  if (text.includes('amazon') || text.includes('office depot')) return 'Office Supplies';
  if (text.includes('gusto') || text.includes('payroll')) return 'Payroll';
  if (text.includes('interest')) return 'Bank Fees';
  return 'Uncategorized';
}

