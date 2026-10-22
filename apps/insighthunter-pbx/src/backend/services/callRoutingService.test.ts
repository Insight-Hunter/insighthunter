import { Hono } from "hono";
import { describe, expect, it } from "vitest";
import { callFlows } from "../routes/callFlows.js";
import { numbers } from "../routes/numbers.js";
import { createTestDb } from "../testing/d1.js";
import type { Env } from "../types.js";
import { isWithinBusinessHours } from "../utils/time.js";
import type { CallFlowDefinition } from "./callFlowValidation.js";
import { type StepContext, renderFlowFrom, resolveNext } from "./callRoutingService.js";

const def: CallFlowDefinition = {
  start: "hours",
  nodes: {
    hours: {
      type: "business_hours",
      timezone: "America/New_York",
      days: [1, 2, 3, 4, 5],
      open: "09:00",
      close: "17:00",
      openNext: "hello",
      closedNext: "vm",
    },
    hello: { type: "say", text: "Hi & welcome <you>", next: "menu" },
    menu: { type: "menu", prompt: "Press 1", options: { "1": "sales" }, timeoutNext: "vm" },
    sales: { type: "ring_extension", extension: "100", noAnswerNext: "vm" },
    vm: { type: "voicemail" },
  },
};

const open = new Date("2026-10-07T15:00:00Z"); // Wed 11:00 NY
const closed = new Date("2026-10-10T15:00:00Z"); // Sat

function ctx(now: Date, identity: string | null = "org-a:u1"): StepContext {
  return {
    orgId: "org-a",
    now,
    stepUrl: (node, kind) => `https://x.test/voice/flow?node=${node}&kind=${kind}`,
    voicemailAction: "/voice/recording-complete?org=org-a",
    clientIdentityFor: async () => identity,
  };
}

describe("business hours", () => {
  it("evaluates in the schedule timezone", () => {
    const hours = def.nodes["hours"] as Extract<
      (typeof def.nodes)[string],
      { type: "business_hours" }
    >;
    expect(isWithinBusinessHours(open, hours)).toBe(true);
    expect(isWithinBusinessHours(closed, hours)).toBe(false);
    expect(isWithinBusinessHours(new Date("2026-10-07T22:00:00Z"), hours)).toBe(false); // 18:00 NY
  });
});

describe("renderFlowFrom", () => {
  it("speaks escaped text and gathers digits when open", async () => {
    const xml = await renderFlowFrom(def, "hours", ctx(open));
    expect(xml).toContain("Hi &amp; welcome &lt;you&gt;");
    expect(xml).toContain("<Gather");
    expect(xml).toContain("kind=menu");
  });

  it("goes to voicemail when closed", async () => {
    expect(await renderFlowFrom(def, "hours", ctx(closed))).toContain("<Record");
  });

  it("dials the client identity and skips unknown extensions", async () => {
    expect(await renderFlowFrom(def, "sales", ctx(open))).toContain("<Client>org-a:u1</Client>");
    expect(await renderFlowFrom(def, "sales", ctx(open, null))).toContain("<Record");
  });

  it("hangs up on null and fails safe on missing nodes or loops", async () => {
    expect(await renderFlowFrom(def, null, ctx(open))).toContain("<Hangup/>");
    expect(await renderFlowFrom(def, "ghost", ctx(open))).toContain("could not connect");
    const loop: CallFlowDefinition = {
      start: "a",
      nodes: { a: { type: "say", text: "x", next: "a" } },
    };
    expect(await renderFlowFrom(loop, "a", ctx(open))).toContain("could not connect");
  });
});

describe("resolveNext", () => {
  it("maps digits, falls back on timeout/invalid, and ends on answered dial", () => {
    expect(resolveNext(def, "menu", "menu", { digits: "1" })).toBe("sales");
    expect(resolveNext(def, "menu", "menu", { digits: "9" })).toBe("vm");
    expect(resolveNext(def, "menu", "menu", {})).toBe("vm");
    expect(resolveNext(def, "sales", "dial", { dialStatus: "completed" })).toBeNull();
    expect(resolveNext(def, "sales", "dial", { dialStatus: "no-answer" })).toBe("vm");
    expect(resolveNext(def, "vm", "menu", {})).toBeNull();
  });
});

describe("number flow assignment", () => {
  it("requires a published flow owned by the tenant", async () => {
    const db = createTestDb();
    const app = new Hono<{ Bindings: Env }>();
    app.route("/api/numbers", numbers);
    app.route("/api/call-flows", callFlows);
    const call = (path: string, org: string, method = "GET", body?: unknown) =>
      app.request(
        path,
        {
          method,
          headers: {
            "Content-Type": "application/json",
            "X-User-Id": "u1",
            "X-Org-Id": org,
            "X-User-Role": "admin",
            "X-User-Email": "u@example.test",
          },
          ...(body === undefined ? {} : { body: JSON.stringify(body) }),
        },
        { DB: db } as unknown as Env,
      );

    await db
      .prepare(
        "INSERT INTO phone_numbers (org_id, phone_number, created_at) VALUES ('org-a', '+15551230000', 'now')",
      )
      .run();
    const created = (await (
      await call("/api/call-flows", "org-a", "POST", { name: "Main" })
    ).json()) as {
      item: { id: number };
    };
    const flowId = created.item.id;

    expect((await call("/api/numbers/1/flow", "org-a", "PUT", { flowId })).status).toBe(409);
    await call(`/api/call-flows/${flowId}/publish`, "org-a", "POST");
    expect((await call("/api/numbers/1/flow", "org-b", "PUT", { flowId })).status).toBe(404);
    expect((await call("/api/numbers/1/flow", "org-a", "PUT", { flowId })).status).toBe(200);
    expect((await call("/api/numbers/1/flow", "org-a", "PUT", { flowId: null })).status).toBe(200);
  });
});
