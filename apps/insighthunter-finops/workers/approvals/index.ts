// apps/insighthunter-finops/workers/approvals/index.ts
// ih-finops-approvals — Durable Workflow for bill approval chains.
// Supports multi-step approval with escalation and timeout.

import { WorkflowEntrypoint, WorkflowEvent, WorkflowStep } from "cloudflare:workers";

interface ApprovalParams {
  billId: string;
  orgId: string;
  amount: number;
  requestedBy: string;
}

export interface Env {
  DB: D1Database;
  NOTIFICATIONS: Queue;
}

export class BillApprovalWorkflow extends WorkflowEntrypoint<Env, ApprovalParams> {
  async run(event: WorkflowEvent<ApprovalParams>, step: WorkflowStep): Promise<void> {
    const { billId, orgId, amount, requestedBy } = event.payload;

    // Step 1: Notify approvers
    await step.do("notify_approvers", async () => {
      const approvers = await getApprovers(this.env.DB, orgId, amount);

      for (const approver of approvers) {
        await this.env.NOTIFICATIONS.send({
          orgId,
          userId: approver.userId,
          type: "approval_needed",
          title: `Bill approval needed — $${amount.toFixed(2)}`,
          body: `A bill for $${amount.toFixed(2)} is awaiting your approval. Review and approve or reject in InsightHunter.`,
          actionUrl: `https://finops.insighthunter.app/bills/${billId}`,
          channels: ["in_app", "email"],
        });
      }

      await this.env.DB.prepare(
        "INSERT INTO bill_approvals (id, org_id, bill_id, status, notified_at, created_at) VALUES (?, ?, ?, 'pending', datetime('now'), datetime('now'))"
      ).bind(crypto.randomUUID(), orgId, billId).run();
    });

    // Step 2: Wait for approval decision (up to 72 hours)
    const decision = await step.waitForEvent<{ approved: boolean; approvedBy: string; reason?: string }>(
      "approval_decision",
      { timeout: "72 hours" }
    );

    // Step 3: Handle decision
    await step.do("record_decision", async () => {
      if (!decision || decision.timeout) {
        // Escalate — auto-reject on timeout
        await this.env.DB.prepare(
          "UPDATE bills SET status = 'escalated', escalated_at = datetime('now') WHERE id = ? AND org_id = ?"
        ).bind(billId, orgId).run();

        await this.env.NOTIFICATIONS.send({
          orgId, type: "approval_needed",
          title: `Bill approval timed out — escalated`,
          body: `Bill #${billId.slice(0, 8)} approval request expired after 72 hours and has been escalated.`,
          actionUrl: `https://finops.insighthunter.app/bills/${billId}`,
          channels: ["in_app", "email"],
        });
        return;
      }

      const status = decision.approved ? "approved" : "rejected";
      await this.env.DB.prepare(
        `UPDATE bills SET status = ?, approved_by = ?, approved_at = datetime('now'), reject_reason = ?
         WHERE id = ? AND org_id = ?`
      ).bind(status, decision.approvedBy, decision.reason ?? null, billId, orgId).run();

      await this.env.DB.prepare(
        "UPDATE bill_approvals SET status = ?, decided_by = ?, decided_at = datetime('now') WHERE bill_id = ?"
      ).bind(status, decision.approvedBy, billId).run();

      await this.env.NOTIFICATIONS.send({
        orgId, userId: requestedBy, type: "approval_needed",
        title: `Bill ${status}`,
        body: `Your bill for $${amount.toFixed(2)} has been ${status}.${decision.reason ? ` Reason: ${decision.reason}` : ""}`,
        actionUrl: `https://finops.insighthunter.app/bills/${billId}`,
        channels: ["in_app"],
      });
    });
  }
}

async function getApprovers(
  db: D1Database, orgId: string, amount: number
): Promise<Array<{ userId: string }>> {
  const rows = await db.prepare(
    `SELECT user_id FROM approval_rules WHERE org_id = ? AND active = 1
     AND (min_amount IS NULL OR min_amount <= ?) AND (max_amount IS NULL OR max_amount >= ?)
     ORDER BY priority DESC`
  ).bind(orgId, amount, amount).all<{ user_id: string }>();

  if (rows.results.length === 0) {
    // Fall back to org owner
    const owner = await db.prepare(
      "SELECT id AS user_id FROM users WHERE org_id = ? AND role = 'owner' LIMIT 1"
    ).bind(orgId).first<{ user_id: string }>();
    return owner ? [{ userId: owner.user_id }] : [];
  }

  return rows.results.map((r) => ({ userId: r.user_id }));
}

export default {
  fetch(): Response { return new Response("ih-finops-approvals workflow"); },
};
