import type { Env } from '../types/env';

export type DocumentCreateInput = {
  tenantId: string;
  businessId: string;
  createdBy: string;
  kind: string;
  fileName: string;
  objectKey: string;
  contentType: string;
  status: string;
  sizeBytes: number;
};

export async function createDocumentRecord(env: Env, input: DocumentCreateInput) {
  const id = crypto.randomUUID();
  await env.DB.prepare(
    `insert into formation_documents
    (id, tenant_id, business_id, created_by, kind, file_name, object_key, content_type, status, size_bytes, created_at, updated_at)
    values (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, datetime('now'), datetime('now'))`
  ).bind(
    id,
    input.tenantId,
    input.businessId,
    input.createdBy,
    input.kind,
    input.fileName,
    input.objectKey,
    input.contentType,
    input.status,
    input.sizeBytes,
  ).run();
  return { id, ...input };
}

export async function markDocumentGenerated(env: Env, documentId: string, sizeBytes: number) {
  await env.DB.prepare(
    `update formation_documents set status = 'ready', size_bytes = ?2, updated_at = datetime('now') where id = ?1`
  ).bind(documentId, sizeBytes).run();
}

export async function markDocumentFailed(env: Env, documentId: string) {
  await env.DB.prepare(
    `update formation_documents set status = 'failed', updated_at = datetime('now') where id = ?1`
  ).bind(documentId).run();
}

export async function getDocumentById(env: Env, tenantId: string, documentId: string) {
  return env.DB.prepare(
    `select id, tenant_id, business_id, kind, file_name, object_key, content_type, status, size_bytes, created_at, updated_at
     from formation_documents where id = ?1 and tenant_id = ?2 limit 1`
  ).bind(documentId, tenantId).first();
}

export async function listDocumentsByBusiness(env: Env, tenantId: string, businessId: string) {
  const result = await env.DB.prepare(
    `select id, kind, file_name, object_key, content_type, status, size_bytes, created_at, updated_at
     from formation_documents where tenant_id = ?1 and business_id = ?2 order by created_at desc`
  ).bind(tenantId, businessId).all();
  return result.results;
}
