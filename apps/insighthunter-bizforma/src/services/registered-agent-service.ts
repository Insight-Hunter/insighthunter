import type { BizformaEnv } from "../types.js";
import { newId } from "../utils/ids.js";

export async function upsertRegisteredAgent(
  env: BizformaEnv,
  input: {
    org_id: string;
    case_id: string;
    agent_name: string;
    agent_email?: string;
    agent_phone?: string;
    service_status?: string;
  }
) {
  const existing = await env.BIZFORMA_DB.prepare(
    "SELECT id FROM bizforma_registered_agents WHERE org_id = ?1 AND case_id = ?2"
  ).bind(input.org_id, input.case_id).first<{ id: string }>();

  const now = new Date().toISOString();

  if (existing?.id) {
    await env.BIZFORMA_DB.prepare(`
      UPDATE bizforma_registered_agents
      SET agent_name = ?1, agent_email = ?2, agent_phone = ?3, service_status = ?4, updated_at = ?5
      WHERE id = ?6
    `).bind(
      input.agent_name,
      input.agent_email ?? null,
      input.agent_phone ?? null,
      input.service_status ?? "active",
      now,
      existing.id
    ).run();
    return existing.id;
  }

  const id = newId("ra");
  await env.BIZFORMA_DB.prepare(`
    INSERT INTO bizforma_registered_agents
      (id, org_id, case_id, agent_name, agent_email, agent_phone, service_status, created_at, updated_at)
    VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?8)
  `).bind(
    id,
    input.org_id,
    input.case_id,
    input.agent_name,
    input.agent_email ?? null,
    input.agent_phone ?? null,
    input.service_status ?? "active",
    now
  ).run();
  return id;
}
