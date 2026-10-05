import { DurableObject } from "cloudflare:workers";
import type { BizformaEnv } from "../types.js";

type ReminderState = {
  lastRunAt?: string;
  lastOrgId?: string;
  lastEventId?: string;
  lastStatus?: "pending" | "completed";
};

export class ComplianceAgent extends DurableObject<BizformaEnv> {
  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname.endsWith("/ping")) {
      const state = (await this.ctx.storage.get<ReminderState>("state")) ?? {};
      return Response.json({ ok: true, state });
    }

    if (url.pathname.endsWith("/run") && request.method === "POST") {
      const payload = await request.json<ReminderState>();
      const nextState = {
        ...payload,
        lastRunAt: new Date().toISOString()
      };
      await this.ctx.storage.put("state", nextState);
      return Response.json({ ok: true, state: nextState });
    }

    if (url.pathname.endsWith("/events") && request.method === "POST") {
      const payload = await request.json<{
        orgId?: string;
        caseId?: string;
        eventId?: string;
        status?: "pending" | "completed";
        dueDate?: string;
      }>();
      if (!payload.orgId || !payload.caseId || !payload.eventId || !payload.status) {
        return Response.json({ error: "orgId, caseId, eventId, and status are required" }, { status: 400 });
      }

      const eventState = {
        orgId: payload.orgId,
        caseId: payload.caseId,
        eventId: payload.eventId,
        status: payload.status,
        dueDate: payload.dueDate,
        updatedAt: new Date().toISOString()
      };
      await this.ctx.storage.put(`event:${payload.eventId}`, eventState);

      const previousState = (await this.ctx.storage.get<ReminderState>("state")) ?? {};
      const nextState: ReminderState = {
        ...previousState,
        lastOrgId: payload.orgId,
        lastEventId: payload.eventId,
        lastStatus: payload.status
      };
      await this.ctx.storage.put("state", nextState);
      return Response.json({ ok: true, state: eventState });
    }

    return Response.json({ error: "Not found" }, { status: 404 });
  }
}
