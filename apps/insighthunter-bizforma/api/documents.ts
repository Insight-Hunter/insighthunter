import { Hono } from 'hono';
import { buildOperatingAgreement, putHtmlDocument } from '../services/documentService';

export const documentsApi = new Hono();

documentsApi.post('/operating-agreement', async (c) => {
  const body = await c.req.json<{ formationCaseId: string; companyName: string; state: string }>();
  const key = `documents/${body.formationCaseId}/operating-agreement.html`;
  await putHtmlDocument(c.env as any, key, buildOperatingAgreement(body.companyName, body.state));
  await c.env.DOCUMENT_QUEUE.send({ key, formationCaseId: body.formationCaseId, type: 'operating-agreement' });
  return c.json({ ok: true, key, downloadPath: `/api/documents/signed-url?key=${encodeURIComponent(key)}` });
});

documentsApi.get('/signed-url', async (c) => {
  const key = c.req.query('key');
  if (!key) return c.json({ error: 'Missing key' }, 400);
  const object = await c.env.DOCUMENTS.get(key);
  if (!object) return c.json({ error: 'Not found' }, 404);
  return new Response(await object.text(), { headers: { 'content-type': object.httpMetadata?.contentType || 'text/html' } });
});
