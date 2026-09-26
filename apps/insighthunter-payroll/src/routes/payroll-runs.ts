// apps/insighthunter-payroll/src/routes/payroll-runs.ts  (relevant excerpt — POST handler updated)
// Approval now routes through the tax provider instead of the in-house
// calculator. The in-house calculator is retained ONLY for the unapproved
// "estimated" preview shown before submission (clearly labeled in the UI).

import { Hono } from "hono";
import type { Env } from "../index.js";
import { getSession } from "../index.js";
import { CheckPayrollProvider } from "../services/providers/check-provider.js";

export const payrollRunRoutes = new Hono<{ Bindings: Env }>();

// POST /api/payroll-runs/:id/approve — the ONLY path that pays employees
payrollRunRoutes.post("/:id/approve", async (c) => {
  const session = getSession(c.req.raw);
  if (!session) return c.json({ error: "unauthorized" }, 401);
  if (!["owner", "admin"].includes(session.role)) return c.json({ error: "forbidden" }, 403);

  const run = await c.env.DB.prepare(
    `SELECT * FROM payroll_runs WHERE id = ?1 AND org_id = ?2`
  ).bind(c.req.param("id"), session.orgId).first<{ id: string; period_start: string; period_end: string }>();
  if (!run) return c.json({ error: "Not found" }, 404);

  const lines = await c.env.DB.prepare(
    `SELECT employee_id, provider_employee_id, hours FROM payroll_run_lines WHERE run_id = ?1`
  ).bind(run.id).all<{ employee_id: string; provider_employee_id: string; hours: number }>();

  const missingOnboarding = (lines.results ?? []).filter((l) => !l.provider_employee_id);
  if (missingOnboarding.length > 0) {
    return c.json(
      { error: "employees_pending_onboarding", employeeIds: missingOnboarding.map((l) => l.employee_id) },
      409,
    );
  }

  const provider = new CheckPayrollProvider({ apiKey: c.env.CHECK_API_KEY });
  const result = await provider.submitRun({
    orgId: session.orgId,
    periodStart: run.period_start,
    periodEnd: run.period_end,
    lines: (lines.results ?? []).map((l) => ({ providerEmployeeId: l.provider_employee_id, hours: l.hours })),
  });

  await c.env.DB.prepare(
    `UPDATE payroll_runs SET status = ?1, provider_run_id = ?2, approved_at = ?3 WHERE id = ?4`
  ).bind(result.status, result.providerRunId, new Date().toISOString(), run.id).run();

  return c.json({ run: { ...run, status: result.status, provider_run_id: result.providerRunId } });
});

// POST /api/payroll-runs/webhook/check — receives async status updates from Check
payrollRunRoutes.post("/webhook/check", async (c) => {
  const signature = c.req.header("Check-Signature");
  if (!signature) return c.json({ error: "missing signature" }, 400);
  // TODO before go-live: verify HMAC signature per Check's webhook-signing docs
  const payload = await c.req.json<{ payroll_id: string; status: string }>();
  await c.env.DB.prepare(
    `UPDATE payroll_runs SET status = ?1 WHERE provider_run_id = ?2`
  ).bind(payload.status, payload.payroll_id).run();
  return c.json({ received: true });
});
