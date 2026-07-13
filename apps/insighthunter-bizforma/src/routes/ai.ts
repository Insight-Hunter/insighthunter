import { Hono } from "hono";
import type { BizformaEnv } from "../types.js";
import type { AuthContext } from "../middleware/auth.js";
import {
  getEntityRecommendation,
  getNameSuggestions,
  getOperatingAgreementClauses,
} from "../services/ai-advisor.js";

type HonoEnv = { Bindings: BizformaEnv; Variables: { auth: AuthContext } };

const ai = new Hono<HonoEnv>();

// POST /api/ai/entity-recommendation
ai.post("/entity-recommendation", async (c) => {
  const { tenantId, userId } = c.get("auth");
  const body = await c.req.json<{
    state: string;
    business_type: string;
    owners: number;
    annual_revenue?: number;
    employees?: number;
    raise_investment?: boolean;
  }>();

  if (!body.state || !body.business_type || !body.owners) {
    return c.json({ error: "missing_required_fields", required: ["state", "business_type", "owners"] }, 400);
  }

  const result = await getEntityRecommendation(c.env, body);

  c.env.ANALYTICS.writeDataPoint({
    blobs: [tenantId, userId, body.state, body.business_type, result.recommendation],
    indexes: ["ai_entity_recommendation"],
  });

  return c.json({
    ...result,
    disclaimer: "This is not legal or tax advice. Consult a licensed attorney or CPA.",
  });
});

// POST /api/ai/name-suggestions
ai.post("/name-suggestions", async (c) => {
  const { tenantId, userId } = c.get("auth");
  const body = await c.req.json<{
    keywords: string[];
    state: string;
    entity_type: string;
    industry?: string;
  }>();

  if (!body.keywords?.length || !body.state || !body.entity_type) {
    return c.json({ error: "missing_required_fields", required: ["keywords", "state", "entity_type"] }, 400);
  }

  const result = await getNameSuggestions(c.env, body);

  c.env.ANALYTICS.writeDataPoint({
    blobs: [tenantId, userId, body.state, body.entity_type],
    indexes: ["ai_name_suggestions"],
  });

  return c.json(result);
});

// POST /api/ai/operating-agreement-clauses
ai.post("/operating-agreement-clauses", async (c) => {
  const { tenantId } = c.get("auth");
  const body = await c.req.json<{
    entity_type: string;
    state: string;
    owners: number;
    business_name: string;
  }>();

  if (!body.entity_type || !body.state || !body.owners || !body.business_name) {
    return c.json({ error: "missing_required_fields", required: ["entity_type", "state", "owners", "business_name"] }, 400);
  }

  const result = await getOperatingAgreementClauses(c.env, body);

  c.env.ANALYTICS.writeDataPoint({
    blobs: [tenantId, body.state, body.entity_type],
    indexes: ["ai_oa_clauses"],
  });

  return c.json(result);
});

export { ai };
