import type { Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';
import type { Env } from '../types';
import { documentService } from '../services/documentService';

export function registerDocumentRoutes(
  app: Hono<{ Bindings: Env; Variables: { userId?: string } }>
) {
  const base = '/api/documents';

  app.post(`${base}/upload`, async (c) => {
    const userId = c.var.userId!;
    const formData = await c.req.formData();
    const file = formData.get('file');
    if (!(file instanceof File)) {
      throw new HTTPException(400, { message: 'file is required' });
    }

    const key = await documentService.upload(c.env, userId, file);
    return c.json({ key });
  });

  app.get(`${base}/:key`, async (c) => {
    const userId = c.var.userId!;
    const key = c.req.param('key');

    const obj = await documentService.get(c.env, userId, key);
    if (!obj) throw new HTTPException(404, { message: 'Document not found' });

    return new Response(obj.body, {
      headers: {
        'Content-Type': obj.httpMetadata?.contentType ?? 'application/octet-stream',
        'Content-Disposition': `attachment; filename="${key}"`,
      },
    });
  });
}
