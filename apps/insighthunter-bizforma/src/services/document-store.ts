// services/document-store.ts — R2 document vault operations
import type { R2Bucket } from "@cloudflare/workers-types";

export interface DocumentMeta {
  id: string;
  case_id: string;
  org_id: string;
  doc_type: string; // articles_of_org | ein_letter | operating_agreement | boi | annual_report
  filename: string;
  r2_key: string;
  status: string; // pending | ready | archived
  created_at: string;
}

export async function uploadDocument(
  bucket: R2Bucket,
  key: string,
  body: ArrayBuffer,
  contentType: string,
) {
  await bucket.put(key, body, {
    httpMetadata: { contentType },
    customMetadata: { uploadedAt: new Date().toISOString() },
  });
}

export async function getSignedDownloadUrl(
  bucket: R2Bucket,
  key: string,
  expiresInSeconds = 3600,
): Promise<string> {
  // R2 presigned URLs via Workers
  const obj = await bucket.get(key);
  if (!obj) throw new Error(`Document not found: ${key}`);
  // Return a worker-proxied download endpoint instead of direct R2 URL
  return `/api/formation/documents/${encodeURIComponent(key)}/download`;
}

export async function deleteDocument(bucket: R2Bucket, key: string) {
  await bucket.delete(key);
}

export function buildR2Key(orgId: string, caseId: string, filename: string): string {
  return `${orgId}/${caseId}/${Date.now()}-${filename}`;
}
