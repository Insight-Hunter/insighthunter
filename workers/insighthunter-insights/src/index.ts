import { Hono } from 'hono';
import type { AuthUser } from '@ih/types';
import { TIER_LIMITS } from '@ih/tier-config';

interface Env {
  DB: D1Database;
  USAGE: KVNamespace;
  AI: Ai;
  VECTORIZE: VectorizeIndex;
  AI_EVENTS: AnalyticsEngineDataset;
  JWT_SECRET: string;
  EMBED_MODEL: string;
  CHAT_MODEL: string;
}

interface IHLocals { user: AuthUser }

const app = new Hono<{ Bindings: Env; Variables: IHLocals }>();

// ─── Auth middleware ──────────────────────────────────────────────────────────

app.use('*', async (c, next) => {
  if (c.req.path === '/documents/embed' && c.req.method === 'POST') {
    if (c.req.header('X-Internal-Secret') !== c.env.JWT_SECRET) {
      return c.json({ error: 'Forbidden', code: 'FORBIDDEN' }, 403);
    }
    return next();
  }
  const raw = c.req.header('X-IH-User');
  if (!raw) return c.json({ error: 'Missing user context', code: 'NO_USER' }, 401);
  try { c.set('user', JSON.parse(raw) as AuthUser); } catch {
    return c.json({ error: 'Invalid user context', code: 'BAD_USER' }, 400);
  }
  return next();
});

// ─── Usage helpers ────────────────────────────────────────────────────────────

function todayKey(orgId: string): string {
  return `usage:${orgId}:${new Date().toISOString().slice(0, 10)}`;
}

async function incrementUsage(env: Env, orgId: string): Promise<number> {
  const key = todayKey(orgId);
  const current = parseInt((await env.USAGE.get(key)) ?? '0', 10);
  const next = current + 1;
  const secondsUntilMidnight = Math.floor((new Date().setHours(24, 0, 0, 0) - Date.now()) / 1000);
  await env.USAGE.put(key, String(next), { expirationTtl: secondsUntilMidnight });
  return next;
}

async function getUsage(env: Env, orgId: string): Promise<number> {
  return parseInt((await env.USAGE.get(todayKey(orgId))) ?? '0', 10);
}

// ─── Conversations ────────────────────────────────────────────────────────────

app.get('/conversations', async (c) => {
  const user = c.get('user');
  const { results } = await c.env.DB.prepare('SELECT * FROM conversations WHERE org_id = ? ORDER BY updated_at DESC LIMIT 50').bind(user.orgId).all();
  return c.json(results);
});

app.post('/conversations', async (c) => {
  const user = c.get('user');
  const body = await c.req.json<{ title?: string }>().catch(() => ({}));
  const id = crypto.randomUUID().replace(/-/g, '');
  await c.env.DB.prepare('INSERT INTO conversations (id, org_id, user_id, title) VALUES (?, ?, ?, ?)')
    .bind(id, user.orgId, user.userId, body.title ?? 'New Conversation').run();
  return c.json(await c.env.DB.prepare('SELECT * FROM conversations WHERE id = ?').bind(id).first(), 201);
});

app.get('/conversations/:id', async (c) => {
  const user = c.get('user');
  const conv = await c.env.DB.prepare('SELECT * FROM conversations WHERE id = ? AND org_id = ?').bind(c.req.param('id'), user.orgId).first();
  if (!conv) return c.json({ error: 'Conversation not found', code: 'NOT_FOUND' }, 404);
  const { results: messages } = await c.env.DB.prepare('SELECT * FROM messages WHERE conversation_id = ? ORDER BY created_at ASC').bind(c.req.param('id')).all();
  return c.json({ ...conv, messages });
});

app.delete('/conversations/:id', async (c) => {
  const user = c.get('user');
  await c.env.DB.prepare('DELETE FROM conversations WHERE id = ? AND org_id = ?').bind(c.req.param('id'), user.orgId).run();
  return c.json({ deleted: true });
});

// ─── Chat with streaming ──────────────────────────────────────────────────────

