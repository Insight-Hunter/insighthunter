import { Hono } from "hono";
import type { AppBindings } from "../types.js";
import { ok } from "../utils/http.js";
import { getDashboardPayload } from "../services/dashboard-service.js";

export const dashboard = new Hono<AppBindings>();

dashboard.get("/", async (c) => {
  const payload = await getDashboardPayload(c.env, c.get("orgId"));
  return ok(c, payload);
});
