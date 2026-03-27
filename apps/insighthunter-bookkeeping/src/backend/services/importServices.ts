import type { CreateTransactionInput } from './transactionService';
import { toMinorUnits } from '../lib/currencyUtils';
import { logger } from '../lib/logger';

export interface ParseResult {
  transactions: CreateTransactionInput[];
  errors: string[];
  rowCount: number;
}

/** Parse a CSV with columns: date,description,amount,currency,external_id */
export function parseCSV(
  raw: string, orgId: string, accountId: string
): ParseResult {
  const lines  = raw.trim().split('\n');
  const header = lines[0].toLowerCase().split(',').map(h => h.trim());
  const col    = (name: string) => header.indexOf(name);

  const transactions: CreateTransactionInput[] = [];
  const errors: string[] = [];

  for (let i = 1; i < lines.length; i++) {
    const cells = lines[i].split(',').map(c => c.trim().replace(/^"|"$/g, ''));
    try {
      const rawAmount = parseFloat(cells[col('amount')]);
      if (isNaN(rawAmount)) { errors.push(`Row ${i + 1}: invalid amount`); continue; }

      const currency = cells[col('currency')] || 'USD';
      transactions.push({
        orgId,
        accountId,
        date:        cells[col('date')],
        description: cells[col('description')] || '',
        amountCents: toMinorUnits(Math.abs(rawAmount), currency),
        currency,
        externalId:  col('external_id') >= 0 ? cells[col('external_id')] || undefined : undefined,
        source:      'import',
      });
    } catch (err) {
      errors.push(`Row ${i + 1}: ${(err as Error).message}`);
    }
  }

  logger.info('csv_parsed', { orgId, rows: lines.length - 1, parsed: transactions.length, errors: errors.length });
  return { transactions, errors, rowCount: lines.length - 1 };
}

/** Parse OFX/QBO (simplified SGML-style bank export). */
export function parseOFX(raw: string, orgId: string, accountId: string): ParseResult {
  const transactions: CreateTransactionInput[] = [];
  const errors: string[] = [];
  const stmtTrns = raw.match(/<STMTTRN>([\s\S]*?)<\/STMTTRN>/g) ?? [];

  for (const block of stmtTrns) {
    try {
      const get = (tag: string) => block.match(new RegExp(`<${tag}>([^<]+)`))?.[1]?.trim() ?? '';
      const dtPosted = get('DTPOSTED').slice(0, 8);
      const date     = `${dtPosted.slice(0, 4)}-${dtPosted.slice(4, 6)}-${dtPosted.slice(6, 8)}`;
      const rawAmt   = parseFloat(get('TRNAMT'));
      if (isNaN(rawAmt)) { errors.push(`OFX: invalid TRNAMT`); continue; }

      transactions.push({
        orgId, accountId, date,
        description: get('MEMO') || get('NAME') || 'OFX Import',
        amountCents: toMinorUnits(Math.abs(rawAmt), 'USD'),
        currency:    'USD',
        externalId:  get('FITID') || undefined,
        source:      'import',
      });
    } catch (err) {
      errors.push(`OFX block: ${(err as Error).message}`);
    }
  }

  return { transactions, errors, rowCount: stmtTrns.length };
}
