// agents/formation-agent.ts — Durable Object: long-running formation workflow
import { DurableObject } from "cloudflare:workers";
import type { BizformaEnv } from "../types.js";

interface AgentState {
  caseId: string;
  orgId: string;
  step: string;
  history: Array<{ ts: string; event: string; data?: unknown }>;
  createdAt: string;
}

export class FormationAgent extends DurableObject<BizformaEnv> {
  private state: AgentState | null = null;

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);

    switch (url.pathname) {
      case "/init":
        return this.handleInit(request);
      case "/advance":
        return this.handleAdvance(request);
      case "/status":
        return this.handleStatus();
      default:
        return new Response("Not found", { status: 404 });
    }
  }

  private async handleInit(request: Request): Promise<Response> {
    if (this.state) {
      return Response.json({ ok: false, error: "Agent already initialized", state: this.state });
    }
    const { caseId, orgId } = await request.json<{ caseId: string; orgId: string }>();
    this.state = {
      caseId,
      orgId,
      step: "intake",
      history: [{ ts: new Date().toISOString(), event: "agent_initialized" }],
      createdAt: new Date().toISOString(),
    };
    await this.ctx.storage.put("state", this.state);
    return Response.json({ ok: true, state: this.state });
  }

  private async handleAdvance(request: Request): Promise<Response> {
    if (!this.state) {
      this.state = (await this.ctx.storage.get<AgentState>("state")) ?? null;
    }
    if (!this.state) return Response.json({ error: "Not initialized" }, { status: 400 });

    const { event, data } = await request.json<{ event: string; data?: unknown }>();
    this.state.history.push({ ts: new Date().toISOString(), event, data });
    this.state.step = this.nextStep(this.state.step, event);
    await this.ctx.storage.put("state", this.state);

    return Response.json({ ok: true, step: this.state.step });
  }

  private async handleStatus(): Promise<Response> {
    if (!this.state) {
      this.state = (await this.ctx.storage.get<AgentState>("state")) ?? null;
    }
    return Response.json({ state: this.state });
  }

  private nextStep(current: string, event: string): string {
    const flow: Record<string, Record<string, string>> = {
      intake: { submit: "name_check" },
      name_check: { approved: "document_prep", rejected: "intake" },
      document_prep: { ready: "filing" },
      filing: { submitted: "pending_state", rejected: "document_prep" },
      pending_state: { approved: "active", rejected: "filing" },
      active: {},
    };
    return flow[current]?.[event] ?? current;
  }
}
