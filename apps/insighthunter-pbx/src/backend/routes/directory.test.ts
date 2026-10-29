import { Hono } from "hono";
import { beforeEach, describe, expect, it } from "vitest";
import { createTestDb } from "../testing/d1.js";
import type { Env } from "../types.js";
import { departments } from "./departments.js";
import { employees } from "./employees.js";

let db: D1Database;
let app: Hono<{ Bindings: Env }>;

beforeEach(() => {
  db = createTestDb();
  app = new Hono<{ Bindings: Env }>();
  app.route("/api/departments", departments);
  app.route("/api/employees", employees);
});

function call(
  path: string,
  init: { method?: string; role?: string; org?: string; body?: unknown },
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

describe("departments", () => {
  it("creates, lists per tenant, and rejects duplicates", async () => {
    expect(
      (await call("/api/departments", { method: "POST", body: { name: "Sales" } })).status,
    ).toBe(201);
    expect(
      (await call("/api/departments", { method: "POST", body: { name: "Sales" } })).status,
    ).toBe(409);
    await call("/api/departments", { method: "POST", org: "org-b", body: { name: "Sales" } });

    const a = (await (await call("/api/departments", {})).json()) as { items: unknown[] };
    expect(a.items).toHaveLength(1);
  });

  it("requires owner/admin and a valid name", async () => {
    expect(
      (await call("/api/departments", { method: "POST", role: "member", body: { name: "X" } }))
        .status,
    ).toBe(403);
    expect((await call("/api/departments", { method: "POST", body: { name: " " } })).status).toBe(
      400,
    );
  });

  it("cannot delete another tenant's department or one in use", async () => {
    const created = (await (
      await call("/api/departments", { method: "POST", body: { name: "Sales" } })
    ).json()) as {
      item: { id: number };
    };
    const id = created.item.id;
    expect((await call(`/api/departments/${id}`, { method: "DELETE", org: "org-b" })).status).toBe(
      404,
    );

    await call("/api/employees", {
      method: "POST",
      body: { extension: "100", kind: "department", displayName: "Sales", departmentId: id },
    });
    expect((await call(`/api/departments/${id}`, { method: "DELETE" })).status).toBe(409);
  });
});

describe("extensions", () => {
  it("creates a user extension and enforces per-tenant uniqueness", async () => {
    const body = { extension: "101", kind: "user", displayName: "Ann", userId: "u9" };
    expect((await call("/api/employees", { method: "POST", body })).status).toBe(201);
    expect((await call("/api/employees", { method: "POST", body })).status).toBe(409);
    expect((await call("/api/employees", { method: "POST", org: "org-b", body })).status).toBe(201);
  });

  it("validates input", async () => {
    const post = (body: unknown) => call("/api/employees", { method: "POST", body });
    expect(
      (await post({ extension: "1", kind: "user", displayName: "A", userId: "u" })).status,
    ).toBe(400);
    expect((await post({ extension: "101", kind: "bogus", displayName: "A" })).status).toBe(400);
    expect((await post({ extension: "101", kind: "user", displayName: "A" })).status).toBe(400);
    expect((await post({ extension: "101", kind: "department", displayName: "A" })).status).toBe(
      400,
    );
  });

  it("rejects a department belonging to another tenant", async () => {
    const created = (await (
      await call("/api/departments", { method: "POST", org: "org-b", body: { name: "Ops" } })
    ).json()) as {
      item: { id: number };
    };
    const res = await call("/api/employees", {
      method: "POST",
      body: {
        extension: "200",
        kind: "department",
        displayName: "Ops",
        departmentId: created.item.id,
      },
    });
    expect(res.status).toBe(404);
  });

  it("deletes only within the tenant", async () => {
    const res = (await (
      await call("/api/employees", {
        method: "POST",
        body: { extension: "101", kind: "user", displayName: "Ann", userId: "u9" },
      })
    ).json()) as { item: { id: number } };
    expect(
      (await call(`/api/employees/${res.item.id}`, { method: "DELETE", org: "org-b" })).status,
    ).toBe(404);
    expect((await call(`/api/employees/${res.item.id}`, { method: "DELETE" })).status).toBe(204);
  });
});
