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

  type Case = { status: string };
  const stats = {
    total: cases.length,
    active: cases.filter((ca: Case) => ca.status === "active").length,
    draft: cases.filter((ca: Case) => ca.status === "draft").length,
    filed: cases.filter((ca: Case) => ca.status === "filed").length,
    overdue: upcoming.filter((e: { status: string }) => e.status === "overdue").length,
    due_soon: upcoming.length,
  };

  return c.json({ stats, cases, upcoming_events: upcoming });
});
