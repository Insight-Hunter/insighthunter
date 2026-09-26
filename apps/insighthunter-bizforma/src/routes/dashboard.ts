// routes/dashboard.ts — BizForma dashboard summary
import { Hono } from "hono";
import { listUpcomingEvents } from "../services/compliance-calendar.js";
import { listCasesByOrg } from "../services/formation.js";
import type { BizformaEnv } from "../types.js";

export const dashboard = new Hono<{ Bindings: BizformaEnv }>();

// GET /api/dashboard — full dashboard payload
dashboard.get("/", async (c) => {
  const orgId = c.get("orgId");

  const [cases, upcoming] = await Promise.all([
    listCasesByOrg(c.env.DB, orgId),
    listUpcomingEvents(c.env.DB, orgId, 30),
  ]);
  const casesWithStatus = cases as Array<{ status: string }>;
  const eventsWithStatus = upcoming as Array<{ status: string }>;

  const stats = {
    total: cases.length,
    active: casesWithStatus.filter((ca) => ca.status === "active").length,
    draft: casesWithStatus.filter((ca) => ca.status === "draft").length,
    filed: casesWithStatus.filter((ca) => ca.status === "filed").length,
    overdue: eventsWithStatus.filter((e) => e.status === "overdue").length,
    due_soon: upcoming.length,
  };

  return c.json({ stats, cases, upcoming_events: upcoming });
});
