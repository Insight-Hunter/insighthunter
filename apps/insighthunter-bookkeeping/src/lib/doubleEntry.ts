import { AccountType } from '../types/accounting';
import type { JournalLine } from '../types/accounting';

export type NormalBalance = 'DEBIT' | 'CREDIT';

/** ASSET and EXPENSE accounts increase with debits; everything else with credits. */
export function normalBalance(type: AccountType): NormalBalance {
  return type === AccountType.ASSET || type === AccountType.EXPENSE ? 'DEBIT' : 'CREDIT';
}

/** Net balance of an account given its normal balance side. Result in cents. */
export function netBalance(type: AccountType, totalDebit: number, totalCredit: number): number {
  return normalBalance(type) === 'DEBIT'
    ? totalDebit - totalCredit
    : totalCredit - totalDebit;
}

/** Ensures sum(debits) === sum(credits) across all lines. */
export function validateBalance(lines: Pick<JournalLine, 'debit' | 'credit'>[]): boolean {
  const totalDebit  = lines.reduce((s, l) => s + l.debit,  0);
  const totalCredit = lines.reduce((s, l) => s + l.credit, 0);
  return totalDebit === totalCredit;
}

export class UnbalancedEntryError extends Error {
  constructor(debit: number, credit: number) {
    super(`Unbalanced journal entry: debits=${debit} credits=${credit} (cents)`);
    this.name = 'UnbalancedEntryError';
  }
}

export function assertBalanced(lines: Pick<JournalLine, 'debit' | 'credit'>[]): void {
  const totalDebit  = lines.reduce((s, l) => s + l.debit,  0);
  const totalCredit = lines.reduce((s, l) => s + l.credit, 0);
  if (totalDebit !== totalCredit) throw new UnbalancedEntryError(totalDebit, totalCredit);
}

/**
 * Build a simple two-line journal entry for a transaction.
 * debitAccountId increases (e.g., Expense), creditAccountId decreases (e.g., Cash).
 */
export function buildTwoLineEntry(
  entryId: string,
  debitAccountId: string,
  creditAccountId: string,
  amountCents: number,
  memo?: string,
): Pick<JournalLine, 'id' | 'entryId' | 'accountId' | 'debit' | 'credit' | 'memo' | 'lineOrder'>[] {
  return [
    { id: crypto.randomUUID(), entryId, accountId: debitAccountId,  debit: amountCents, credit: 0, memo: memo ?? null, lineOrder: 0 },
    { id: crypto.randomUUID(), entryId, accountId: creditAccountId, debit: 0, credit: amountCents, memo: memo ?? null, lineOrder: 1 },
  ];
}
