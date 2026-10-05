import { Hono } from "hono";
import type { AppBindings } from "../types.js";
import { badRequest, ok } from "../utils/http.js";
import { upsertEinApplication } from "../services/ein-service.js";

export const ein = new Hono<AppBindings>();

ein.post("/", async (c) => {
  const body = await c.req.json<{
    case_id: string;
    ss4_json: string;
    status?: string;
  }>();

  if (!body.case_id || !body.ss4_json) return badRequest(c, "case_id and ss4_json required");

  const einId = await upsertEinApplication(c.env, {
    case_id: body.case_id,
    org_id: c.get("orgId"),
    ss4_json: body.ss4_json,
    status: body.status ?? "draft"
  });

  return ok(c, { ok: true, ein_application_id: einId }, 201);
});
