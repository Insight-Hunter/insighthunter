// apps/insighthunter-advisor/workers/intelligence/index.ts
// ih-advisor-intelligence — cross-app health scoring + AI-powered advisory feed.
// Runs on a Cron trigger (every 6 hours) and on-demand via POST /run.
// Uses Workers AI (llama-3-8b-instruct) for natural language advisory summaries.

export interface Env {
  DB: D1Database;           // ih-advisor D1
  LEDGER_DB: D1Database;    // ih-ledger D1 (read-only cross-binding)
  FINOPS_DB: D1Database;    // ih-finops D1 (read-only cross-binding)
  AI: Ai;                   // Workers AI binding
  NOTIFICATIONS: Queue;     // ih-notifications queue
  ENVIRONMENT: string;
}

export default {
  // Cron: "0 */6 * * *"
  async scheduled(_event: ScheduledEvent, env: Env): Promise<void> {
    await runScoring(env);
  },

  // On-demand trigger for immediate recalculation
  async fetch(request: Request, env: Env): Promise<Response> {
    if (request.method !== "POST") {
      return new Response(JSON.stringify({ ok: false, error: "POST only" }), { status: 405 });
    }
    const { orgId } = await request.json<{ orgId?: string }>();
    await runScoring(env, orgId);
    return new Response(JSON.stringify({ ok: true }), {
      headers: { "content-type": "application/json" },
    });
  },
} satisfies ExportedHandler<Env>;

// ─── Core Scoring ─────────────────────────────────────────────────────────────

async function runScoring(env: Env, targetOrgId?: string): Promise<void> {
  // Get all active orgs (or a specific one)
  const orgsQuery = targetOrgId
    ? "SELECT id, name FROM organizations WHERE id = ? AND active = 1"
    : "SELECT id, name FROM organizations WHERE active = 1";
  const orgsResult = targetOrgId
    ? await env.DB.prepare(orgsQuery).bind(targetOrgId).all<{ id: string; name: string }>()
    : await env.DB.prepare(orgsQuery).all<{ id: string; name: string }>();

  for (const org of orgsResult.results) {
    try {
      await scoreOrg(org.id, org.name, env);
    } catch (err) {
      console.error(`Scoring failed for org ${org.id}:`, err);
    }
  }
}

async function scoreOrg(orgId: string, orgName: string, env: Env): Promise<void> {
  // Gather signals from each module DB
  const signals = await gatherSignals(orgId, env);
  const score = computeScore(signals);

  // Persist score
  await env.DB.prepare(
    `INSERT INTO health_scores (id, org_id, overall_score, breakdown, signals, computed_at)
     VALUES (?, ?, ?, ?, ?, datetime('now'))
     ON CONFLICT(org_id) DO UPDATE SET
       overall_score = excluded.overall_score,
       breakdown = excluded.breakdown,
       signals = excluded.signals,
       computed_at = excluded.computed_at`
  )
    .bind(
      crypto.randomUUID(),
      orgId,
      score.overall,
      JSON.stringify(score.breakdown),
      JSON.stringify(signals)
    )
    .run();

  // Generate AI advisory insight if score dropped or is low
  if (score.overall < 70 || signals.anomalies > 0) {
    const insight = await generateInsight(orgName, score, signals, env);
    await env.DB.prepare(
      `INSERT INTO ai_insights (id, org_id, insight, score_snapshot, created_at)
       VALUES (?, ?, ?, ?, datetime('now'))`
    )
      .bind(crypto.randomUUID(), orgId, insight, JSON.stringify(score))
      .run();

    // Push alert
    await env.NOTIFICATIONS.send({
      orgId,
      type: "alert_created",
      title: `Advisory Alert — Health Score ${score.overall}/100`,
      body: insight.slice(0, 200) + (insight.length > 200 ? "…" : ""),
      actionUrl: `https://advisor.insighthunter.app/insights`,
      channels: ["in_app"],
    });
  }
}

// ─── Signal Collection ────────────────────────────────────────────────────────

interface Signals {
  openTasks: number;
  overdueTasks: number;
  openAlerts: number;
  uncategorizedTxns: number;
  anomalies: number;
  overdueInvoices: number;
  pendingApprovals: number;
  closeCycleDelayDays: number;
  complianceItemsDue7d: number;
}

