// services/journal-writer.ts
// Writes a double-entry revenue journal entry to the shared D1 ledger
// when an invoice is marked paid. Looks up the org's default AR and Revenue accounts.

export async function writeRevenueJournalEntry(opts: {
  db: D1Database;
  orgId: string;
  amount: number;
  memo: string;
  postedAt: string;
}): Promise<void> {
  const { db, orgId, amount, memo, postedAt } = opts;

  // Resolve accounts: AR (ASSET) and Revenue (REVENUE)
  const arAccount = await db.prepare(
    `SELECT id FROM accounts WHERE organization_id = ?1 AND type = 'ASSET'
     AND (LOWER(name) LIKE '%receivable%' OR code LIKE '12%')
     AND archived = 0 LIMIT 1`
  ).bind(orgId).first<{ id: string }>();

  const revenueAccount = await db.prepare(
    `SELECT id FROM accounts WHERE organization_id = ?1 AND type = 'REVENUE'
     AND archived = 0 LIMIT 1`
  ).bind(orgId).first<{ id: string }>();

  // Gracefully skip if accounts not yet seeded
  if (!arAccount || !revenueAccount) {
    console.warn('[journal-writer] AR or Revenue account not found for org', orgId, '— skipping journal entry');
    return;
  }

  const jeId = crypto.randomUUID();

  await db.batch([
    db.prepare(`
      INSERT INTO journal_entries (id, organization_id, memo, posted_at, created_at)
      VALUES (?1, ?2, ?3, ?4, datetime('now'))
    `).bind(jeId, orgId, memo, postedAt),

    // Debit: Accounts Receivable (asset increases)
    db.prepare(`
      INSERT INTO journal_lines (id, journal_entry_id, account_id, debit, credit, memo)
      VALUES (?1, ?2, ?3, ?4, 0, ?5)
    `).bind(crypto.randomUUID(), jeId, arAccount.id, amount, memo),

    // Credit: Revenue
    db.prepare(`
      INSERT INTO journal_lines (id, journal_entry_id, account_id, debit, credit, memo)
      VALUES (?1, ?2, ?3, 0, ?4, ?5)
    `).bind(crypto.randomUUID(), jeId, revenueAccount.id, amount, memo),
  ]);
}
