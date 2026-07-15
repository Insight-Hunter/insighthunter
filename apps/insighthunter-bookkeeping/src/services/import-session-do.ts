import type { Env } from '../index';

export class ImportSessionDO {
  constructor(private state: DurableObjectState, private env: Env) {}

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const sessionId = this.state.id.toString();

    if (request.method === 'POST' && url.pathname === '/import/start') {
      const body = await request.json<any>();
      await this.state.storage.put('session', {
        sessionId: body.sessionId,
        objectKey: body.objectKey,
        fileName: body.fileName,
        status: 'uploaded',
        createdAt: new Date().toISOString(),
      });
      await this.env.DB.prepare(
        `INSERT OR REPLACE INTO import_sessions (id, status, file_name, object_key, updated_at)
         VALUES (?, ?, ?, ?, datetime('now'))`
      ).bind(body.sessionId, 'uploaded', body.fileName, body.objectKey).run();
      return Response.json({ ok: true, sessionId: body.sessionId });
    }

    if (request.method === 'GET' && url.pathname === '/import/state') {
      const session = await this.state.storage.get<any>('session');
      const rows = await this.env.DB.prepare(
        'SELECT * FROM import_rows WHERE session_id = ? ORDER BY row_index ASC'
      ).bind(session?.sessionId ?? sessionId).all();
      return Response.json({ session, rows: rows.results ?? [] });
    }

    if (request.method === 'POST' && url.pathname === '/import/review') {
      const payload = await request.json<any>();
      await this.env.DB.prepare(
        `UPDATE import_rows
         SET normalized_description = ?, normalized_amount = ?, normalized_date = ?, category = ?, confidence = ?, review_status = ?, updated_at = datetime('now')
         WHERE id = ? AND session_id = ?`
      ).bind(
        payload.normalized_description,
        payload.normalized_amount,
        payload.normalized_date,
        payload.category,
        payload.confidence,
        'reviewed',
        payload.rowId,
        payload.sessionId
      ).run();
      await this.env.DB.prepare(
        `INSERT INTO review_actions (id, session_id, row_id, action_type, payload)
         VALUES (?, ?, ?, ?, ?)`
      ).bind(crypto.randomUUID(), payload.sessionId, payload.rowId, 'review', JSON.stringify(payload)).run();
      return Response.json({ ok: true });
    }

    if (request.method === 'POST' && url.pathname === '/import/commit') {
      const payload = await request.json<any>();
      await this.env.DB.prepare(
        `UPDATE import_sessions SET status = ?, updated_at = datetime('now') WHERE id = ?`
      ).bind('committed', payload.sessionId).run();
      await this.state.storage.put('committed', { committedAt: new Date().toISOString() });
      return Response.json({ ok: true, committed: true });
    }

    return new Response('Not found', { status: 404 });
  }
}

