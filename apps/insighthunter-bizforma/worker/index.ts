/**
 * Bizforma — Hono API Worker
 * Handles all /api/* routes; static assets served by Cloudflare via ASSETS binding.
 */

import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { requireAuth } from '../../middleware/requireAuth';

export interface Env {
  DB: D1Database;
  BUSINESS_DATA: KVNamespace;
  DOCUMENTS: R2Bucket;
  AI: Ai;
  ASSETS: Fetcher;
  ANTHROPIC_API_KEY?: string;
}

const app = new Hono<{ Bindings: Env }>();

// ── Middleware ────────────────────────────────────────────────────────────────

app.use('*', logger());
app.use('/api/*', cors({
  origin: ['https://bizforma.insighthunters.com', 'http://localhost:4321', 'http://localhost:8787'],
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
}));

// ── Unauthenticated Routes ──────────────────────────────────────────────────

app.get('/api/health', (c) =>
  c.json({ status: 'ok', ts: new Date().toISOString(), service: 'Bizforma' })
);

app.post('/api/session', async (c) => {
  try {
    const body = await c.req.json<{ sessionId?: string }>();
    const sessionId = body.sessionId ?? crypto.randomUUID();
    const key = `session:${sessionId}`;

    const existing = await c.env.BUSINESS_DATA.get(key, 'json');
    if (existing) return c.json({ sessionId, data: existing, resumed: true });

    const session = {
      sessionId,
      currentStep: 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      formData: {},
    };

    await c.env.BUSINESS_DATA.put(key, JSON.stringify(session), {
      expirationTtl: 60 * 60 * 24 * 30,
    });

    return c.json({ sessionId, data: session, resumed: false });
  } catch (err) {
    console.error('session create:', err);
    return c.json({ error: 'Failed to create session' }, 500);
  }
});


// ── AI Endpoints (Public) ───────────────────────────────────────────────────

app.post('/api/ai/names', async (c) => {
  try {
    const { businessIdea, industry, style } = await c.req.json<{
      businessIdea: string; industry?: string; style?: string;
    }>();

    const prompt = `Generate 8 unique business name suggestions for:
Business: ${businessIdea}
Industry: ${industry ?? 'general'}
Style: ${style ?? 'modern and professional'}

Return ONLY a JSON array, no markdown:
[{"name":"Example","rationale":"Why it works","domain":"example.com"}]`;

    const res = await c.env.AI.run('@cf/meta/llama-3.1-8b-instruct', {
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 800,
    });

    let suggestions: unknown[] = [];
    try {
      const m = (res as { response: string }).response.match(/\[[\s\S]*\]/);
      if (m) suggestions = JSON.parse(m[0]);
    } catch { /* ignore */ }

    return c.json({ success: true, suggestions });
  } catch (err) {
    console.error('ai names:', err);
    return c.json({ error: 'AI request failed' }, 500);
  }
});

app.post('/api/ai/entity', async (c) => {
  try {
    const body = await c.req.json<{
      businessIdea: string; owners?: number; state?: string;
      revenue?: string; liabilityPriority?: boolean;
    }>();

    const prompt = `Recommend the best business entity for:
Business: ${body.businessIdea}
Owners: ${body.owners ?? 1}
State: ${body.state ?? 'unspecified'}
Revenue: ${body.revenue ?? 'unknown'}
Liability protection priority: ${body.liabilityPriority ? 'yes' : 'no'}

Return ONLY JSON, no markdown:
{"recommended":"LLC","alternatives":["S-Corp"],"reasoning":"...","pros":["..."],"cons":["..."],"taxNote":"..."}`;

    const res = await c.env.AI.run('@cf/meta/llama-3.1-8b-instruct', {
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 600,
    });

    let rec: unknown = {};
    try {
      const m = (res as { response: string }).response.match(/\{[\s\S]*\}/);
      if (m) rec = JSON.parse(m[0]);
    } catch { /* ignore */ }

    return c.json({ success: true, recommendation: rec });
  } catch (err) {
    console.error('ai entity:', err);
    return c.json({ error: 'AI request failed' }, 500);
  }
});