app.post('/conversations/:id/chat', async (c) => {
  const user = c.get('user');
  const convId = c.req.param('id');

  // Tier limit check
  const dailyLimit = TIER_LIMITS[user.tier].ai_queries_per_day;
  if (dailyLimit === 0) {
    return c.json({ error: 'AI assistant not available on free plan. Upgrade to Lite or above.', code: 'TIER_REQUIRED', required: 'lite' }, 403);
  }

  if (dailyLimit !== null) {
    const used = await getUsage(c.env, user.orgId);
    if (used >= dailyLimit) {
      return c.json({ error: `Daily AI query limit (${dailyLimit}) reached. Resets at midnight.`, code: 'USAGE_LIMIT' }, 429);
    }
  }

  // Verify conversation belongs to org
  const conv = await c.env.DB.prepare('SELECT id FROM conversations WHERE id = ? AND org_id = ?').bind(convId, user.orgId).first();
  if (!conv) return c.json({ error: 'Conversation not found', code: 'NOT_FOUND' }, 404);

  const { message } = await c.req.json<{ message: string }>();
  if (!message?.trim()) return c.json({ error: 'message required', code: 'MISSING_FIELDS' }, 400);

  // Load last 10 messages for context
  const { results: history } = await c.env.DB.prepare(
    'SELECT role, content FROM messages WHERE conversation_id = ? ORDER BY created_at DESC LIMIT 10'
  ).bind(convId).all<{ role: string; content: string }>();
  history.reverse();

  // Vector similarity search for relevant financial docs
  let ragContext = '';
  try {
    const embedResult = await c.env.AI.run(c.env.EMBED_MODEL as '@cf/baai/bge-small-en-v1.5', { text: message });
    const vectors = Array.isArray(embedResult) ? embedResult : (embedResult as { data: number[][] }).data?.[0] ?? [];
    if (vectors.length > 0) {
      const matches = await c.env.VECTORIZE.query(vectors, {
        topK: 3,
        filter: { orgId: user.orgId },
        returnMetadata: 'all',
      });
      if (matches.matches.length > 0) {
        const ids = matches.matches.map(m => m.id);
        const placeholders = ids.map(() => '?').join(',');
        const { results: docs } = await c.env.DB.prepare(`SELECT content, type, period FROM financial_docs WHERE vector_id IN (${placeholders}) AND org_id = ?`).bind(...ids, user.orgId).all<{ content: string; type: string; period: string }>();
        ragContext = docs.map(d => `[${d.type} ${d.period}]\n${d.content}`).join('\n\n');
      }
    }
  } catch (err) {
    console.error('RAG search error:', err);
  }

  const today = new Date().toISOString().slice(0, 10);
  const systemPrompt = `You are InsightHunter, an AI CFO assistant. You help small business owners understand their financials. You have access to this org's financial data. Keep answers concise, actionable, and in plain business language. Format numbers as currency. Today is ${today}.${ragContext ? `\n\nFinancial context:\n${ragContext}` : ''}`;

  // Build messages for the model
  const chatMessages: Array<{ role: string; content: string }> = [
    { role: 'system', content: systemPrompt },
    ...history,
    { role: 'user', content: message },
  ];

  // Increment usage
  await incrementUsage(c.env, user.orgId);

  // Save user message
  const userMsgId = crypto.randomUUID().replace(/-/g, '');
  await c.env.DB.prepare('INSERT INTO messages (id, conversation_id, role, content) VALUES (?, ?, \'user\', ?)')
    .bind(userMsgId, convId, message).run();

  // Update conversation timestamp
  await c.env.DB.prepare("UPDATE conversations SET updated_at = datetime('now') WHERE id = ?").bind(convId).run();

  c.env.AI_EVENTS.writeDataPoint({ blobs: ['ai_query', convId], indexes: [user.orgId] });

  // Stream response
  const stream = await c.env.AI.run(c.env.CHAT_MODEL as '@cf/meta/llama-3.1-8b-instruct', {
    messages: chatMessages as RoleScopedChatInput[],
    stream: true,
    max_tokens: 1024,
  });

  // Collect full response in background to save to D1
  const [streamForClient, streamForSave] = (stream as ReadableStream).tee();

  // Save assistant response in background (non-blocking)
  const ctx = c.executionCtx;
  ctx.waitUntil((async () => {
    try {
      const reader = streamForSave.getReader();
      let fullResponse = '';
      const decoder = new TextDecoder();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value);
        // Parse SSE data lines
        for (const line of chunk.split('\n')) {
          if (line.startsWith('data: ') && line !== 'data: [DONE]') {
            try {
              const data = JSON.parse(line.slice(6)) as { response?: string };
              if (data.response) fullResponse += data.response;
            } catch { /* skip */ }
          }
        }
      }
      if (fullResponse) {
        const asstMsgId = crypto.randomUUID().replace(/-/g, '');
        await c.env.DB.prepare('INSERT INTO messages (id, conversation_id, role, content) VALUES (?, ?, \'assistant\', ?)')
          .bind(asstMsgId, convId, fullResponse).run();
      }
    } catch (err) {
      console.error('Failed to save assistant message:', err);
    }
  })());

  return new Response(streamForClient, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Transfer-Encoding': 'chunked',
    },
  });
});

// ─── Documents: embed for RAG (internal) ─────────────────────────────────────

app.post('/documents/embed', async (c) => {
  // Auth handled by middleware (X-Internal-Secret check)
  const body = await c.req.json<{ orgId: string; type: string; period: string; content: string }>();
  if (!body.orgId || !body.type || !body.content) {
    return c.json({ error: 'orgId, type, content required', code: 'MISSING_FIELDS' }, 400);
  }

  // Generate embedding
  const embedResult = await c.env.AI.run(c.env.EMBED_MODEL as '@cf/baai/bge-small-en-v1.5', { text: body.content });
  const vectors = Array.isArray(embedResult) ? embedResult : (embedResult as { data: number[][] }).data?.[0] ?? [];

  const vectorId = crypto.randomUUID();

  // Upsert into Vectorize
  await c.env.VECTORIZE.upsert([{
    id: vectorId,
    values: vectors as number[],
    metadata: { orgId: body.orgId, type: body.type, period: body.period ?? '' },
  }]);

  // Save to D1
  const docId = crypto.randomUUID().replace(/-/g, '');
  await c.env.DB.prepare('INSERT INTO financial_docs (id, org_id, type, period, content, vector_id) VALUES (?, ?, ?, ?, ?, ?)')
    .bind(docId, body.orgId, body.type, body.period ?? null, body.content, vectorId).run();

  return c.json({ vector_id: vectorId, doc_id: docId });
});

// ─── Usage endpoint ───────────────────────────────────────────────────────────

app.get('/usage', async (c) => {
  const user = c.get('user');
  const used = await getUsage(c.env, user.orgId);
  const limit = TIER_LIMITS[user.tier].ai_queries_per_day;
  return c.json({ used, limit, remaining: limit === null ? null : Math.max(0, limit - used), tier: user.tier });
});

export default app;
