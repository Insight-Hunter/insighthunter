import { DurableObject } from "cloudflare:workers";
import type { BizformaEnv } from "../types.js";

// FormationAgent — Durable Object coordinating long-running formation flows
// Persists state across async steps: SOS filing → EIN request → doc generation → compliance calendar seed
export interface FormationAgentState {
  caseId: string;
  tenantId: string;
  step: "idle" | "sos_filing" | "ein_request" | "doc_generation" | "compliance_seed" | "complete" | "error";
  lastUpdated: string;
  errorMessage?: string;
}

export class FormationAgent extends DurableObject<BizformaEnv> {
  private state: FormationAgentState = {
    caseId: "",
    tenantId: "",
    step: "idle",
    lastUpdated: new Date().toISOString(),
  };

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);

    if (request.method === "GET" && url.pathname === "/status") {
      const stored = await this.ctx.storage.get<FormationAgentState>("state");
      return Response.json(stored ?? this.state);
    }

    if (request.method === "POST" && url.pathname === "/start") {
      const body = await request.json<{ case_id: string; tenant_id: string }>();
      this.state = {
        caseId: body.case_id,
        tenantId: body.tenant_id,
        step: "sos_filing",
        lastUpdated: new Date().toISOString(),
      };
      await this.ctx.storage.put("state", this.state);

      // Kick off formation workflow asynchronously
      this.ctx.waitUntil(this.runFormationFlow());

      return Response.json({ started: true, state: this.state });
    }

    if (request.method === "POST" && url.pathname === "/advance") {
      const body = await request.json<{ next_step: FormationAgentState["step"]; data?: Record<string, unknown> }>();
      this.state.step = body.next_step;
      this.state.lastUpdated = new Date().toISOString();
      await this.ctx.storage.put("state", this.state);
      return Response.json({ advanced: true, state: this.state });
    }

    return new Response("Not Found", { status: 404 });
  }

  private async runFormationFlow(): Promise<void> {
    const steps: FormationAgentState["step"][] = [
      "sos_filing",
      "ein_request",
      "doc_generation",
      "compliance_seed",
      "complete",
    ];

    for (const step of steps) {
      try {
        this.state.step = step;
        this.state.lastUpdated = new Date().toISOString();
        await this.ctx.storage.put("state", this.state);

        // Sprint 5: each step calls the real external service (SOS API, IRS EIN, pdf generator)
        console.log(`[FormationAgent] caseId=${this.state.caseId} step=${step}`);

        // Simulated async work placeholder
        await new Promise((r) => setTimeout(r, 100));

        if (step === "complete") {
          await this.env.DB.prepare(
            `UPDATE formation_cases SET status = 'filed', filed_at = datetime('now') WHERE id = ? AND tenant_id = ?`
          ).bind(this.state.caseId, this.state.tenantId).run();
        }
      } catch (err) {
        this.state.step = "error";
        this.state.errorMessage = err instanceof Error ? err.message : "unknown_error";
        this.state.lastUpdated = new Date().toISOString();
        await this.ctx.storage.put("state", this.state);
        break;
      }
    }
  }
}
