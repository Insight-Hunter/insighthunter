import { Hono } from "hono";
import type { AppBindings } from "../types.js";
import { badRequest, ok } from "../utils/http.js";
import { upsertRegisteredAgent } from "../services/registered-agent-service.js";

export const registeredAgent = new Hono<AppBindings>();

registeredAgent.post("/", async (c) => {
  const body = await c.req.json<{
    case_id: string;
    agent_name: string;
    agent_email?: string;
    agent_phone?: string;
    service_status?: string;
  }>();

  if (!body.case_id || !body.agent_name) return badRequest(c, "case_id and agent_name required");

  const id = await upsertRegisteredAgent(c.env, {
    org_id: c.get("orgId"),
    ...body
  });

  return ok(c, { ok: true, registered_agent_id: id }, 201);
});