async function gatherSignals(orgId: string, env: Env): Promise<Signals> {
  const [tasks, alerts, txns, anomalies, invoices, approvals, close, compliance] =
    await Promise.allSettled([
      env.DB.prepare(
        "SELECT COUNT(*) AS c FROM tasks WHERE org_id = ? AND status = 'open'"
      ).bind(orgId).first<{ c: number }>(),
      env.DB.prepare(
        "SELECT COUNT(*) AS c FROM advisor_alerts WHERE org_id = ? AND read = 0"
      ).bind(orgId).first<{ c: number }>(),
      env.LEDGER_DB.prepare(
        "SELECT COUNT(*) AS c FROM transactions WHERE org_id = ? AND category IS NULL"
      ).bind(orgId).first<{ c: number }>(),
      env.LEDGER_DB.prepare(
        "SELECT COUNT(*) AS c FROM transaction_anomalies WHERE org_id = ? AND resolved = 0"
      ).bind(orgId).first<{ c: number }>(),
      env.FINOPS_DB.prepare(
        "SELECT COUNT(*) AS c FROM ar_invoices WHERE org_id = ? AND status = 'overdue'"
      ).bind(orgId).first<{ c: number }>(),
      env.FINOPS_DB.prepare(
        "SELECT COUNT(*) AS c FROM bill_approvals WHERE org_id = ? AND status = 'pending'"
      ).bind(orgId).first<{ c: number }>(),
      env.LEDGER_DB.prepare(
        `SELECT CAST(julianday('now') - julianday(MAX(closed_at)) AS INTEGER) AS delay
         FROM close_cycles WHERE org_id = ? AND status = 'closed'`
      ).bind(orgId).first<{ delay: number }>(),
      env.DB.prepare(
        `SELECT COUNT(*) AS c FROM tasks WHERE org_id = ? AND type = 'compliance'
         AND due_date <= date('now', '+7 days') AND status = 'open'`
      ).bind(orgId).first<{ c: number }>(),
    ]);

  const val = <T>(r: PromiseSettledResult<T | null>, key: keyof T, fallback: number): number =>
    r.status === "fulfilled" && r.value ? (r.value[key] as number) ?? fallback : fallback;

  return {
    openTasks:            val(tasks, "c" as never, 0),
    overdueTasks:         0, // computed separately if needed
    openAlerts:           val(alerts, "c" as never, 0),
    uncategorizedTxns:    val(txns, "c" as never, 0),
    anomalies:            val(anomalies, "c" as never, 0),
    overdueInvoices:      val(invoices, "c" as never, 0),
    pendingApprovals:     val(approvals, "c" as never, 0),
    closeCycleDelayDays:  val(close, "delay" as never, 0),
    complianceItemsDue7d: val(compliance, "c" as never, 0),
  };
}

// ─── Score Computation ────────────────────────────────────────────────────────

interface ScoreResult {
  overall: number;
  breakdown: Record<string, number>;
}

function computeScore(s: Signals): ScoreResult {
  // Each dimension 0-100; weighted average
  const bookkeeping   = Math.max(0, 100 - s.uncategorizedTxns * 5 - s.anomalies * 10);
  const cashflow      = Math.max(0, 100 - s.overdueInvoices * 10 - s.pendingApprovals * 5);
  const compliance    = Math.max(0, 100 - s.complianceItemsDue7d * 15 - s.openAlerts * 2);
  const operations    = Math.max(0, 100 - s.openTasks * 3 - s.closeCycleDelayDays * 2);

  const overall = Math.round(
    bookkeeping * 0.35 + cashflow * 0.30 + compliance * 0.20 + operations * 0.15
  );

  return { overall, breakdown: { bookkeeping, cashflow, compliance, operations } };
}

// ─── AI Insight Generation ────────────────────────────────────────────────────

async function generateInsight(
  orgName: string,
  score: ScoreResult,
  signals: Signals,
  env: Env
): Promise<string> {
  const prompt = `You are a CFO-level advisor reviewing a small business's financial health.

Business: ${orgName}
Health Score: ${score.overall}/100
Breakdown: Bookkeeping ${score.breakdown.bookkeeping}, Cash Flow ${score.breakdown.cashflow}, Compliance ${score.breakdown.compliance}, Operations ${score.breakdown.operations}
Signals: ${signals.uncategorizedTxns} uncategorized transactions, ${signals.anomalies} anomalies, ${signals.overdueInvoices} overdue invoices, ${signals.complianceItemsDue7d} compliance items due in 7 days, ${signals.pendingApprovals} pending approvals.

Write a 2-sentence advisory insight identifying the highest-risk area and one specific recommended action. Be direct and specific — no generic advice.`;

  try {
    const result = await env.AI.run("@cf/meta/llama-3-8b-instruct", {
      prompt,
      max_tokens: 150,
    }) as { response: string };
    return result.response.trim();
  } catch {
    // Fallback to rule-based message
    const worst = Object.entries(score.breakdown).sort((a, b) => a[1] - b[1])[0];
    return `${orgName}'s ${worst[0]} score of ${worst[1]}/100 needs immediate attention. Review the flagged items in your InsightHunter dashboard to address the highest-risk issues first.`;
  }
}
