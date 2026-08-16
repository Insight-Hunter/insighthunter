// services/number-sequence.ts
// Generates sequential invoice numbers per org: INV-0001, INV-0002, ...
// Uses D1 to track the last used sequence number atomically.

export async function nextInvoiceNumber(db: D1Database, orgId: string): Promise<string> {
  // Upsert sequence row and return incremented value
  await db
    .prepare(`
    INSERT INTO invoice_sequences (org_id, last_number)
    VALUES (?1, 1)
    ON CONFLICT(org_id) DO UPDATE SET last_number = last_number + 1
  `)
    .bind(orgId)
    .run();

  const row = await db
    .prepare(`SELECT last_number FROM invoice_sequences WHERE org_id = ?1`)
    .bind(orgId)
    .first<{ last_number: number }>();

  const n = row?.last_number ?? 1;
  return `INV-${String(n).padStart(4, "0")}`;
}
