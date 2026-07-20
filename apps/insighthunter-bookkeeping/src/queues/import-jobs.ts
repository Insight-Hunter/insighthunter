import type { Env } from '../index';
import { parseCsv } from '../services/csv-parser';
import { normalizeBankRow } from '../services/bank-statement-normalizer';

export async function handleImportJob(message: Message<any>, env: Env, ctx: ExecutionContext): Promise<void> {
  const { sessionId, objectKey } = message.body;
  const object = await env.IMPORTS.get(objectKey);
  if (!object) return;

  const text = await object.text();
  const parsedRows = await parseCsv(text);

  for (const parsed of parsedRows) {
    const normalized = normalizeBankRow(parsed);
    await env.DB.prepare(
      `INSERT INTO import_rows (
        id, session_id, row_index, source_date, source_description, source_amount,
        normalized_description, normalized_amount, normalized_date, category, confidence, review_status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(
      crypto.randomUUID(),
      sessionId,
      parsed.rowIndex,
      normalized.sourceDate ?? null,
      normalized.sourceDescription ?? null,
      normalized.sourceAmount ?? null,
      normalized.normalizedDescription ?? null,
      normalized.normalizedAmount ?? null,
      normalized.normalizedDate ?? null,
      normalized.category ?? null,
      normalized.confidence,
      'pending'
    ).run();
  }

  await env.DB.prepare(
    `UPDATE import_sessions SET status = ?, row_count = ?, updated_at = datetime('now') WHERE id = ?`
  ).bind('parsed', parsedRows.length, sessionId).run();
}

