// apps/insighthunter-bills/src/services/bill-journal-writer.ts
export async function writeBillJournalEntry(opts: {
  db: D1Database;
  orgId: string;
  billId: string;
  totalAmount: number;
  memo: string;
  postedAt: string;
}): Promise<void> {
  const { db, orgId, totalAmount, memo, postedAt } = opts;

  const expenseAccount = await db.prepare(`
    SELECT id FROM accounts
    WHERE organization_id = ?1 AND archived = 0
      AND type IN ('EXPENSE', 'ASSET')
    ORDER BY CASE WHEN type = 'EXPENSE' THEN 0 ELSE 1 END, code ASC
    LIMIT 1
  `).bind(orgId).first<{ id: string }>();

  const apAccount = await db.prepare(`
    SELECT id FROM accounts
    WHERE organization_id = ?1 AND type = 'LIABILITY'
      AND (LOWER(name) LIKE '%accounts payable%' OR LOWER(name) LIKE '%ap%')
      AND archived = 0
    LIMIT 1
  `).bind(orgId).first<{ id: string }>();

  if (!expenseAccount || !apAccount) return;

  const jeId = crypto.randomUUID();
  await db.batch([
    db.prepare(`
      INSERT INTO journal_entries (id, organization_id, memo, posted_at, created_at)
      VALUES (?1, ?2, ?3, ?4, datetime('now'))
    `).bind(jeId, orgId, memo, postedAt),

    db.prepare(`
      INSERT INTO journal_lines (id, journal_entry_id, account_id, debit, credit, memo)
      VALUES (?1, ?2, ?3, ?4, 0, ?5)
    `).bind(crypto.randomUUID(), jeId, expenseAccount.id, totalAmount, memo),

    db.prepare(`
      INSERT INTO journal_lines (id, journal_entry_id, account_id, debit, credit, memo)
      VALUES (?1, ?2, ?3, 0, ?4, ?5)
    `).bind(crypto.randomUUID(), jeId, apAccount.id, totalAmount, memo),
  ]);
}

export async function writeBillPaymentJournalEntry(opts: {
  db: D1Database;
  orgId: string;
  billId: string;
  amount: number;
  memo: string;
  postedAt: string;
}): Promise<void> {
  const { db, orgId, amount, memo, postedAt } = opts;

  const apAccount = await db.prepare(`
    SELECT id FROM accounts
    WHERE organization_id = ?1 AND type = 'LIABILITY'
      AND (LOWER(name) LIKE '%accounts payable%' OR LOWER(name) LIKE '%ap%')
      AND archived = 0
    LIMIT 1
  `).bind(orgId).first<{ id: string }>();

  const cashAccount = await db.prepare(`
    SELECT id FROM accounts
    WHERE organization_id = ?1 AND type = 'ASSET'
      AND code LIKE '1%'
      AND archived = 0
    ORDER BY code ASC
    LIMIT 1
  `).bind(orgId).first<{ id: string }>();

  if (!apAccount || !cashAccount) return;

  const jeId = crypto.randomUUID();
  await db.batch([
    db.prepare(`
      INSERT INTO journal_entries (id, organization_id, memo, posted_at, created_at)
      VALUES (?1, ?2, ?3, ?4, datetime('now'))
    `).bind(jeId, orgId, memo, postedAt),

    db.prepare(`
      INSERT INTO journal_lines (id, journal_entry_id, account_id, debit, credit, memo)
      VALUES (?1, ?2, ?3, ?4, 0, ?5)
    `).bind(crypto.randomUUID(), jeId, apAccount.id, amount, memo),

    db.prepare(`
      INSERT INTO journal_lines (id, journal_entry_id, account_id, debit, credit, memo)
      VALUES (?1, ?2, ?3, 0, ?4, ?5)
    `).bind(crypto.randomUUID(), jeId, cashAccount.id, amount, memo),
  ]);
}
