// routes/deductions.ts
// Per-employee deduction templates: health insurance, 401k, garnishments.

import { Hono } from "hono";
import type { Env } from "../index.js";
import { getSession } from "../index.js";

export const deductionRoutes = new Hono<{ Bindings: Env }>();

const VALID_TYPES = ["health_insurance", "401k", "dental", "vision", "garnishment", "other"];

// GET /api/deductions?employee_id=
deductionRoutes.get("/", async (c) => {
  const session = getSession(c.req.raw);
  if (!session) return c.json({ error: "unauthorized" }, 401);
  const empId = c.req.query("employee_id");
  if (!empId) return c.json({ error: "employee_id required" }, 400);

  // Verify employee belongs to org
  const emp = await c.env.DB.prepare(`SELECT id FROM employees WHERE id = ?1 AND org_id = ?2`)
    .bind(empId, session.orgId)
    .first();
  if (!emp) return c.json({ error: "Employee not found" }, 404);

  const result = await c.env.DB.prepare(
    `SELECT * FROM employee_deductions WHERE employee_id = ?1 ORDER BY type ASC`,
  )
    .bind(empId)
    .all();
  return c.json({ deductions: result.results ?? [] });
});

// POST /api/deductions
deductionRoutes.post("/", async (c) => {
  const session = getSession(c.req.raw);
  if (!session) return c.json({ error: "unauthorized" }, 401);
  if (!["owner", "admin"].includes(session.role)) return c.json({ error: "forbidden" }, 403);

  const body = await c.req.json<{
    employee_id: string;
    type: string;
    amount: number;
    is_percent?: boolean;
    description?: string;
  }>();

  if (!body.employee_id) return c.json({ error: "employee_id required" }, 400);
  if (!VALID_TYPES.includes(body.type))
    return c.json({ error: `type must be one of: ${VALID_TYPES.join(", ")}` }, 400);
  if (body.amount <= 0) return c.json({ error: "amount must be positive" }, 400);

  // Verify employee belongs to org
  const emp = await c.env.DB.prepare(`SELECT id FROM employees WHERE id = ?1 AND org_id = ?2`)
    .bind(body.employee_id, session.orgId)
    .first();
  if (!emp) return c.json({ error: "Employee not found" }, 404);

  const id = crypto.randomUUID();
  await c.env.DB.prepare(`
    INSERT INTO employee_deductions (id, employee_id, type, amount, is_percent, description, active, created_at)
    VALUES (?1,?2,?3,?4,?5,?6,1,datetime('now'))
  `)
    .bind(
      id,
      body.employee_id,
      body.type,
      body.amount,
      body.is_percent ? 1 : 0,
      body.description ?? null,
    )
    .run();

  return c.json({ id, type: body.type, amount: body.amount }, 201);
});

// PATCH /api/deductions/:id — update amount or toggle active
deductionRoutes.patch("/:id", async (c) => {
  const session = getSession(c.req.raw);
  if (!session) return c.json({ error: "unauthorized" }, 401);
  if (!["owner", "admin"].includes(session.role)) return c.json({ error: "forbidden" }, 403);

  const body = await c.req.json<{ amount?: number; active?: boolean }>();
  const sets: string[] = [];
  const binds: (string | number)[] = [];
  let p = 1;
  if (body.amount !== undefined) {
    sets.push(`amount = ?${p++}`);
    binds.push(body.amount);
  }
  if (body.active !== undefined) {
    sets.push(`active = ?${p++}`);
    binds.push(body.active ? 1 : 0);
  }
  if (!sets.length) return c.json({ error: "Nothing to update" }, 400);

  binds.push(c.req.param("id"));
  await c.env.DB.prepare(`UPDATE employee_deductions SET ${sets.join(", ")} WHERE id = ?${p++}`)
    .bind(...binds)
    .run();
  return c.json({ ok: true });
});

// DELETE /api/deductions/:id
deductionRoutes.delete("/:id", async (c) => {
  const session = getSession(c.req.raw);
  if (!session) return c.json({ error: "unauthorized" }, 401);
  if (!["owner", "admin"].includes(session.role)) return c.json({ error: "forbidden" }, 403);
  await c.env.DB.prepare(`DELETE FROM employee_deductions WHERE id = ?1`)
    .bind(c.req.param("id"))
    .run();
  return c.json({ ok: true });
});
