import { WorkflowEntrypoint, WorkflowStep, WorkflowEvent } from 'cloudflare:workers';
import type { Env, ReconciliationJobPayload } from '../types';
import { startReconciliation, completeReconciliation } from '../services/reconciliationService';
import { getTransactions } from '../db/queries';
import { TransactionStatus } from '../types/accounting';
import { trackEvent } from '../lib/analytics';

export class ReconciliationWorkflow extends WorkflowEntrypoint<Env, ReconciliationJobPayload> {
  async run(event: WorkflowEvent<ReconciliationJobPayload>, step: WorkflowStep) {
    const { orgId, userId, accountId, statementDate, statementBalance } = event.payload;

    const record = await step.do('start-reconciliation', async () => {
      return startReconciliation(this.env.DB, orgId, accountId, statementDate, statementBalance, userId);
    });

    const clearedBalance = await step.do('sum-cleared-transactions', async () => {
      const txs = await getTransactions(this.env.DB, {
        orgId, accountId, status: TransactionStatus.RECONCILED,
        dateTo: statementDate,
      });
      return txs.reduce((s, t) => s + t.amount, 0);
    });

    await step.do('complete-reconciliation', async () => {
      return completeReconciliation(
        this.env.DB, record.id, orgId, userId, clearedBalance, statementBalance
      );
    });

    await step.do('track', async () => {
      trackEvent(this.env.ANALYTICS, 'reconciliation_completed', orgId, {
        amount: statementBalance,
      });
    });
  }
}
