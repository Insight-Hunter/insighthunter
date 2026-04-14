import { DurableObject } from "cloudflare:workers";
import type { Env } from "../types/env";

type ComplianceEventItem = {
  id: string;
  title: string;
  dueDate: string;
  type: string;
  status: "pending" | "scheduled" | "completed" | "overdue";
};

type ComplianceState = {
  businessId: string;
  tenantId: string;
  reminders: ComplianceEventItem[];
  lastGeneratedAt: string | null;
  updatedAt: string;
};

export class ComplianceAgent extends DurableObject {
  constructor(
    private readonly ctx: DurableObjectState,
    private readonly env: Env,
  ) {
    super(ctx, env);
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);

    if (request.method === "GET" && url.pathname.endsWith("/state")) {
      return Response.json(await this.getState());
    }

    if (request.method === "POST" && url.pathname.endsWith("/generate")) {
      const body = await request.json<Record<string, unknown>>();
      const next = await this.generateCalendar(body);
      return Response.json(next);
    }

    if (request.method === "POST" && url.pathname.endsWith("/complete")) {
      const body = await request.json<{ id: string }>();
      const next = await this.markComplete(body.id);
      return Response.json(next);
    }

    return new Response("Not found", { status: 404 });
  }

  private async getState(): Promise<ComplianceState> {
    const existing = await this.ctx.storage.get<ComplianceState>("compliance-state");
    if (existing) return existing;

    const seeded: ComplianceState = {
      businessId: "",
      tenantId: "",
      reminders: [],
      lastGeneratedAt: null,
      updatedAt: new Date().toISOString(),
    };

    await this.ctx.storage.put("compliance-state", seeded);
    return seeded;
  }

  private async setState(next: ComplianceState): Promise<ComplianceState> {
    next.updatedAt = new Date().toISOString();
    await this.ctx.storage.put("compliance-state", next);
    return next;
  }

  private async generateCalendar(input: Record<string, unknown>): Promise<ComplianceState> {
    const state = await this.getState();
    const events = Array.isArray(input.events) ? (input.events as ComplianceEventItem[]) : [];

    return this.setState({
      ...state,
      businessId: String(input.businessId ?? state.businessId ?? ""),
      tenantId: String(input.tenantId ?? state.tenantId ?? ""),
      reminders: events,
      lastGeneratedAt: new Date().toISOString(),
    });
  }

  private async markComplete(id: string): Promise<ComplianceState> {
    const state = await this.getState();

    return this.setState({
      ...state,
      reminders: state.reminders.map((item) =>
        item.id === id ? { ...item, status: "completed" } : item,
      ),
    });
  }
}
