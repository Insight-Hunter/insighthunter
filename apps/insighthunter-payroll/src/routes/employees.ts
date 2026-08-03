// routes/employees.ts
// Employee CRUD — name, pay type (salary/hourly), rate, tax filing state.

import { Hono } from 'hono';
import type { Env } from '../index.js';
import { getSession } from '../index.js';

export const employeeRoutes = new Hono<{ Bindings: Env }>();

type EmployeeRow = {
  id: string; org_id: string; name: string; email: string | null;
  pay_type: string; pay_rate: number; state: string;
  filing_status: string; allowances: number; status: string;
  created_at: string;
};

// GET /api/employees
employeeRoutes.get('/', async (c) => {
  const session = getSession(c.req.raw);
  if (!session) return c.json({ error: 'unauthorized' }, 401);
  const result = await c.env.DB.prepare(
    `SELECT * FROM employees WHERE org_id = ?1 ORDER BY name ASC`
  ).bind(session.orgId).all<EmployeeRow>();
  return c.json({ employees: result.results ?? [] });
});

// GET /api/employees/:id
employeeRoutes.get('/:id', async (c) => {
  const session = getSession(c.req.raw);
  if (!session) return c.json({ error: 'unauthorized' }, 401);
  const row = await c.env.DB.prepare(
    `SELECT * FROM employees WHERE id = ?1 AND org_id = ?2`
  ).bind(c.req.param('id'), session.orgId).first<EmployeeRow>();
  if (!row) return c.json({ error: 'Not found' }, 404);

  const deductions = await c.env.DB.prepare(
    `SELECT * FROM employee_deductions WHERE employee_id = ?1 ORDER BY type ASC`
  ).bind(row.id).all();

  return c.json({ employee: row, deductions: deductions.results ?? [] });
});

// POST /api/employees
employeeRoutes.post('/', async (c) => {
  const session = getSession(c.req.raw);
  if (!session) return c.json({ error: 'unauthorized' }, 401);
  if (!['owner', 'admin'].includes(session.role)) return c.json({ error: 'forbidden' }, 403);

  const body = await c.req.json<{
    name: string; email?: string;
    pay_type: 'salary' | 'hourly'; pay_rate: number;
    state?: string; filing_status?: string; allowances?: number;
  }>();

  if (!body.name?.trim()) return c.json({ error: 'name required' }, 400);
  if (!['salary', 'hourly'].includes(body.pay_type)) return c.json({ error: 'pay_type must be salary or hourly' }, 400);
  if (body.pay_rate <= 0) return c.json({ error: 'pay_rate must be positive' }, 400);

  const id = crypto.randomUUID();
  await c.env.DB.prepare(`
    INSERT INTO employees (id, org_id, name, email, pay_type, pay_rate, state,
      filing_status, allowances, status, created_at)
    VALUES (?1,?2,?3,?4,?5,?6,?7,?8,?9,'active',datetime('now'))
  `).bind(id, session.orgId, body.name.trim(), body.email ?? null,
      body.pay_type, body.pay_rate, body.state ?? 'CA',
      body.filing_status ?? 'single', body.allowances ?? 0).run();

  return c.json({ id, name: body.name.trim(), status: 'active' }, 201);
});

// PATCH /api/employees/:id
employeeRoutes.patch('/:id', async (c) => {
  const session = getSession(c.req.raw);
  if (!session) return c.json({ error: 'unauthorized' }, 401);
  if (!['owner', 'admin'].includes(session.role)) return c.json({ error: 'forbidden' }, 403);

  const body = await c.req.json<{ name?: string; pay_rate?: number; status?: string; state?: string }>();
  const sets: string[] = [`updated_at = datetime('now')`];
  const binds: (string | number | null)[] = [];
  let p = 1;

  if (body.name     !== undefined) { sets.push(`name = ?${p++}`);     binds.push(body.name); }
  if (body.pay_rate !== undefined) { sets.push(`pay_rate = ?${p++}`); binds.push(body.pay_rate); }
  if (body.status   !== undefined) { sets.push(`status = ?${p++}`);   binds.push(body.status); }
  if (body.state    !== undefined) { sets.push(`state = ?${p++}`);    binds.push(body.state); }
  if (sets.length === 1) return c.json({ error: 'Nothing to update' }, 400);

  binds.push(c.req.param('id'), session.orgId);
  await c.env.DB.prepare(`UPDATE employees SET ${sets.join(', ')} WHERE id = ?${p++} AND org_id = ?${p++}`)
    .bind(...binds).run();
  return c.json({ ok: true });
});
