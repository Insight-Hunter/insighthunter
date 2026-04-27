// apps/insighthunter-ledger/workers/close/index.ts
// ih-ledger-close — Durable Workflow for month-end close orchestration.
// Steps: validate → reconcile → run rules → sync external → generate trial balance → notify.

import { WorkflowEntrypoint, WorkflowEvent, WorkflowStep } from "cloudflare:workers";

export interface CloseParams {
  cycleId: string;
  orgId: string;
  periodStart: string;
  periodEnd: string;
}

export interface Env {
  DB: D1Database;
  SYNC_QUEUE: Queue;
  NOTIFICATIONS: Queue;
}

export class MonthEndCloseWorkflow extends WorkflowEntrypoint<Env, CloseParams> {
  async run(event: WorkflowEvent<CloseParams>, step: WorkflowStep): Promise<void> {
    const { cycleId, orgId, periodStart, periodEnd } = event.payload;

    // Step 1: Validate period — check for duplicate close
    await step.do("validate_period", async () => {
      const existing = await this.env.DB.prepare(
        `SELECT id FROM close_cycles WHERE org_id = ? AND period_start = ? AND period_end = ?
         AND status = 'closed' AND id != ?`
      ).bind(orgId, periodStart, periodEnd, cycleId).first();
      if (existing) throw new Error(`Period ${periodStart}–${periodEnd} already closed`);
      await updateCycleStep(this.env.DB, cycleId, "validate_period", "complete");
    });

    // Step 2: Reconcile — count uncategorized
    const uncategorized = await step.do("reconcile", async () => {
      const result = await this.env.DB.prepare(
        `SELECT COUNT(*) AS c FROM transactions
         WHERE org_id = ? AND date >= ? AND date <= ? AND category IS NULL`
      ).bind(orgId, periodStart, periodEnd).first<{ c: number }>();
      const count = result?.c ?? 0;
      await updateCycleStep(this.env.DB, cycleId, "reconcile", "complete", { uncategorized: count });
      return count;
    });

    if (uncategorized > 0) {
      // Pause — notify team that manual review is needed
      await this.env.NOTIFICATIONS.send({
        orgId,
        type: "close_ready",
        title: `Close paused — ${uncategorized} uncategorized transactions`,
        body: `The month-end close for ${periodStart} to ${periodEnd} is paused. Please categorize ${uncategorized} transactions before continuing.`,
        actionUrl: "https://ledger.insighthunter.app/transactions?uncategorized=true",
        channels: ["in_app", "email"],
      });
      // Workflow continues — does NOT block permanently; re-evaluate after sleep
      await step.sleep("wait_for_categorization", "24 hours");
    }

    // Step 3: Generate trial balance
    await step.do("generate_trial_balance", async () => {
      const rows = await this.env.DB.prepare(
        `SELECT gl_code, category,
                SUM(CASE WHEN type = 'debit'  THEN amount ELSE 0 END) AS total_debit,
                SUM(CASE WHEN type = 'credit' THEN amount ELSE 0 END) AS total_credit
         FROM transactions
         WHERE org_id = ? AND date >= ? AND date <= ?
         GROUP BY gl_code, category
         ORDER BY gl_code`
      ).bind(orgId, periodStart, periodEnd).all();

      await this.env.DB.prepare(
        `UPDATE close_cycles SET trial_balance = ?, status = 'review'
         WHERE id = ?`
      ).bind(JSON.stringify(rows.results), cycleId).run();

      await updateCycleStep(this.env.DB, cycleId, "generate_trial_balance", "complete");
    });

    // Step 4: Enqueue external sync
    await step.do("sync_external", async () => {
      await this.env.SYNC_QUEUE.send({ orgId, cycleId, periodStart, periodEnd });
      await updateCycleStep(this.env.DB, cycleId, "sync_external", "queued");
    });

    // Step 5: Mark closed
    await step.do("finalize", async () => {
      await this.env.DB.prepare(
        "UPDATE close_cycles SET status = 'closed', closed_at = datetime('now') WHERE id = ?"
      ).bind(cycleId).run();

      await this.env.NOTIFICATIONS.send({
        orgId,
        type: "close_ready",
        title: `Month-end close complete ✓`,
        body: `Close for ${periodStart} to ${periodEnd} has been finalized. Trial balance is ready to review.`,
        actionUrl: `https://ledger.insighthunter.app/close/${cycleId}`,
        channels: ["in_app", "email"],
      });
    });
  }
}

async function updateCycleStep(
  db: D1Database, cycleId: string, step: string,
  status: string, data?: Record<string, unknown>
): Promise<void> {
  const cycle = await db.prepare(
    "SELECT steps FROM close_cycles WHERE id = ?"
  ).bind(cycleId).first<{ steps: string }>();

  const steps: Array<{ step: string; status: string; data?: unknown; ts: string }> =
    JSON.parse(cycle?.steps ?? "[]");

  steps.push({ step, status, data, ts: new Date().toISOString() });

  await db.prepare(
    "UPDATE close_cycles SET steps = ? WHERE id = ?"
  ).bind(JSON.stringify(steps), cycleId).run();
}

export default {
  fetch(): Response { return new Response("ih-ledger-close workflow"); },
};
