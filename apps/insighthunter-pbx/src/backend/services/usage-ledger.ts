// Append-only usage ledger. Provider usage/events are inputs to this ledger;
// it — not the vendor record — is the Insight Hunter billing source of truth
// (docs/insight-pbx-master-prompt.md §5.2, "Important implementation guardrails").

export interface UsageEventInput {
  orgId: string;
  eventType: string;
  resourceType: string;
  resourceId?: string | null;
  quantity: number;
  unit: string;
  provider?: string;
}

export async function recordUsageEvent(db: D1Database, event: UsageEventInput) {
  await db
    .prepare(
      `INSERT INTO usage_ledger (org_id, event_type, resource_type, resource_id, quantity, unit, provider, occurred_at)
       VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)`,
    )
    .bind(
      event.orgId,
      event.eventType,
      event.resourceType,
      event.resourceId ?? null,
      event.quantity,
      event.unit,
      event.provider ?? "twilio",
      new Date().toISOString(),
    )
    .run();
}
