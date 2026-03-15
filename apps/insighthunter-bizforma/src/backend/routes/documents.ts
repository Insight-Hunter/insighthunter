import { Hono }           from 'hono';
import { uploadDocument } from '../services/documentService';
import type { Env, AuthContext } from '../types';

export const documentRoutes = new Hono<{ Bindings: Env; Variables: { auth: AuthContext } }>();

// GET /api/documents/:caseId
documentRoutes.get('/:caseId', async c => {
  const caseId = c.req.param('caseId');
  const rows   = await c.env.DB.prepare(
    `SELECT * FROM formation_documents WHERE case_id = ? ORDER BY uploaded_at DESC`
  ).bind(caseId).all();
  return c.json({  rows.results });
});

// POST /api/documents/:caseId/upload
documentRoutes.post('/:caseId/upload', async c => {
  const { orgId, userId } = c.get('auth');
  const caseId            = c.req.param('caseId');
  const formData          = await c.req.formData();
  const file              = formData.get('file') as File;
  if (!file) return c.json({ error: 'No file' }, 400);

  const doc = await uploadDocument(c.env.DB, c.env.R2, caseId, orgId, file);
  await c.env.DOCUMENT_QUEUE.send({ caseId, docId: doc.id, orgId, action: 'process' });
  return c.json({  doc }, 201);
});

// GET /api/documents/:caseId/:docId/url — presigned R2 URL
documentRoutes.get('/:caseId/:docId/url', async c => {
  const docId = c.req.param('docId');
  const row   = await c.env.DB.prepare(
    `SELECT r2_key FROM formation_documents WHERE id = ?`
  ).bind(docId).first<{ r2_key: string }>();
  if (!row) return c.json({ error: 'Not found' }, 404);

  // R2 presigned URL (Workers R2 signed URL support)
  const url = await c.env.R2.createPresignedUrl?.(row.r2_key, { expiresIn: 3600 })
    ?? `https://bizforma-docs.r2.dev/${row.r2_key}`;
  return c.json({ url });
});
