import type { BizformaEnv } from "../types.js";
import { newId } from "../utils/ids.js";

export async function createSignatureRequest(
  env: BizformaEnv,
  input: {
    org_id: string;
    case_id: string;
    signer_name: string;
    signer_email: string;
    document_id?: string;
  }
) {
  const id = newId("sig");
  const now = new Date().toISOString();
  await env.BIZFORMA_DB.prepare(`
    INSERT INTO bizforma_signatures
      (id, org_id, case_id, document_id, signer_name, signer_email, status, created_at, updated_at)
    VALUES (?1, ?2, ?3, ?4, ?5, ?6, 'pending', ?7, ?7)
  `).bind(
    id,
    input.org_id,
    input.case_id,
    input.document_id ?? null,
    input.signer_name,
    input.signer_email,
    now
  ).run();
  return id;
}
