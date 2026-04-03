import type { Env, ImportJobPayload } from '../types';
import { parseCSV, parseOFX } from '../services/importService';
import { batchInsertTransactions } from '../services/transactionService';
import { bulkCategorize } from '../services/categorizationService';
import { trackEvent } from '../lib/analytics';
import { logger } from '../lib/logger';

export async function handleImportQueue(
  batch: MessageBatch<ImportJobPayload>,
  env: Env,
): Promise<void> {
  for (const message of batch.messages) {
    const { orgId, userId, fileKey, format, accountId = '' } = message.body;

    try {
      const obj = await env.R2.get(fileKey);
      if (!obj) { message.ack(); continue; }

      const raw = await obj.text();
      const { transactions, errors, rowCount } =
        format === 'ofx' || format === 'qbo'
          ? parseOFX(raw, orgId, accountId)
          : parseCSV(raw, orgId, accountId);

      const { inserted, skipped } = await batchInsertTransactions(env.DB, transactions);
      await bulkCategorize(env.DB, orgId);
      await env.R2.delete(fileKey);

      trackEvent(env.ANALYTICS, 'import_completed', orgId, {
        count: inserted, source: format,
      });

      logger.info('import_queue_processed', { orgId, rowCount, inserted, skipped, errors: errors.length });
      message.ack();
    } catch (err) {
      logger.error('import_queue_failed', { orgId, fileKey, error: (err as Error).message });
      message.retry();
    }
  }
}
