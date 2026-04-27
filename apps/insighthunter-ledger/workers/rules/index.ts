// apps/insighthunter-ledger/workers/rules/index.ts
// ih-ledger-rules — Queue consumer: auto-categorizes imported transactions.
// Applies org rules in priority order, then Workers AI fallback classifier.

export interface Env {
  DB: D1Database;
  AI: Ai;
  NOTIFICATIONS: Queue;
}

interface RulesJob {
  orgId: string;
  importBatchId: string;
  count: number;
}

interface Rule {
  match_type: "contains"|"starts_with"|"exact"|"regex";
  match_value: string;
  category: string;
  gl_code: string;
}

export default {
  async queue(batch: MessageBatch<RulesJob>, env: Env): Promise<void> {
    for (const msg of batch.messages) {
      const { orgId, importBatchId } = msg.body;
      try {
        await processBatch(orgId, importBatchId, env);
        msg.ack();
      } catch (err) {
        console.error("Rules processing failed:", err);
        msg.retry();
      }
    }
  },
} satisfies ExportedHandler<Env>;

async function processBatch(orgId: string, batchId: string, env: Env): Promise<void> {
  // Load org rules ordered by priority
  const rulesResult = await env.DB.prepare(
    "SELECT * FROM categorization_rules WHERE org_id = ? AND active = 1 ORDER BY priority DESC"
  ).bind(orgId).all<Rule>();
  const rules = rulesResult.results;

  // Load uncategorized transactions for this batch
  const txnsResult = await env.DB.prepare(
    "SELECT id, description, amount, type FROM transactions WHERE org_id = ? AND import_batch_id = ? AND category IS NULL"
  ).bind(orgId, batchId).all<{ id: string; description: string; amount: number; type: string }>();

  const anomalies: string[] = [];

  for (const txn of txnsResult.results) {
    let matched = false;

    // Try rule-based match
    for (const rule of rules) {
      if (matchRule(txn.description, rule)) {
        await env.DB.prepare(
          "UPDATE transactions SET category = ?, gl_code = ?, status = 'auto_categorized' WHERE id = ?"
        ).bind(rule.category, rule.gl_code, txn.id).run();
        matched = true;
        break;
      }
    }

    // AI fallback for unmatched
    if (!matched) {
      const category = await aiClassify(txn.description, txn.amount, txn.type, env);
      if (category) {
        await env.DB.prepare(
          "UPDATE transactions SET category = ?, status = 'ai_categorized' WHERE id = ?"
        ).bind(category, txn.id).run();
      } else {
        // Flag as anomaly if neither matched
        anomalies.push(txn.id);
        await env.DB.prepare(
          `INSERT OR IGNORE INTO transaction_anomalies (id, org_id, transaction_id, reason, resolved, created_at)
           VALUES (?, ?, ?, 'uncategorized_after_ai', 0, datetime('now'))`
        ).bind(crypto.randomUUID(), orgId, txn.id).run();
      }
    }
  }

  // Alert if there are anomalies
  if (anomalies.length > 0) {
    await env.NOTIFICATIONS.send({
      orgId,
      type: "anomaly_detected",
      title: `${anomalies.length} transaction(s) need review`,
      body: `${anomalies.length} imported transactions could not be auto-categorized and require manual review.`,
      actionUrl: "https://ledger.insighthunter.app/transactions?uncategorized=true",
      channels: ["in_app"],
    });
  }
}

function matchRule(description: string, rule: Rule): boolean {
  const desc = description.toLowerCase();
  const val = rule.match_value.toLowerCase();
  switch (rule.match_type) {
    case "contains":    return desc.includes(val);
    case "starts_with": return desc.startsWith(val);
    case "exact":       return desc === val;
    case "regex":       try { return new RegExp(rule.match_value, "i").test(description); } catch { return false; }
    default:            return false;
  }
}

async function aiClassify(
  description: string, amount: number, type: string, env: Env
): Promise<string | null> {
  const prompt = `Classify this bank transaction into one of these categories:
Categories: salary, rent, utilities, insurance, software, marketing, meals, travel, supplies, inventory, taxes, professional_services, interest, dividends, other_income, other_expense

Transaction: "${description}" | Amount: $${Math.abs(amount)} | Type: ${type}

Reply with only the category name, nothing else.`;

  try {
    const result = await env.AI.run("@cf/meta/llama-3-8b-instruct", {
      prompt, max_tokens: 10
    }) as { response: string };
    return result.response.trim().toLowerCase().replace(/[^a-z_]/g, "") || null;
  } catch {
    return null;
  }
}
