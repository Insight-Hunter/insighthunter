import type { BizformaEnv } from "../types.js";
import { newId } from "../utils/ids.js";
import { safeFilename } from "../utils/security.js";

export function buildR2Key(orgId: string, caseId: string, filename: string): string {
  return `${orgId}/${caseId}/${Date.now()}-${safeFilename(filename)}`;
}

export async function createDocumentRecord(
  env: BizformaEnv,
  input: {
    case_id: string;
    org_id: string;
    doc_type: string;
    filename: string;
    r2_key: string;
    uploaded_by?: string | null;
  }
) {
  const id = newId("doc");
  const now = new Date().toISOString();
  await env.BIZFORMA_DB.prepare(`
    INSERT INTO bizforma_documents
      (id, case_id, org_id, doc_type, filename, r2_key, status, uploaded_by, created_at, updated_at)
    VALUES (?1, ?2, ?3, ?4, ?5, ?6, 'pending', ?7, ?8, ?8)
  `)
    .bind(
      id,
      input.case_id,
      input.org_id,
      input.doc_type,
      input.filename,
      input.r2_key,
      input.uploaded_by ?? null,
      now
    )
    .run();
  return id;
}

export async function uploadDocumentObject(
  env: BizformaEnv,
  key: string,
  body: ArrayBuffer,
  contentType: string
) {
  await env.BIZFORMA_DOCUMENTS.put(key, body, {
    httpMetadata: { contentType }
  });
}

export async function listDocumentsByCase(env: BizformaEnv, caseId: string, orgId: string) {
  const result = await env.BIZFORMA_DB.prepare(
    "SELECT * FROM bizforma_documents WHERE case_id = ?1 AND org_id = ?2 ORDER BY created_at DESC"
  ).bind(caseId, orgId).all();
  return result.results ?? [];
}

export async function getDocumentById(env: BizformaEnv, id: string, orgId: string) {
  return env.BIZFORMA_DB.prepare(
    "SELECT * FROM bizforma_documents WHERE id = ?1 AND org_id = ?2"
  ).bind(id, orgId).first();
}
