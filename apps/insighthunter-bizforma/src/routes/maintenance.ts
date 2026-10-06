import { Hono } from "hono";
import type { AppBindings } from "../types.js";
import { badRequest, ok } from "../utils/http.js";
import { createMaintenanceEvent } from "../services/maintenance-service.js";

export const maintenance = new Hono<AppBindings>();

maintenance.post("/", async (c) => {
  const body = await c.req.json<{
    case_id: string;
    event_type: string;
    title: string;
    due_date?: string;
    notes?: string;
  }>();

  if (!body.case_id || !body.event_type || !body.title) {
    return badRequest(c, "case_id, event_type, title required");
  }

  const eventId = await createMaintenanceEvent(c.env, {
    org_id: c.get("orgId"),
    ...body
  });

  return ok(c, { ok: true, maintenance_event_id: eventId }, 201);
});
