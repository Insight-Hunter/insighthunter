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
export declare function isBalanced(entry: JournalEntry): boolean;
//# sourceMappingURL=index.d.ts.map