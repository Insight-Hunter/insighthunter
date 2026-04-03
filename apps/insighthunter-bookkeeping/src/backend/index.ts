import { Hono } from "hono";
import { cors } from "hono/cors";
import { secureHeaders } from "hono/secure-headers";
import type { Env, ClassificationJob } from "./types";
import { analyticsLogger } from "./middleware/logger";
import accounts from "./routes/accounts";
import transactions from "./routes/transactions";
import journalEntries from "./routes/journalEntries";
import reconciliation from "./routes/reconciliation";
import quickbooks from "./routes/quickbooks";
import billing from "./routes/billing";
import ai from "./routes/ai";
import { BookkeepingAgent } from "./agents/BookkeepingAgent";
import { ReconciliationAgent } from "./agents/ReconciliationAgent";

const app = new Hono<{ Bindings: Env }>();

// Global middleware
app.use(
  "*",
  cors({
    origin: [
      "https://insighthunter.app",
      "https://bookkeeping.insighthunter.app",
    ],
    credentials: true,
  })
);
app.use("*", (c, next) => secureHeaders()(c, next));
app.use("*", analyticsLogger);

// Health check
app.get("/health", (c) =>
  c.json({
    status: "ok",
    service: "insighthunter-bookkeeping",
    time: new Date().toISOString(),
  })
);

// API routes (all prefixed with /api by the frontend hook)
const api = app.basePath("/api");
api.route("/accounts", accounts);
api.route("/transactions", transactions);
api.route("/journal-entries", journalEntries);
api.route("/reconciliation", reconciliation);
api.route("/quickbooks", quickbooks);
api.route("/billing", billing);
api.route("/ai", ai);

// Agent WebSocket endpoint for AI bookkeeping agent (one per org)
app.get("/agent/bookkeeping", async (c) => {
  if (c.req.header("Upgrade") !== "websocket") {
    return c.json({ error: "Expected WebSocket upgrade" }, 426);
  }

  const orgId = c.req.query("org");
  const token = c.req.query("token");

  if (!orgId || !token) {
    return c.json({ error: "Missing org or token" }, 400);
  }

  // Validate token with auth worker before upgrading
  const res = await fetch(`${c.env.AUTH_WORKER_URL}/api/session/validate`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    return c.json({ error: "Invalid session" }, 401);
  }

  // Route WebSocket to the BookkeepingAgent DO using Agents runtime
  const id = c.env.BOOKKEEPING_AGENT.idFromName(orgId);
  const stub = c.env.BOOKKEEPING_AGENT.get(id);
  return stub.fetch(c.req.raw);
});

// Queue consumer: classification jobs
export default {
  fetch: app.fetch,
  // Cloudflare Queues consumer for CLASSIFICATION_QUEUE
  async queue(batch: MessageBatch<ClassificationJob>, env: Env) {
    for (const msg of batch.messages) {
      try {
        const job = msg.body;
        const id = env.BOOKKEEPING_AGENT.idFromName(job.orgId);
        const agent = env.BOOKKEEPING_AGENT.get(id);
        // Call BookkeepingAgent's HTTP interface for classification
        await agent.fetch("https://internal/classify", {
          method: "POST",
          body: JSON.stringify(job),
        });
      } catch (err) {
        console.error("Classification queue error:", err);
        msg.retry();
      }
    }
  },
} satisfies ExportedHandler<Env>;

// Export Durable Object classes for Wrangler
export { BookkeepingAgent, ReconciliationAgent };
