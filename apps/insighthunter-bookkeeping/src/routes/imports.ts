import type { Env } from '../index';

export async function router(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
  const url = new URL(request.url);

  if (request.method === 'POST' && url.pathname === '/imports/upload') {
    const formData = await request.formData();
    const file = formData.get('file');
    if (!(file instanceof File)) {
      return Response.json({ error: 'Missing file' }, { status: 400 });
    }

    const sessionId = crypto.randomUUID();
    const objectKey = `imports/${sessionId}/${file.name}`;
    await env.IMPORTS.put(objectKey, file.stream(), {
      httpMetadata: { contentType: file.type || 'text/csv' },
      customMetadata: {
        sessionId,
        originalName: file.name,
      },
    });

    const stub = env.IMPORT_SESSION.get(env.IMPORT_SESSION.idFromName(sessionId));
    await stub.fetch('https://do/import/start', {
      method: 'POST',
      body: JSON.stringify({ sessionId, objectKey, fileName: file.name }),
    });

    return Response.json({ sessionId, objectKey }, { status: 202 });
  }

  if (request.method === 'GET' && url.pathname.startsWith('/imports/')) {
    const sessionId = url.pathname.split('/')[2];
    const stub = env.IMPORT_SESSION.get(env.IMPORT_SESSION.idFromName(sessionId));
    return stub.fetch('https://do/import/state');
  }

  if (request.method === 'POST' && url.pathname === '/imports/review') {
    const payload = await request.json<any>();
    const stub = env.IMPORT_SESSION.get(env.IMPORT_SESSION.idFromName(payload.sessionId));
    return stub.fetch('https://do/import/review', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  if (request.method === 'POST' && url.pathname === '/imports/commit') {
    const payload = await request.json<any>();
    const stub = env.IMPORT_SESSION.get(env.IMPORT_SESSION.idFromName(payload.sessionId));
    return stub.fetch('https://do/import/commit', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  return new Response('Not found', { status: 404 });
}

