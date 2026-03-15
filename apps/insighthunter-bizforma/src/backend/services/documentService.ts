import type { R2Bucket, D1Database, FormationDocument } from '../types';

export async function uploadDocument(
  db:     D1Database,
  r2:     R2Bucket,
  caseId: string,
  orgId:  string,
  file:   File,
): Promise<FormationDocument> {
  const id    = crypto.randomUUID();
  const key   = `formations/${orgId}/${caseId}/${id}-${file.name}`;
  const bytes = await file.arrayBuffer();
  const now   = new Date().toISOString();

  await r2.put(key, bytes, { httpMeta { contentType: file.type } });
  await db.prepare(
    `INSERT INTO formation_documents (id, case_id, name, r2_key, mime_type, size_bytes, uploaded_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  ).bind(id, caseId, file.name, key, file.type, file.size, now).run();

  return { id, caseId, name: file.name, r2Key: key, mimeType: file.type, sizeBytes: file.size, uploadedAt: now };
}
