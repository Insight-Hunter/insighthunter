import { Hono } from "hono";
import type { AppBindings } from "../types.js";
import { badRequest, notFound, ok } from "../utils/http.js";
import { aiAdviseSchema } from "../utils/validators.js";
import { advise, recommendEntity } from "../services/ai-service.js";
import { track } from "../utils/analytics.js";

export const ai = new Hono<AppBindings>();

ai.post("/advise", async (c) => {
  const parsed = aiAdviseSchema.safeParse(await c.req.json());
  if (!parsed.success) return badRequest(c, "Invalid payload", parsed.error.flatten());

  const answer = await advise(c.env, parsed.data);
  track(c.env, "ai_usage", c.get("orgId"), "ai_advise");
  return ok(c, { answer });
});

ai.post("/recommend-entity", async (c) => {
  const body = await c.req.json<{
    description: string;
    state: string;
    owners: number;
    liability_concern: boolean;
    tax_preference?: string;
  }>();

  if (!body.description || !body.state) return badRequest(c, "description and state required");

  const recommendation = await recommendEntity(c.env, body);
  return ok(c, recommendation);
});

ai.get("/compliance-summary/:caseId", async (c) => {
  const caseItem = await c.env.BIZFORMA_DB.prepare(
    "SELECT entity_type, state, business_name FROM bizforma_cases WHERE id = ?1 AND org_id = ?2"
  ).bind(c.req.param("caseId"), c.get("orgId")).first<{ entity_type: string; state: string; business_name: string }>();

  if (!caseItem) return notFound(c, "Case not found");

  const events = await c.env.BIZFORMA_DB.prepare(
    "SELECT * FROM bizforma_compliance_events WHERE case_id = ?1 AND org_id = ?2 ORDER BY due_date ASC LIMIT 10"
  ).bind(c.req.param("caseId"), c.get("orgId")).all();

  const answer = await advise(c.env, {
    question: `Summarize upcoming compliance obligations for ${caseItem.business_name}, a ${caseItem.entity_type} in ${caseItem.state}. Upcoming events: ${JSON.stringify(events.results ?? [])}`
  });

  return ok(c, { summary: answer });
});
