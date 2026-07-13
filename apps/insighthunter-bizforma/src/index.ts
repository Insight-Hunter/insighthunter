import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { secureHeaders } from "hono/secure-headers";
import { timing } from "hono/timing";
import type { BizformaEnv } from "./types.js";
import { requireAuth } from "./middleware/auth.js";
import { formation } from "./routes/formation.js";
import { compliance } from "./routes/compliance.js";
import { ai } from "./routes/ai.js";
import { wizard } from "./routes/wizard.js";
import { processReminderBatch, dispatchUpcomingReminders } from "./queues/reminder-consumer.js";
import type { ReminderJob } from "./queues/reminder-consumer.js";

const app = new Hono<{ Bindings: BizformaEnv }>();

// ── Global Middleware ────────────────────────────────────────────────────────
app.use("*", timing());
app.use("*", logger());
app.use("*", secureHeaders());
app.use(
  "*",
  cors({
    origin: [
      "https://insighthunter.app",
      "https://bizforma.insighthunter.app",
      "https://app.insighthunter.app",
      "http://localhost:3000",
      "http://localhost:8788",
    ],
    allowHeaders: ["Content-Type", "Authorization", "X-Tenant-ID", "X-Internal-Secret"],
    allowMethods: ["GET", "POST", "PATCH", "PUT", "DELETE", "OPTIONS"],
    credentials: true,
    maxAge: 86400,
  })
);

// ── Public Routes ────────────────────────────────────────────────────────────
app.get("/health", (c) =>
  c.json({
    service: "insighthunter-bizforma",
    ok: true,
    version: "0.3.0",
    timestamp: new Date().toISOString(),
    routes: ["/api/formation", "/api/compliance", "/api/ai", "/api/wizard"],
  })
);

app.get("/", (c) => c.redirect("https://bizforma.insighthunter.app", 302));

// ── Protected API Routes ─────────────────────────────────────────────────────
app.use("/api/*", requireAuth);

app.route("/api/formation", formation);
app.route("/api/compliance", compliance);
app.route("/api/ai", ai);
app.route("/api/wizard", wizard);

// ── Cloudflare Scheduled Trigger (cron) ──────────────────────────────────────
async function scheduled(event: ScheduledEvent, env: BizformaEnv): Promise<void> {
  console.log(`[scheduled] cron=${event.cron} at=${new Date().toISOString()}`);

  // Daily 9am UTC: dispatch compliance reminders to queue
  if (event.cron === "0 9 * * *") {
    await dispatchUpcomingReminders(env);
  }

  // Daily midnight UTC: flag overdue events
  if (event.cron === "0 0 * * *") {
    const { flagOverdueEvents, purgeExpiredSessions } = await import("./services/compliance-calendar.js");
    const { purgeExpiredSessions: purge } = await import("./services/wizard-session.js");
    await flagOverdueEvents(env.DB);
    await purge(env.DB);
  }
}

// ── Queue Consumer Handler ────────────────────────────────────────────────────
async function queue(
  batch: MessageBatch<{ type: string; doc_id?: string; r2_key?: string } | ReminderJob>,
  env: BizformaEnv
): Promise<void> {
  const queueName = batch.queue;

  if (queueName === "insighthunter-bizforma-pdf") {
    for (const msg of batch.messages) {
      const job = msg.body as { type: string; doc_id: string; r2_key: string };
      console.log(`[pdf-queue] Processing ${job.type} for doc ${job.doc_id}`);
      await env.DB.prepare(
        `UPDATE bizforma_documents SET status = 'ready', updated_at = datetime('now') WHERE id = ?`
      ).bind(job.doc_id).run();
      msg.ack();
    }
  }

  if (queueName === "insighthunter-bizforma-reminders") {
    await processReminderBatch(batch as MessageBatch<ReminderJob>, env);
  }
}

export { FormationAgent } from "./agents/formation-agent.js";
export default { fetch: app.fetch, scheduled, queue };
