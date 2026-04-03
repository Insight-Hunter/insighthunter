import { Hono } from "hono";
import type { Env } from "../types";
import { authMiddleware } from "../middleware/auth";

const ai = new Hono<{ Bindings: Env }>();
ai.use("*", authMiddleware);

// GET /api/ai/queue — pending items needing human review
ai.get("/queue", async (c) => {
  const user = c.get("user");
  const { results } = await c.env.DB.prepare(
    `SELECT id, org_id, transaction_id, question,
            suggested_account_id, suggested_account_name,
            confidence, ai_reasoning, alternatives
       FROM ai_classification_queue
      WHERE org_id=? AND status='pending'
      ORDER BY created_at ASC
      LIMIT 100`
  )
    .bind(user.orgId)
    .all();
  return c.json(results);
});

// POST /api/ai/approve — approve classification & set account
ai.post("/approve", async (c) => {
  const user = c.get("user");
  const body = await c.req.json<{
    queueItemId: string;
    accountId: string;
  }>();

  const item = await c.env.DB.prepare(
    "SELECT * FROM ai_classification_queue WHERE id=? AND org_id=?"
  )
    .bind(body.queueItemId, user.orgId)
    .first<{ transaction_id: string }>();

  if (!item) {
    return c.json({ error: "Queue item not found" }, 404);
  }

  const now = new Date().toISOString();

  await c.env.DB.batch([
    c.env.DB.prepare(
      `UPDATE ai_classification_queue
            SET status='answered',
                resolved_account_id=?,
                resolved_at=?,
                human_answer='approved'
          WHERE id=?`
    ).bind(body.accountId, now, body.queueItemId),
    c.env.DB.prepare(
      `UPDATE transactions
            SET account_id=?, status='approved', updated_at=?
          WHERE id=?`
    ).bind(body.accountId, now, item.transaction_id),
  ]);

  // Optionally: create JE here or leave to agent (we already do it in agent)
  return c.json({ ok: true });
});

// POST /api/ai/reject — optional hook if you want explicit rejections
ai.post("/reject", async (c) => {
  const user = c.get("user");
  const body = await c.req.json<{
    queueItemId: string;
    note?: string;
  }>();

  const item = await c.env.DB.prepare(
    "SELECT * FROM ai_classification_queue WHERE id=? AND org_id=?"
  )
    .bind(body.queueItemId, user.orgId)
    .first();

  if (!item) {
    return c.json({ error: "Queue item not found" }, 404);
  }

  const now = new Date().toISOString();
  await c.env.DB.prepare(
    `UPDATE ai_classification_queue
        SET status='answered',
            human_answer=?,
            resolved_at=?
      WHERE id=?`
  )
    .bind(body.note ?? "rejected", now, body.queueItemId)
    .run();

  return c.json({ ok: true });
});

export default ai;
