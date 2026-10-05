import type { BizformaEnv } from "../types.js";
import { newId } from "../utils/ids.js";

export async function createLicense(
  env: BizformaEnv,
  input: {
    case_id: string;
    org_id: string;
    name: string;
    issuing_authority?: string;
    renewal_date?: string;
    status?: string;
  }
) {
  const id = newId("lic");
  const now = new Date().toISOString();
  await env.BIZFORMA_DB.prepare(`
    INSERT INTO bizforma_licenses
      (id, case_id, org_id, name, issuing_authority, renewal_date, status, created_at, updated_at)
    VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?8)
  `).bind(
    id,
    input.case_id,
    input.org_id,
    input.name,
    input.issuing_authority ?? null,
    input.renewal_date ?? null,
    input.status ?? "pending",
    now
  ).run();
  return id;
}

export async function listLicensesByOrg(env: BizformaEnv, orgId: string) {
  const result = await env.BIZFORMA_DB.prepare(
    "SELECT * FROM bizforma_licenses WHERE org_id = ?1 ORDER BY renewal_date ASC"
  ).bind(orgId).all();
  return result.results ?? [];
}
