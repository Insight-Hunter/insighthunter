import type { Env, ReconciliationJobPayload } from '../types';
import { startReconciliation } from '../services/reconciliationService';
import { trackEvent } from '../lib/analytics';
import { logger } from '../lib/logger';

export async function handleReconciliationQueue(
  batch: MessageBatch<ReconciliationJobPayload>,
  env: Env,
): Promise<void> {
  for (const message of batch.messages) {
    const { orgId, userId, accountId, statementDate, statementBalance } = message.body;
    try {
      await startReconciliation(env.DB, orgId, accountId, statementDate, statementBalance, userId);
      trackEvent(env.ANALYTICS, 'reconciliation_started', orgId, { amount: statementBalance });
      logger.info('reconciliation_queued', { orgId, accountId, statementDate });
      message.ack();
    } catch (err) {
      logger.error('reconciliation_queue_failed', { orgId, error: (err as Error).message });
      message.retry();
    }
  }
}
