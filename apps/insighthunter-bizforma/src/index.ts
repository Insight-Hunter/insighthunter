import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { secureHeaders } from "hono/secure-headers";
import { timing } from "hono/timing";
import type { BizformaEnv } from "./types.js";
import { requireAuth } from "./middleware/auth.js";
import { formation } from "./routes/formation.js";

const app = new Hono<{ Bindings: BizformaEnv }>();

// ── Global Middleware ──────────────────────────────────────────────────────────
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
    allowHeaders: ["Content-Type", "Authorization", "X-Tenant-ID"],
    allowMethods: ["GET", "POST", "PATCH", "PUT", "DELETE", "OPTIONS"],
    credentials: true,
    maxAge: 86400,
  })
);

// ── Public Routes ──────────────────────────────────────────────────────────────
app.get("/health", (c) =>
  c.json({
    service: "insighthunter-bizforma",
    ok: true,
    version: "0.2.0",
    timestamp: new Date().toISOString(),
  })
);

app.get("/", (c) => c.redirect("https://bizforma.insighthunter.app", 302));

// ── Protected API Routes ───────────────────────────────────────────────────────
app.use("/api/*", requireAuth);

// Formation CRUD + document upload
app.route("/api/formation", formation);

// Compliance stubs (Sprint 3)
app.get("/api/compliance", (c) => {
  const auth = c.get("auth");
  return c.json({ tenant_id: auth.tenantId, events: [], message: "compliance_calendar_coming_sprint_3" });
});

// AI advisor stubs (Sprint 4)
app.post("/api/ai/name-suggestions", async (c) => {
  const body = await c.req.json<{ keywords: string[]; state: string; entity_type: string }>();
  // Cache key for KV
  const cacheKey = `ai:names:${body.state}:${body.entity_type}:${body.keywords.sort().join(",")}`;
  const cached = await c.env.CACHE.get(cacheKey);
  if (cached) return c.json({ suggestions: JSON.parse(cached), cached: true });

  // Stub — Sprint 4 wires Workers AI
  const suggestions = [
    `${body.keywords[0] ?? "Apex"} ${body.entity_type === "LLC" ? "LLC" : "Corp"} of ${body.state}`,
    `${body.keywords[0] ?? "Summit"} Ventures ${body.entity_type}`,
    `${body.keywords[0] ?? "Peak"} Solutions Group`,
  ];

  await c.env.CACHE.put(cacheKey, JSON.stringify(suggestions), { expirationTtl: 3600 });
  return c.json({ suggestions, cached: false });
});

app.post("/api/ai/entity-recommendation", async (c) => {
  const body = await c.req.json<{ state: string; business_type: string; owners: number; annual_revenue?: number }>();
  // Stub logic — Sprint 4 replaces with Workers AI inference
  let recommendation = "LLC";
  if (body.owners > 5 && (body.annual_revenue ?? 0) > 500_000) recommendation = "S-CORP";
  if (body.owners > 25 || (body.annual_revenue ?? 0) > 5_000_000) recommendation = "C-CORP";

  return c.json({
    recommendation,
    rationale: `Based on ${body.owners} owners and ${body.business_type} in ${body.state}`,
    disclaimer: "This is not legal or tax advice. Consult a licensed attorney.",
  });
});

// PDF Queue consumer handler
const queueHandler = {
  async queue(batch: MessageBatch<{ type: string; doc_id: string; r2_key: string }>, env: BizformaEnv): Promise<void> {
    for (const msg of batch.messages) {
      const { type, doc_id, r2_key } = msg.body;
      console.log(`[queue] Processing ${type} for doc ${doc_id} at ${r2_key}`);
      // Sprint 3: wire Browser Rendering or pdf-lib for actual generation
      await env.DB.prepare(
        `UPDATE bizforma_documents SET status = 'ready', updated_at = datetime('now') WHERE id = ?`
      ).bind(doc_id).run();
      msg.ack();
    }
  },
};

export { FormationAgent } from "./agents/formation-agent.js";
export default { ...app, ...queueHandler };
