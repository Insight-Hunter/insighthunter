// routes/compliance.ts — Compliance calendar events API
import { Hono } from "hono";
import type { BizformaEnv } from "../types.js";
import {
  listEventsByCase, listUpcomingEvents,
  createEvent, markEventComplete
} from "../services/compliance-calendar.js";

export const compliance = new Hono<{ Bindings: BizformaEnv }>();

// GET /api/compliance/upcoming — events due in next 30 days
compliance.get("/upcoming", async (c) => {
  const orgId = c.get("orgId");
  const days  = Number(c.req.query("days") ?? 30);
  const events = await listUpcomingEvents(c.env.DB, orgId, days);
  return c.json({ events });
});

// GET /api/compliance/case/:caseId
compliance.get("/case/:caseId", async (c) => {
  const { caseId } = c.req.param();
  const events = await listEventsByCase(c.env.DB, caseId);
  return c.json({ events });
});

// POST /api/compliance/case/:caseId — add a compliance event
compliance.post("/case/:caseId", async (c) => {
  const { caseId } = c.req.param();
  const orgId = c.get("orgId");
  const body  = await c.req.json<{
    event_type: string;
    title: string;
    due_date: string;
    notes?: string;
  }>();
  if (!body.event_type || !body.title || !body.due_date) {
    return c.json({ error: "event_type, title, due_date required" }, 400);
  }
  await createEvent(c.env.DB, {
    case_id: caseId, org_id: orgId,
    event_type: body.event_type,
    title: body.title,
    due_date: body.due_date,
    status: "pending",
    notes: body.notes,
  });
  return c.json({ ok: true }, 201);
});

// PATCH /api/compliance/events/:eventId/complete
compliance.patch("/events/:eventId/complete", async (c) => {
  const { eventId } = c.req.param();
  const { notes }   = await c.req.json<{ notes?: string }>();
  await markEventComplete(c.env.DB, eventId, notes);
  return c.json({ ok: true });
});
