import { DurableObject } from "cloudflare:workers";
import type { Env } from "../types/env";
import type { FormationCase } from "../types/formation";

type FormationAgentMessage =
  | { type: "get" }
  | { type: "update-stage"; stage: string; status?: string; progress?: number }
  | { type: "append-note"; note: string }
  | { type: "schedule-task"; task: Record<string, unknown> };

type FormationAgentState = {
  caseId: string;
  businessId: string;
  tenantId: string;
  stage: string;
  status: string;
  progress: number;
  notes: string[];
  tasks: Record<string, unknown>[];
  updatedAt: string;
};

export class FormationAgent extends DurableObject {
  constructor(
    private readonly ctx: DurableObjectState,
    private readonly env: Env,
  ) {
    super(ctx, env);
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);

    if (request.method === "GET" && url.pathname.endsWith("/state")) {
      const state = await this.getState();
      return Response.json(state);
    }

    if (request.method === "POST" && url.pathname.endsWith("/message")) {
      const message = (await request.json()) as FormationAgentMessage;
      const result = await this.handleMessage(message);
      return Response.json(result);
    }

    return new Response("Not found", { status: 404 });
  }

  private async getState(): Promise<FormationAgentState> {
    const existing = await this.ctx.storage.get<FormationAgentState>("formation-state");
    if (existing) return existing;

    const seeded: FormationAgentState = {
      caseId: this.ctx.id.toString(),
      businessId: "",
      tenantId: "",
      stage: "concept",
      status: "draft",
      progress: 0,
      notes: [],
      tasks: [],
      updatedAt: new Date().toISOString(),
    };

    await this.ctx.storage.put("formation-state", seeded);
    return seeded;
  }

  private async setState(next: FormationAgentState): Promise<FormationAgentState> {
    next.updatedAt = new Date().toISOString();
    await this.ctx.storage.put("formation-state", next);
    return next;
  }

  private async handleMessage(message: FormationAgentMessage): Promise<FormationAgentState> {
    const current = await this.getState();

    switch (message.type) {
      case "get":
        return current;

      case "update-stage":
        return this.setState({
          ...current,
          stage: message.stage,
          status: message.status ?? current.status,
          progress: message.progress ?? current.progress,
        });

      case "append-note":
        return this.setState({
          ...current,
          notes: [...current.notes, message.note],
        });

      case "schedule-task":
        return this.setState({
          ...current,
          tasks: [...current.tasks, message.task],
        });

      default:
        return current;
    }
  }

  async initializeFromCase(formationCase: FormationCase): Promise<void> {
    await this.setState({
      caseId: formationCase.id,
      businessId: formationCase.businessId,
      tenantId: formationCase.tenantId,
      stage: formationCase.stage,
      status: formationCase.status,
      progress: formationCase.progress ?? 0,
      notes: [],
      tasks: [],
      updatedAt: new Date().toISOString(),
    });
  }
}
