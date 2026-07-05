import { Hono } from "hono";

export interface Env {
  DB: D1Database;
  AI: Ai;
}

const app = new Hono<{ Bindings: Env }>();

app.get("/health", (c) => c.json({ service: "advisor", ok: true }));

/**
 * Daily briefing: uses Workers AI to generate a short narrative summary
 * of the organization's recent financial activity.
 */
app.get("/briefing", async (c) => {
  const orgId = c.req.header("x-organization-id");
  if (!orgId) return c.json({ error: "x-organization-id header required" }, 400);

  const prompt = [
    "You are InsightHunter Advisor, a concise financial analyst.",
    `Generate a 2-sentence briefing for organization ${orgId}.`,
    "Focus on cash flow and outstanding items.",
  ].join(" ");

  const response = await c.env.AI.run("@cf/meta/llama-3-8b-instruct", {
    messages: [{ role: "user", content: prompt }],
  });

  const text =
    "response" in response && typeof response.response === "string"
      ? response.response
      : "Briefing unavailable.";

  return c.json({
    headline: "Financial Briefing",
    summary: text,
    generatedAt: new Date().toISOString(),
  });
});

/**
 * Insights: returns a list of static insight categories. Extend with
 * Vectorize + AI queries as data grows.
 */
app.get("/insights", (c) => {
  return c.json({
    items: [
      { category: "Cash Flow", status: "healthy" },
      { category: "Receivables", status: "review" },
      { category: "Payables", status: "healthy" },
    ],
  });
});

export default app;
