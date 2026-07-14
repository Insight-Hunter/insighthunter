// Compliance Calendar Service
// Generates compliance events from a formation case using state-specific rules.
// All dates are ISO strings. Events written to D1 compliance_events table.

import type { BizformaEnv } from "../types.js";

export interface ComplianceRule {
  event_type: string;
  title: string;
  description: string;
  offsetMonths: number; // months after formation date
  recurringMonths?: number; // if set, repeat every N months
}

// State-specific annual report due dates (months after fiscal year end = Dec 31)
const STATE_ANNUAL_REPORT_MONTH: Record<string, number> = {
  GA: 4,  // April
  DE: 3,  // March
  FL: 5,  // May
  TX: 5,
  CA: 3,
  NY: 3,
  WY: 1,
  NV: 1,
  CO: 4,
};

function getBaseRules(entityType: string, state: string, formedAt: string): ComplianceRule[] {
  const annualReportMonth = STATE_ANNUAL_REPORT_MONTH[state] ?? 4;
  const formedDate = new Date(formedAt);
  // Months until next annual report
  const monthsToAnnual = ((annualReportMonth - 1 - formedDate.getMonth()) + 12) % 12 || 12;

  const rules: ComplianceRule[] = [
    {
      event_type: "registered_agent_renewal",
      title: "Registered Agent Renewal",
      description: "Renew your registered agent service to maintain good standing.",
      offsetMonths: 11,
      recurringMonths: 12,
    },
    {
      event_type: "annual_report",
      title: `${state} Annual Report / Statement of Information`,
      description: `File your annual report with the ${state} Secretary of State to maintain active status.`,
      offsetMonths: monthsToAnnual,
      recurringMonths: 12,
    },
  ];

  if (entityType === "LLC" || entityType === "S-CORP" || entityType === "C-CORP") {
    rules.push({
      event_type: "tax_filing",
      title: "Federal Tax Return Due",
      description: entityType === "C-CORP"
        ? "Form 1120 — Corporate tax return due April 15 (or Oct 15 with extension)."
        : "Form 1065 / Schedule K-1 or 1120-S due March 15.",
      offsetMonths: entityType === "C-CORP" ? 4 : 3,
      recurringMonths: 12,
    });

    rules.push({
      event_type: "tax_filing",
      title: `${state} State Tax Return Due`,
      description: `File your ${state} state business tax return.`,
      offsetMonths: entityType === "C-CORP" ? 4 : 3,
      recurringMonths: 12,
    });
  }

  if (entityType === "LLC") {
    rules.push({
      event_type: "license_renewal",
      title: "Business License Renewal",
      description: "Renew city/county business license. Check local requirements.",
      offsetMonths: 12,
      recurringMonths: 12,
    });
  }

  return rules;
}

export async function seedComplianceCalendar(
  db: D1Database,
  caseId: string,
  tenantId: string,
  entityType: string,
  state: string,
  formedAt: string,
  yearsAhead = 2
): Promise<number> {
  const rules = getBaseRules(entityType, state, formedAt);
  const baseDate = new Date(formedAt);
  const cutoff = new Date(formedAt);
  cutoff.setFullYear(cutoff.getFullYear() + yearsAhead);

  const inserts: Promise<D1Result>[] = [];

  for (const rule of rules) {
    let dueDate = new Date(baseDate);
    dueDate.setMonth(dueDate.getMonth() + rule.offsetMonths);

    while (dueDate <= cutoff) {
      const id = crypto.randomUUID();
      inserts.push(
        db.prepare(
          `INSERT OR IGNORE INTO compliance_events
           (id, formation_case_id, tenant_id, event_type, title, description, due_date, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))`
        ).bind(
          id, caseId, tenantId,
          rule.event_type, rule.title, rule.description,
          dueDate.toISOString().split("T")[0]
        ).run()
      );

      if (!rule.recurringMonths) break;
      dueDate = new Date(dueDate);
      dueDate.setMonth(dueDate.getMonth() + rule.recurringMonths);
    }
  }

  await Promise.all(inserts);
  return inserts.length;
}

export async function getComplianceEvents(
  db: D1Database,
  caseId: string,
  tenantId: string,
  filter?: { status?: string; from?: string; to?: string }
): Promise<Record<string, unknown>[]> {
  let query = `SELECT * FROM compliance_events WHERE formation_case_id = ? AND tenant_id = ?`;
  const bindings: unknown[] = [caseId, tenantId];

  if (filter?.status) { query += " AND status = ?"; bindings.push(filter.status); }
  if (filter?.from)   { query += " AND due_date >= ?"; bindings.push(filter.from); }
  if (filter?.to)     { query += " AND due_date <= ?"; bindings.push(filter.to); }
  query += " ORDER BY due_date ASC";

  const stmt = db.prepare(query);
  const { results } = await stmt.bind(...bindings).all();
  return results as Record<string, unknown>[];
}

export async function markComplianceEventComplete(
  db: D1Database,
  eventId: string,
  tenantId: string
): Promise<boolean> {
  const result = await db.prepare(
    `UPDATE compliance_events SET status = 'completed', completed_at = datetime('now'), updated_at = datetime('now')
     WHERE id = ? AND tenant_id = ?`
  ).bind(eventId, tenantId).run();
  return (result.meta?.changes ?? 0) > 0;
}

export async function flagOverdueEvents(db: D1Database): Promise<number> {
  const today = new Date().toISOString().split("T")[0];
  const result = await db.prepare(
    `UPDATE compliance_events SET status = 'overdue', updated_at = datetime('now')
     WHERE status = 'pending' AND due_date < ?`
  ).bind(today).run();
  return result.meta?.changes ?? 0;
}
