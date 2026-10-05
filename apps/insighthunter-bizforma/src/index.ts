import { Hono } from "hono";
import { cors } from "hono/cors";
import { errorBoundary } from "./middleware/errors.js";
import { requestLogger } from "./middleware/logger.js";
import { requireAuth } from "./middleware/auth.js";
import type { AppBindings, BizformaEnv } from "./types.js";
import { formation } from "./routes/formation.js";
import { wizard } from "./routes/wizard.js";
import { dashboard } from "./routes/dashboard.js";
import { compliance } from "./routes/compliance.js";
import { documents } from "./routes/documents.js";
import { ein } from "./routes/ein.js";
import { licenses } from "./routes/licenses.js";
import { tasks } from "./routes/tasks.js";
import { signatures } from "./routes/signatures.js";
import { maintenance } from "./routes/maintenance.js";
import { registeredAgent } from "./routes/registered-agent.js";
import { ai } from "./routes/ai.js";
import { requireInternalSecret } from "./utils/security.js";

export { FormationAgent } from "./agents/FormationAgent.js";
export { ComplianceAgent } from "./agents/ComplianceAgent.js";

const app = new Hono<AppBindings>();

app.use("*", errorBoundary);
app.use("*", requestLogger);
app.use("*", cors({
  origin: [
    "https://app.insighthunter.app",
    "https://insighthunter.app",
    "http://localhost:4321",
    "http://localhost:8787"
  ],
  allowHeaders: ["Authorization", "Content-Type", "X-Org-Id", "X-Org-Plan", "X-User-Id"],
  allowMethods: ["GET", "POST", "PATCH", "PUT", "DELETE", "OPTIONS"],
  exposeHeaders: ["x-request-id"]
}));

app.get("/health", (c) => c.json({
  ok: true,
  app: c.env.APP_NAME,
  environment: c.env.ENVIRONMENT,
  timestamp: new Date().toISOString()
}));

app.use("/api/*", requireAuth);

app.route("/api/formation", formation);
app.route("/api/wizard", wizard);
app.route("/api/dashboard", dashboard);
app.route("/api/compliance", compliance);
app.route("/api/documents", documents);
app.route("/api/ein", ein);
app.route("/api/licenses", licenses);
app.route("/api/tasks", tasks);
app.route("/api/signatures", signatures);
app.route("/api/maintenance", maintenance);
app.route("/api/registered-agent", registeredAgent);
app.route("/api/ai", ai);

app.post("/internal/cron/rollups", async (c) => {
  if (!requireInternalSecret(c.req.raw.headers, c.env.INTERNAL_SECRET)) {
    return c.json({ error: "Forbidden" }, 403);
  }

  await c.env.BIZFORMA_DB.prepare(`
    UPDATE bizforma_compliance_events
    SET status = CASE
      WHEN status != 'completed' AND date(due_date) < date('now') THEN 'overdue'
      WHEN status != 'completed' AND date(due_date) <= date('now', '+30 day') THEN 'due_soon'
      ELSE status
    END,
    updated_at = ?1
  `).bind(new Date().toISOString()).run();

  return c.json({ ok: true });
});

export default {
  fetch: app.fetch,
  async scheduled(_controller: ScheduledController, env: BizformaEnv): Promise<void> {
    const now = new Date().toISOString();

    const overdue = await env.BIZFORMA_DB.prepare(`
      SELECT id, case_id, org_id
      FROM bizforma_compliance_events
      WHERE status IN ('pending', 'due_soon', 'overdue')
        AND date(due_date) <= date('now', '+7 day')
      ORDER BY due_date ASC
      LIMIT 100
    `).all<{ id: string; case_id: string; org_id: string }>();

    for (const event of overdue.results ?? []) {
      await env.REMINDER_QUEUE.send({
        type: "compliance_reminder",
        case_id: event.case_id,
        event_id: event.id,
        user_id: event.org_id
      });
    }

    const doId = env.COMPLIANCE_AGENT.idFromName("global-compliance");
    const stub = env.COMPLIANCE_AGENT.get(doId);
    await stub.fetch("https://compliance-agent/run", {
      method: "POST",
      body: JSON.stringify({ lastOrgId: "batch", lastRunAt: now })
    });
  },
  async queue(batch: MessageBatch<{ type: string; doc_id?: string; r2_key?: string; case_id?: string; event_id?: string; user_id?: string }>, env: BizformaEnv): Promise<void> {
    for (const message of batch.messages) {
      if (message.body.type === "compliance_reminder" && message.body.event_id) {
        await env.BIZFORMA_DB.prepare(`
          INSERT INTO bizforma_reminder_deliveries
            (id, org_id, event_id, channel, status, created_at)
          VALUES (?1, ?2, ?3, 'system', 'queued', ?4)
        `).bind(
          crypto.randomUUID(),
          message.body.user_id ?? "unknown",
          message.body.event_id,
          new Date().toISOString()
        ).run();
      }

      if (message.body.doc_id) {
        await env.BIZFORMA_DB.prepare(`
          UPDATE bizforma_documents
          SET status = 'ready', updated_at = ?1
          WHERE id = ?2
        `).bind(new Date().toISOString(), message.body.doc_id).run();
      }

      message.ack();
    }
  }
};
