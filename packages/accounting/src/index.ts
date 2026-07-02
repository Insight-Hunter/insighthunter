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

export function isBalanced(entry: JournalEntry): boolean {
  const debit = entry.lines.reduce((sum, line) => sum + line.debit, 0);
  const credit = entry.lines.reduce((sum, line) => sum + line.credit, 0);
  return debit === credit;
}
