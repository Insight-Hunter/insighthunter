import type { Env } from "../types/env";
import { insertComplianceEvent, listComplianceEventsByBusiness } from "../db/queries";

function createId(prefix: string) {
  return `${prefix}_${crypto.randomUUID()}`;
}

export async function seedComplianceCalendar(
  env: Env,
  input: {
    tenantId: string;
    businessId: string;
    stateCode: string;
  },
) {
  const year = new Date().getUTCFullYear();

  const events = [
    {
      id: createId("ce"),
      tenantId: input.tenantId,
      businessId: input.businessId,
      eventType: "annual_report",
      title: `${input.stateCode} annual report`,
      dueDate: `${year}-04-01`,
    },
    {
      id: createId("ce"),
      tenantId: input.tenantId,
      businessId: input.businessId,
      eventType: "boi_review",
      title: "Beneficial ownership information review",
      dueDate: `${year}-06-15`,
    },
  ];

  for (const event of events) {
    await insertComplianceEvent(env.DB, event);
  }

  const doId = env.COMPLIANCE_AGENT.idFromName(input.businessId);
  const stub = env.COMPLIANCE_AGENT.get(doId);
  await stub.fetch("https://compliance-agent/generate", {
    method: "POST",
    body: JSON.stringify({
      businessId: input.businessId,
      tenantId: input.tenantId,
      events: events.map((event) => ({
        id: event.id,
        title: event.title,
        dueDate: event.dueDate,
        type: event.eventType,
        status: "pending",
      })),
    }),
  });

  return events;
}

export async function getComplianceDashboard(env: Env, businessId: string) {
  const events = await listComplianceEventsByBusiness(env.DB, businessId);
  return {
    businessId,
    total: events.length,
    upcoming: events,
  };
}