app.post('/api/ai/calendar', async (c) => {
  try {
    const body = await c.req.json<{
      entityType: string; state: string;
      formationDate?: string; hasSalesTax?: boolean; taxElection?: string;
    }>();

    const prompt = `Generate a compliance calendar for:
Entity: ${body.entityType}, State: ${body.state}
Formation: ${body.formationDate ?? new Date().toISOString().split('T')[0]}
Sales Tax: ${body.hasSalesTax ? 'yes' : 'no'}, Tax Election: ${body.taxElection ?? 'default'}

Return ONLY a JSON array:
[{"title":"Annual Report","category":"state","dueDate":"2025-04-01","description":"File with SOS","penalty":"$50","recurring":"annual"}]

Include: annual reports, federal taxes, estimated taxes, BOI report, sales tax if applicable.`;

    const res = await c.env.AI.run('@cf/meta/llama-3.1-8b-instruct', {
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 1200,
    });

    let events: unknown[] = [];
    try {
      const m = (res as { response: string }).response.match(/\[[\s\S]*\]/);
      if (m) events = JSON.parse(m[0]);
    } catch { /* ignore */ }

    return c.json({ success: true, events });
  } catch (err) {
    console.error('ai calendar:', err);
    return c.json({ error: 'AI request failed' }, 500);
  }
});

