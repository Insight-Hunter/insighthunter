import { Hono } from "hono";
import { beforeEach, describe, expect, it } from "vitest";
import { validateCallFlow } from "../services/callFlowValidation.js";
import { createTestDb } from "../testing/d1.js";
import type { Env } from "../types.js";
import { callFlows } from "./callFlows.js";
import { employees } from "./employees.js";

let db: D1Database;
let app: Hono<{ Bindings: Env }>;

beforeEach(() => {
  db = createTestDb();
  app = new Hono<{ Bindings: Env }>();
  app.route("/api/call-flows", callFlows);
  app.route("/api/employees", employees);
});

function call(
  path: string,
  init: { method?: string; role?: string; org?: string; body?: unknown } = {},
) {
  return app.request(
    path,
    {
      method: init.method ?? "GET",
      headers: {
        "Content-Type": "application/json",
        "X-User-Id": "u1",
        "X-Org-Id": init.org ?? "org-a",
        "X-User-Role": init.role ?? "admin",
        "X-User-Email": "u@example.test",
      },
      ...(init.body === undefined ? {} : { body: JSON.stringify(init.body) }),
    },
    { DB: db } as unknown as Env,
  );
}

const goodFlow = {
  start: "hours",
  nodes: {
    hours: {
      type: "business_hours",
      timezone: "America/New_York",
      days: [1, 2, 3, 4, 5],
      open: "09:00",
      close: "17:00",
      openNext: "menu",
      closedNext: "vm",
    },
    menu: {
      type: "menu",
      prompt: "Press 1 for sales",
      options: { "1": "sales" },
      timeoutNext: "vm",
    },
    sales: { type: "ring_extension", extension: "100", noAnswerNext: "vm" },
    vm: { type: "voicemail" },
  },
};

describe("validateCallFlow", () => {
  it("accepts a good flow", () => {
    expect(validateCallFlow(goodFlow, new Set(["100"]))).toEqual([]);
  });

  it("reports dangling edges, unreachable nodes, unknown extensions and loops", () => {
    const codes = (d: unknown, ext?: Set<string>) => validateCallFlow(d, ext).map((i) => i.code);
    expect(codes({ start: "a", nodes: { a: { type: "say", text: "hi", next: "zzz" } } })).toContain(
      "dangling_edge",
    );
    expect(
      codes({ start: "a", nodes: { a: { type: "hangup" }, b: { type: "hangup" } } }),
    ).toContain("unreachable");
    expect(codes(goodFlow, new Set())).toContain("unknown_extension");
    expect(codes({ start: "a", nodes: { a: { type: "say", text: "x", next: "a" } } })).toContain(
      "no_termination",
    );
    expect(codes("nope")).toEqual(["invalid_definition"]);
  });
});

describe("call flow lifecycle", () => {
  async function createFlow(org = "org-a") {
    const res = await call("/api/call-flows", { method: "POST", org, body: { name: "Main" } });
    return ((await res.json()) as { item: { id: number } }).item.id;
  }

  it("creates a draft, blocks invalid publish, then publishes a valid flow", async () => {
    await call("/api/employees", {
      method: "POST",
      body: { extension: "100", kind: "user", displayName: "Ann", userId: "u9" },
    });
    const id = await createFlow();

    await call(`/api/call-flows/${id}/draft`, {
      method: "PUT",
      body: { definition: { start: "a", nodes: { a: { type: "say", text: "x", next: "nope" } } } },
    });
    expect((await call(`/api/call-flows/${id}/publish`, { method: "POST" })).status).toBe(422);

    await call(`/api/call-flows/${id}/draft`, { method: "PUT", body: { definition: goodFlow } });
    const published = await call(`/api/call-flows/${id}/publish`, { method: "POST" });
    expect(published.status).toBe(200);
    expect(
      ((await published.json()) as { item: { publishedVersion: number } }).item.publishedVersion,
    ).toBe(1);
    expect((await call(`/api/call-flows/${id}/publish`, { method: "POST" })).status).toBe(409);
  });

  it("versions edits after publish and rolls back", async () => {
    const id = await createFlow();
    await call(`/api/call-flows/${id}/publish`, { method: "POST" }); // default flow is valid: v1
    const draft = await call(`/api/call-flows/${id}/draft`, {
      method: "PUT",
      body: { definition: { start: "h", nodes: { h: { type: "hangup" } } } },
    });
    expect(((await draft.json()) as { item: { draftVersion: number } }).item.draftVersion).toBe(2);
    await call(`/api/call-flows/${id}/publish`, { method: "POST" });

    const rb = await call(`/api/call-flows/${id}/rollback`, {
      method: "POST",
      body: { version: 1 },
    });
    expect(rb.status).toBe(200);
    const detail = (await (await call(`/api/call-flows/${id}`)).json()) as {
      item: { publishedVersion: number; versions: unknown[] };
    };
    expect(detail.item.publishedVersion).toBe(1);
    expect(detail.item.versions).toHaveLength(2);
    expect(
      (await call(`/api/call-flows/${id}/rollback`, { method: "POST", body: { version: 9 } }))
        .status,
    ).toBe(404);
  });

  it("enforces roles and tenant isolation", async () => {
    const id = await createFlow();
    expect(
      (await call("/api/call-flows", { method: "POST", role: "member", body: { name: "X" } }))
        .status,
    ).toBe(403);
    expect((await call(`/api/call-flows/${id}`, { org: "org-b" })).status).toBe(404);
    expect(
      (await call(`/api/call-flows/${id}/publish`, { method: "POST", org: "org-b" })).status,
    ).toBe(404);
    expect(
      (
        await call(`/api/call-flows/${id}/draft`, {
          method: "PUT",
          org: "org-b",
          body: { definition: goodFlow },
        })
      ).status,
    ).toBe(404);
    expect((await call("/api/call-flows", { method: "POST", body: { name: "Main" } })).status).toBe(
      409,
    );
  });
});
