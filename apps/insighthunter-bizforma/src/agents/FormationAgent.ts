// agents/formation-agent.ts — Durable Object: long-running formation workflow
import { DurableObject } from "cloudflare:workers";
import type { BizformaEnv, CaseStatus } from "../types.js";

type FormationState = {
  orgId: string;
  caseId: string;
  status: CaseStatus;
  lastUpdatedAt: string;
};

export class FormationAgent extends DurableObject<BizformaEnv> {
  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname.endsWith("/state") && request.method === "GET") {
      const state = (await this.ctx.storage.get<FormationState>("state")) ?? {};
      return Response.json({ state });
    }

    if (url.pathname.endsWith("/state") && request.method === "POST") {
      const body = await request.json<Partial<FormationState>>();
      if (!body.orgId || !body.caseId || !body.status) {
        return Response.json({ error: "orgId, caseId, and status are required" }, { status: 400 });
      }

      const nextState: FormationState = {
        orgId: body.orgId,
        caseId: body.caseId,
        status: body.status,
        lastUpdatedAt: new Date().toISOString()
      };
      await this.ctx.storage.put("state", nextState);
      return Response.json({ ok: true, state: nextState });
    }

    return Response.json({ error: "Not found" }, { status: 404 });
  }
}