app.post('/api/ai/chat', async (c) => {
  try {
    const { message, context, history } = await c.req.json<{
      message: string;
      context?: string;
      history?: Array<{ role: 'user' | 'assistant'; content: string }>;
    }>();

    const system = `You are Bizforma, an AI business formation assistant from InsightHunters.
Help entrepreneurs form businesses correctly. Be concise and practical.
Current context: ${context ?? 'general formation guidance'}
Always note you are not a licensed attorney.`;

    const messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [
      { role: 'system', content: system },
      ...(history ?? []),
      { role: 'user', content: message },
    ];

    const stream = await c.env.AI.run('@cf/meta/llama-3.1-8b-instruct', {
      messages,
      max_tokens: 512,
      stream: true,
    });

    return new Response(stream as ReadableStream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  } catch (err) {
    console.error('ai chat:', err);
    return c.json({ error: 'Chat failed' }, 500);
  }
});

// ── Authenticated Routes ──────────────────────────────────────────────────────

const protectedApi = new Hono<{ Bindings: Env }>();
protectedApi.use('/*', requireAuth);

protectedApi.put('/api/session/:id', async (c) => {
  try {
    const id = c.req.param('id');
    const body = await c.req.json();
    const updated = { ...body, sessionId: id, updatedAt: new Date().toISOString() };
    await c.env.BUSINESS_DATA.put(`session:${id}`, JSON.stringify(updated), {
      expirationTtl: 60 * 60 * 24 * 30,
    });
    return c.json({ success: true });
  } catch (err) {
    console.error('session save:', err);
    return c.json({ error: 'Failed to save session' }, 500);
  }
});

protectedApi.post('/api/business', async (c) => {
  try {
    const data = await c.req.json<{
      businessName: string;
      entityType?: string;
      state?: string;
      formData?: Record<string, unknown>;
    }>();

    if (!data.businessName) return c.json({ error: 'businessName required' }, 400);

    const result = await c.env.DB.prepare(
      `INSERT INTO businesses (business_name, entity_type, state, form_data, created_at, updated_at)
       VALUES (?, ?, ?, ?, datetime('now'), datetime('now'))`
    ).bind(
      data.businessName,
      data.entityType ?? null,
      data.state ?? null,
      JSON.stringify(data.formData ?? {})
    ).run();

    const slug = data.businessName.toLowerCase().replace(/\s+/g, '-');
    await c.env.BUSINESS_DATA.put(
      `business:${slug}`,
      JSON.stringify({ ...data, id: result.meta.last_row_id }),
      { expirationTtl: 60 * 60 * 24 * 90 }
    );

    return c.json({ success: true, businessId: result.meta.last_row_id });
  } catch (err) {
    console.error('save business:', err);
    return c.json({ error: 'Failed to save business' }, 500);
  }
});

protectedApi.get('/api/business', async (c) => {
  try {
    const name = c.req.query('name');
    const id = c.req.query('id');
    if (!name && !id) return c.json({ error: 'Provide name or id' }, 400);

    if (name) {
      const slug = name.toLowerCase().replace(/\s+/g, '-');
      const cached = await c.env.BUSINESS_DATA.get(`business:${slug}`, 'json');
      if (cached) return c.json({ success: true, data: cached, source: 'cache' });
    }

    const row = id
      ? await c.env.DB.prepare('SELECT * FROM businesses WHERE id = ?').bind(id).first()
      : await c.env.DB.prepare('SELECT * FROM businesses WHERE business_name = ?').bind(name).first();

    if (!row) return c.json({ error: 'Not found' }, 404);
    return c.json({ success: true, data: row, source: 'database' });
  } catch (err) {
    console.error('get business:', err);
    return c.json({ error: 'Failed to retrieve business' }, 500);
  }
});

protectedApi.post('/api/documents/:businessId', async (c) => {
  try {
    const businessId = c.req.param('businessId');
    const filename = c.req.query('filename') ?? `doc-${Date.now()}`;
    const docType = c.req.query('type') ?? 'general';
    const contentType = c.req.header('content-type') ?? 'application/octet-stream';
    const body = await c.req.arrayBuffer();
    const key = `businesses/${businessId}/${docType}/${filename}`;

    await c.env.DOCUMENTS.put(key, body, {
      httpMetadata: { contentType },
      customMetadata: { businessId, docType, uploadedAt: new Date().toISOString() },
    });

    await c.env.DB.prepare(
      `INSERT INTO documents (business_id, document_type, document_name, file_path, file_size, uploaded_at)
       VALUES (?, ?, ?, ?, ?, datetime('now'))`
    ).bind(businessId, docType, filename, key, body.byteLength).run();

    return c.json({ success: true, key });
  } catch (err) {
    console.error('doc upload:', err);
    return c.json({ error: 'Upload failed' }, 500);
  }
});

protectedApi.get('/api/documents/:businessId/:filename', async (c) => {
  try {
    const { businessId, filename } = c.req.param();
    const docType = c.req.query('type') ?? 'general';
    const object = await c.env.DOCUMENTS.get(`businesses/${businessId}/${docType}/${filename}`);
    if (!object) return c.json({ error: 'Not found' }, 404);

    const headers = new Headers();
    object.writeHttpMetadata(headers);
    headers.set('Content-Disposition', `attachment; filename="${filename}"`);
    return new Response(object.body, { headers });
  } catch (err) {
    console.error('doc download:', err);
    return c.json({ error: 'Download failed' }, 500);
  }
});

protectedApi.get('/api/compliance/:businessId', async (c) => {
  const { businessId } = c.req.param();
  const results = await c.env.DB
    .prepare('SELECT * FROM compliance_events WHERE business_id = ? ORDER BY event_date ASC')
    .bind(businessId).all();
  return c.json({ success: true, events: results.results });
});

protectedApi.post('/api/compliance/:businessId', async (c) => {
  try {
    const businessId = c.req.param('businessId');
    const ev = await c.req.json<{
      eventType: string; eventName: string; eventDate: string;
      description?: string; reminderDays?: number;
    }>();

    await c.env.DB.prepare(
      `INSERT INTO compliance_events (business_id, event_type, event_name, event_date, description, reminder_days)
       VALUES (?, ?, ?, ?, ?, ?)`
    ).bind(businessId, ev.eventType, ev.eventName, ev.eventDate,
      ev.description ?? null, ev.reminderDays ?? 30).run();

    return c.json({ success: true });
  } catch (err) {
    console.error('compliance save:', err);
    return c.json({ error: 'Save failed' }, 500);
  }
});

app.route('/', protectedApi);

// ── SPA Fallback ──────────────────────────────────────────────────────────────

app.get('*', (c) => c.env.ASSETS.fetch(c.req.raw));

export default app;
