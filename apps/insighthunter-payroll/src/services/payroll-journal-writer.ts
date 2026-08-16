// services/payroll-journal-writer.ts
// Writes a double-entry payroll journal entry on run approval.
// Dr Payroll Expense (full gross) / Cr Cash (net pay) + Cr Payroll Liabilities (taxes + deductions)

export async function writePayrollJournalEntry(opts: {
  db: D1Database;
  orgId: string;
  grossPay: number;
  netPay: number;
  taxes: number; // grossPay - netPay = total withholdings
  memo: string;
  postedAt: string;
}): Promise<void> {
  const { db, orgId, grossPay, netPay, taxes, memo, postedAt } = opts;

  // Resolve accounts
  const expenseAccount = await db
    .prepare(
      `SELECT id FROM accounts WHERE organization_id = ?1 AND type = 'EXPENSE'
     AND (LOWER(name) LIKE '%payroll%' OR LOWER(name) LIKE '%salary%' OR LOWER(name) LIKE '%wages%')
     AND archived = 0 LIMIT 1`,
    )
    .bind(orgId)
    .first<{ id: string }>();

  const cashAccount = await db
    .prepare(
      `SELECT id FROM accounts WHERE organization_id = ?1 AND type = 'ASSET'
     AND code LIKE '1%' AND archived = 0 LIMIT 1`,
    )
    .bind(orgId)
    .first<{ id: string }>();

  const liabilityAccount = await db
    .prepare(
      `SELECT id FROM accounts WHERE organization_id = ?1 AND type = 'LIABILITY'
     AND (LOWER(name) LIKE '%payroll%' OR LOWER(name) LIKE '%tax%' OR LOWER(name) LIKE '%withhold%')
     AND archived = 0 LIMIT 1`,
    )
    .bind(orgId)
    .first<{ id: string }>();

  if (!expenseAccount || !cashAccount) {
    console.warn(
      "[payroll-journal] Required accounts not found for org",
      orgId,
      "— skipping journal entry",
    );
    return;
  }

  const jeId = crypto.randomUUID();

  const stmts = [
    db
      .prepare(`INSERT INTO journal_entries (id, organization_id, memo, posted_at, created_at)
      VALUES (?1,?2,?3,?4,datetime('now'))`)
      .bind(jeId, orgId, memo, postedAt),

    // Dr Payroll Expense (gross)
    db
      .prepare(`INSERT INTO journal_lines (id, journal_entry_id, account_id, debit, credit, memo)
      VALUES (?1,?2,?3,?4,0,?5)`)
      .bind(crypto.randomUUID(), jeId, expenseAccount.id, grossPay, memo),

    // Cr Cash (net pay disbursed)
    db
      .prepare(`INSERT INTO journal_lines (id, journal_entry_id, account_id, debit, credit, memo)
      VALUES (?1,?2,?3,0,?4,?5)`)
      .bind(crypto.randomUUID(), jeId, cashAccount.id, netPay, memo),
  ];

  // Cr Payroll Liabilities (taxes withheld), if account exists
  if (liabilityAccount && taxes > 0) {
    stmts.push(
      db
        .prepare(`INSERT INTO journal_lines (id, journal_entry_id, account_id, debit, credit, memo)
        VALUES (?1,?2,?3,0,?4,?5)`)
        .bind(crypto.randomUUID(), jeId, liabilityAccount.id, taxes, memo),
    );
  }

  await db.batch(stmts);
}
