import type { D1Database } from "@cloudflare/workers-types";
import type { JournalEntry, JournalEntryLine } from "../types.js";
import { validateDoubleEntry } from "../utils/doubleEntry.js";

export async function createJournalEntry(
  orgId: string,
  input: {
    date: string;
    memo: string;
    reference?: string;
    type: string;
    createdBy: string;
    lines: Array<{
      accountId: string;
      debit: number;
      credit: number;
      description?: string;
    }>;
  },
  db: D1Database
): Promise<JournalEntry> {
  const validation = validateDoubleEntry(input.lines);
  if (!validation.valid) {
    throw new Error(`Journal entry not balanced: ${validation.error}`);
  }

  const jeId = crypto.randomUUID();
  const now = new Date().toISOString();

  const stmts = [
    db
      .prepare(
        `INSERT INTO journal_entries (id,org_id,date,memo,reference,type,status,created_by,created_at,updated_at)
         VALUES (?,?,?,?,?,?,  'posted',?,?,?)`
      )
      .bind(
        jeId,
        orgId,
        input.date,
        input.memo,
        input.reference ?? null,
        input.type,
        input.createdBy,
        now,
        now
      ),
    ...input.lines.map((line) =>
      db
        .prepare(
          `INSERT INTO journal_entry_lines (id,journal_entry_id,account_id,debit,credit,description,created_at)
           VALUES (?,?,?,?,?,?,?)`
        )
        .bind(
          crypto.randomUUID(),
          jeId,
          line.accountId,
          line.debit,
          line.credit,
          line.description ?? null,
          now
        )
    ),
  ];

  await db.batch(stmts);

  const je = (await db
    .prepare("SELECT * FROM journal_entries WHERE id=?")
    .bind(jeId)
    .first()) as JournalEntry;
  const lines = (
    await db
      .prepare(
        `SELECT jel.*, a.name as account_name FROM journal_entry_lines jel
         LEFT JOIN accounts a ON jel.account_id = a.id
         WHERE jel.journal_entry_id=?`
      )
      .bind(jeId)
      .all()
  ).results as JournalEntryLine[];

  return { ...je, lines };
}
