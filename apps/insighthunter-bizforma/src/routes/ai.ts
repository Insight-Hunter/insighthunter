// routes/ai.ts — AI-assisted formation guidance via Workers AI
import { Hono } from "hono";
import type { BizformaEnv } from "../types.js";

export const ai = new Hono<{ Bindings: BizformaEnv }>();

const SYSTEM_PROMPT = `You are BizForma AI, an expert business formation assistant.
You help small business owners choose the right entity structure, understand compliance
requirements, and navigate state-specific filing rules. Be concise, accurate, and
always recommend consulting a licensed attorney for final decisions.`;

// POST /api/ai/advise — free-form formation question
ai.post("/advise", async (c) => {
  const { question, context } = await c.req.json<{
    question: string;
    context?: { entity_type?: string; state?: string; business_name?: string };
  }>();

  if (!question) return c.json({ error: "question required" }, 400);

  const contextStr = context
    ? `Business context: ${JSON.stringify(context)}\n\n`
    : "";

  const response = await c.env.AI.run("@cf/meta/llama-3.1-8b-instruct", {
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user",   content: `${contextStr}${question}` },
    ],
    max_tokens: 512,
  });

  const answer = (response as { response?: string }).response ?? "";

  c.env.ANALYTICS.writeDataPoint({
    blobs: [c.get("orgId"), "ai_advise"],
    indexes: ["ai_usage"],
  });

  return c.json({ answer });
});

// POST /api/ai/recommend-entity — structured entity type recommendation
ai.post("/recommend-entity", async (c) => {
  const body = await c.req.json<{
    description: string;
    state: string;
    owners: number;
    liability_concern: boolean;
    tax_preference?: string;
  }>();

  if (!body.description || !body.state) {
    return c.json({ error: "description and state required" }, 400);
  }

  const prompt = `A business owner needs entity formation advice.
Business description: ${body.description}
State: ${body.state}
Number of owners: ${body.owners ?? 1}
Liability concern: ${body.liability_concern ? "Yes" : "No"}
Tax preference: ${body.tax_preference ?? "not specified"}

Recommend the best entity type (LLC, S-Corp, C-Corp, Sole Proprietorship, or Partnership).
Respond with JSON: { "recommendation": "...", "reason": "...", "pros": [...], "cons": [...] }`;

  const response = await c.env.AI.run("@cf/meta/llama-3.1-8b-instruct", {
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user",   content: prompt },
    ],
    max_tokens: 400,
  });

  const raw = (response as { response?: string }).response ?? "{}";
  let parsed: unknown = {};
  try { parsed = JSON.parse(raw.match(/\{[\s\S]*\}/)?.[0] ?? "{}"); } catch { parsed = { recommendation: raw }; }

  return c.json(parsed);
});

// GET /api/ai/compliance-summary/:caseId — plain-language compliance brief
ai.get("/compliance-summary/:caseId", async (c) => {
  const { caseId } = c.req.param();
  const orgId = c.get("orgId");

  const formationCase = await c.env.DB.prepare(
    "SELECT * FROM bizforma_cases WHERE id = ?1 AND org_id = ?2"
  ).bind(caseId, orgId).first<{ entity_type: string; state: string; business_name: string }>();

  if (!formationCase) return c.json({ error: "Case not found" }, 404);

  const events = await c.env.DB.prepare(
    "SELECT * FROM bizforma_compliance_events WHERE case_id = ?1 ORDER BY due_date ASC LIMIT 10"
  ).bind(caseId).all();

  const prompt = `Summarize upcoming compliance obligations for:
Entity: ${formationCase.entity_type} in ${formationCase.state}
Business: ${formationCase.business_name}
Upcoming events: ${JSON.stringify(events.results ?? [])}

Provide a brief plain-language summary of what the owner needs to do and when.`;

  const response = await c.env.AI.run("@cf/meta/llama-3.1-8b-instruct", {
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user",   content: prompt },
    ],
    max_tokens: 350,
  });

  return c.json({ summary: (response as { response?: string }).response ?? "" });
});
