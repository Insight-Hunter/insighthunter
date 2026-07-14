export type AccountType = "ASSET" | "LIABILITY" | "EQUITY" | "REVENUE" | "EXPENSE";

export interface Money {
  amount: number;
  currency: string;
}

export interface Account {
  id: string;
  code: string;
  name: string;
  type: AccountType;
  archived: boolean;
}

export interface JournalLine {
  accountId: string;
  debit: number;
  credit: number;
  memo?: string;
}

export interface JournalEntry {
  id: string;
  organizationId: string;
  lines: JournalLine[];
  postedAt?: string;
}

/** Round to the nearest cent before comparing to avoid floating-point drift. */
function toCents(amount: number): number {
  return Math.round(amount * 100);
}

export function isBalanced(entry: JournalEntry): boolean {
  const debit = entry.lines.reduce((sum, line) => sum + toCents(line.debit), 0);
  const credit = entry.lines.reduce((sum, line) => sum + toCents(line.credit), 0);
  return debit === credit;
}
