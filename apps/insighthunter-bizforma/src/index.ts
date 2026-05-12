import { Hono } from 'hono';
import { DurableObject } from 'cloudflare:workers';
import type { AuthUser } from '@ih/types';
import { scoreEntities, recommendEntity } from './entityMatrix.js';

// ─── Env / types ──────────────────────────────────────────────────────────────

interface Env {
  DB: D1Database;
  DOCUMENTS: R2Bucket;
  CACHE: KVNamespace;
  BIZ_EVENTS: AnalyticsEngineDataset;
  FORMATION_AGENT: DurableObjectNamespace;
  COMPLIANCE_AGENT: DurableObjectNamespace;
  JWT_SECRET: string;
  BOOKKEEPING_WORKER_URL: string;
}

interface IHLocals { user: AuthUser }

// ─── State filing fees per state (illustrative subset) ───────────────────────

const STATE_RULES: Record<string, { filing_fee: number; timeline_days: number }> = {
  DE: { filing_fee: 90,  timeline_days: 3 },
  WY: { filing_fee: 102, timeline_days: 7 },
  NV: { filing_fee: 425, timeline_days: 10 },
  FL: { filing_fee: 125, timeline_days: 14 },
  TX: { filing_fee: 300, timeline_days: 14 },
  CA: { filing_fee: 70,  timeline_days: 30 },
  NY: { filing_fee: 200, timeline_days: 21 },
  default: { filing_fee: 150, timeline_days: 14 },
};

// ─── Durable Object: FormationAgent ──────────────────────────────────────────

export class FormationAgent extends DurableObject {
  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;

    if (request.method === 'GET' && path === '/state') {
      const state = await this.ctx.storage.get<string>('status') ?? 'QUESTIONNAIRE';
      const caseId = await this.ctx.storage.get<string>('caseId');
      return Response.json({ status: state, caseId });
    }

    if (request.method === 'POST' && path === '/init') {
      const { caseId, status } = await request.json<{ caseId: string; status: string }>();
      await this.ctx.storage.put('caseId', caseId);
      await this.ctx.storage.put('status', status);
      return Response.json({ ok: true });
    }

    if (request.method === 'POST' && path === '/advance') {
      const { status } = await request.json<{ status: string }>();
      await this.ctx.storage.put('status', status);
      return Response.json({ status });
    }

    return Response.json({ error: 'Not found' }, { status: 404 });
  }
}

// ─── Durable Object: ComplianceAgent ─────────────────────────────────────────

export class ComplianceAgent extends DurableObject {
  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);

    if (request.method === 'POST' && url.pathname === '/schedule') {
      const { eventId, dueDate, orgId, title } = await request.json<{
        eventId: string; dueDate: string; orgId: string; title: string;
      }>();
      await this.ctx.storage.put('eventId', eventId);
      await this.ctx.storage.put('orgId', orgId);
      await this.ctx.storage.put('title', title);
      const alarmTime = new Date(dueDate).getTime();
      if (alarmTime > Date.now()) {
        await this.ctx.storage.setAlarm(alarmTime);
      }
      return Response.json({ scheduled: true, dueDate });
    }

    return Response.json({ error: 'Not found' }, { status: 404 });
  }

  async alarm(): Promise<void> {
    const eventId = await this.ctx.storage.get<string>('eventId');
    const orgId   = await this.ctx.storage.get<string>('orgId');
    const title   = await this.ctx.storage.get<string>('title');
    console.log(JSON.stringify({ event: 'compliance_due', eventId, orgId, title, timestamp: new Date().toISOString() }));
    // In production: enqueue to email/notification queue
  }
}

// ─── App ──────────────────────────────────────────────────────────────────────

const app = new Hono<{ Bindings: Env; Variables: IHLocals }>();

app.use('*', async (c, next) => {
  const raw = c.req.header('X-IH-User');
  if (!raw) return c.json({ error: 'Missing user context', code: 'NO_USER' }, 401);
  try { c.set('user', JSON.parse(raw) as AuthUser); } catch {
    return c.json({ error: 'Invalid user context', code: 'BAD_USER' }, 400);
  }
  return next();
});

// ─── Formation Cases ──────────────────────────────────────────────────────────

app.get('/cases', async (c) => {
  const user = c.get('user');
  const { results } = await c.env.DB.prepare('SELECT * FROM formation_cases WHERE org_id = ? ORDER BY created_at DESC').bind(user.orgId).all();
  return c.json(results);
});

app.post('/cases', async (c) => {
  const user = c.get('user');
  const body = await c.req.json<{ business_name?: string; state?: string }>().catch(() => ({}));
  const id = crypto.randomUUID().replace(/-/g, '');
  await c.env.DB.prepare(`INSERT INTO formation_cases (id, org_id, user_id, business_name, state) VALUES (?, ?, ?, ?, ?)`)
    .bind(id, user.orgId, user.userId, body.business_name ?? null, body.state ?? null).run();

  // Init FormationAgent Durable Object
  const doId = c.env.FORMATION_AGENT.idFromName(id);
  const agent = c.env.FORMATION_AGENT.get(doId);
  await agent.fetch(new Request('https://do/init', {
    method: 'POST',
    body: JSON.stringify({ caseId: id, status: 'QUESTIONNAIRE' }),
    headers: { 'Content-Type': 'application/json' },
  }));

  const case_ = await c.env.DB.prepare('SELECT * FROM formation_cases WHERE id = ?').bind(id).first();
  return c.json(case_, 201);
});

app.get('/cases/:id', async (c) => {
  const user = c.get('user');
  const id = c.req.param('id');
  const case_ = await c.env.DB.prepare('SELECT * FROM formation_cases WHERE id = ? AND org_id = ?').bind(id, user.orgId).first();
  if (!case_) return c.json({ error: 'Case not found', code: 'NOT_FOUND' }, 404);
  const { results: answers } = await c.env.DB.prepare('SELECT * FROM questionnaire_answers WHERE case_id = ?').bind(id).all();
  const { results: einApps } = await c.env.DB.prepare('SELECT * FROM ein_applications WHERE case_id = ?').bind(id).all();
  const { results: stateRegs } = await c.env.DB.prepare('SELECT * FROM state_registrations WHERE case_id = ?').bind(id).all();
  return c.json({ ...case_, answers, ein_applications: einApps, state_registrations: stateRegs });
});

app.patch('/cases/:id', async (c) => {
  const user = c.get('user');
  const id = c.req.param('id');
  const case_ = await c.env.DB.prepare('SELECT * FROM formation_cases WHERE id = ? AND org_id = ?').bind(id, user.orgId).first<{ org_id: string; status: string }>();
  if (!case_) return c.json({ error: 'Case not found', code: 'NOT_FOUND' }, 404);

  const body = await c.req.json<{ status?: string; entity_type?: string; state?: string; business_name?: string }>();
  const updates: string[] = [];
  const vals: unknown[] = [];
  if (body.status)        { updates.push('status = ?');        vals.push(body.status); }
  if (body.entity_type)   { updates.push('entity_type = ?');   vals.push(body.entity_type); }
  if (body.state)         { updates.push('state = ?');         vals.push(body.state); }
  if (body.business_name) { updates.push('business_name = ?'); vals.push(body.business_name); }
  if (!updates.length) return c.json({ error: 'No fields to update', code: 'NO_CHANGES' }, 400);

  updates.push("updated_at = datetime('now')");
  vals.push(id, user.orgId);
  await c.env.DB.prepare(`UPDATE formation_cases SET ${updates.join(', ')} WHERE id = ? AND org_id = ?`).bind(...vals).run();

  // Advance Durable Object state
  if (body.status) {
    const doId = c.env.FORMATION_AGENT.idFromName(id);
    const agent = c.env.FORMATION_AGENT.get(doId);
    await agent.fetch(new Request('https://do/advance', {
      method: 'POST',
      body: JSON.stringify({ status: body.status }),
      headers: { 'Content-Type': 'application/json' },
    }));
  }

  // On COMPLETE: call bookkeeping seed endpoint
  if (body.status === 'COMPLETE') {
    fetch(`${c.env.BOOKKEEPING_WORKER_URL}/seed`, {
      method: 'POST',
      headers: {
        'X-Internal-Secret': c.env.JWT_SECRET,
        'X-Org-Id': user.orgId,
      },
    }).catch(err => console.error('Bookkeeping seed failed:', err));

    c.env.BIZ_EVENTS.writeDataPoint({ blobs: ['formation_complete', id], indexes: [user.orgId] });
  }

  const updated = await c.env.DB.prepare('SELECT * FROM formation_cases WHERE id = ?').bind(id).first();
  return c.json(updated);
});

// ─── Questionnaire answers ────────────────────────────────────────────────────

app.post('/cases/:id/answers', async (c) => {
  const user = c.get('user');
  const id = c.req.param('id');
  const case_ = await c.env.DB.prepare('SELECT id FROM formation_cases WHERE id = ? AND org_id = ?').bind(id, user.orgId).first();
  if (!case_) return c.json({ error: 'Case not found', code: 'NOT_FOUND' }, 404);

  const body = await c.req.json<Array<{ question: string; answer: string }>>();
  if (!Array.isArray(body)) return c.json({ error: 'Array of {question, answer} required', code: 'INVALID_BODY' }, 400);

  const stmts = body.map(({ question, answer }) => {
    const aId = crypto.randomUUID().replace(/-/g, '');
    return c.env.DB.prepare('INSERT INTO questionnaire_answers (id, case_id, question, answer) VALUES (?, ?, ?, ?)')
      .bind(aId, id, question, answer);
  });
  await c.env.DB.batch(stmts);

  // Score entities and recommend
  const allAnswers = [...body, ...(await c.env.DB.prepare('SELECT question, answer FROM questionnaire_answers WHERE case_id = ?').bind(id).all()).results as Array<{ question: string; answer: string }>];
  const scores = scoreEntities(allAnswers);
  const recommended = recommendEntity(scores);

  return c.json({ saved: body.length, scores, recommended });
});

// ─── EIN Application ──────────────────────────────────────────────────────────

app.post('/cases/:id/ein', async (c) => {
  const user = c.get('user');
  const caseId = c.req.param('id');
  const case_ = await c.env.DB.prepare('SELECT id FROM formation_cases WHERE id = ? AND org_id = ?').bind(caseId, user.orgId).first();
  if (!case_) return c.json({ error: 'Case not found', code: 'NOT_FOUND' }, 404);

  const einId = crypto.randomUUID().replace(/-/g, '');
  await c.env.DB.batch([
    c.env.DB.prepare('INSERT INTO ein_applications (id, case_id, status) VALUES (?, ?, \'PENDING\')').bind(einId, caseId),
    c.env.DB.prepare("UPDATE formation_cases SET status = 'EIN_PENDING', updated_at = datetime('now') WHERE id = ?").bind(caseId),
  ]);

  const app_ = await c.env.DB.prepare('SELECT * FROM ein_applications WHERE id = ?').bind(einId).first();
  return c.json(app_, 201);
});

app.patch('/cases/:id/ein/:einId', async (c) => {
  const user = c.get('user');
  const { id: caseId, einId } = c.req.param();
  const case_ = await c.env.DB.prepare('SELECT id FROM formation_cases WHERE id = ? AND org_id = ?').bind(caseId, user.orgId).first();
  if (!case_) return c.json({ error: 'Case not found', code: 'NOT_FOUND' }, 404);

  const body = await c.req.json<{ status?: string; ein?: string }>();
  const stmts: D1PreparedStatement[] = [];
  if (body.status === 'APPROVED' && body.ein) {
    stmts.push(c.env.DB.prepare("UPDATE ein_applications SET status = 'APPROVED', ein = ?, approved_at = datetime('now') WHERE id = ?").bind(body.ein, einId));
    stmts.push(c.env.DB.prepare("UPDATE formation_cases SET status = 'EIN_COMPLETE', updated_at = datetime('now') WHERE id = ?").bind(caseId));
  } else if (body.status) {
    stmts.push(c.env.DB.prepare('UPDATE ein_applications SET status = ? WHERE id = ?').bind(body.status, einId));
  }
  if (stmts.length) await c.env.DB.batch(stmts);
  const app_ = await c.env.DB.prepare('SELECT * FROM ein_applications WHERE id = ?').bind(einId).first();
  return c.json(app_);
});

// ─── State Registration ───────────────────────────────────────────────────────

app.post('/cases/:id/state-reg', async (c) => {
  const user = c.get('user');
  const caseId = c.req.param('id');
  const case_ = await c.env.DB.prepare('SELECT id, state FROM formation_cases WHERE id = ? AND org_id = ?').bind(caseId, user.orgId).first<{ id: string; state: string | null }>();
  if (!case_) return c.json({ error: 'Case not found', code: 'NOT_FOUND' }, 404);

  const body = await c.req.json<{ state?: string }>();
  const state = body.state ?? case_.state ?? 'default';
  const rule = STATE_RULES[state] ?? STATE_RULES.default;

  const regId = crypto.randomUUID().replace(/-/g, '');
  await c.env.DB.batch([
    c.env.DB.prepare('INSERT INTO state_registrations (id, case_id, state, filing_fee) VALUES (?, ?, ?, ?)').bind(regId, caseId, state, rule.filing_fee),
    c.env.DB.prepare("UPDATE formation_cases SET status = 'STATE_PENDING', updated_at = datetime('now') WHERE id = ?").bind(caseId),
  ]);

  return c.json({ id: regId, state, ...rule }, 201);
});

app.get('/state-rules/:state', (c) => {
  const state = c.req.param('state').toUpperCase();
  const rule = STATE_RULES[state] ?? STATE_RULES.default;
  return c.json({ state, ...rule });
});

// ─── Compliance Events ────────────────────────────────────────────────────────

app.get('/compliance', async (c) => {
  const user = c.get('user');
  const { from, to, status } = c.req.query();
  let query = 'SELECT * FROM compliance_events WHERE org_id = ?';
  const params: unknown[] = [user.orgId];
  if (from)   { query += ' AND due_date >= ?'; params.push(from); }
  if (to)     { query += ' AND due_date <= ?'; params.push(to); }
  if (status) { query += ' AND status = ?';    params.push(status.toUpperCase()); }
  query += ' ORDER BY due_date ASC';
  const { results } = await c.env.DB.prepare(query).bind(...params).all();
  return c.json(results);
});

app.post('/compliance', async (c) => {
  const user = c.get('user');
  const body = await c.req.json<{ type: string; title: string; due_date: string; case_id?: string; notes?: string }>();
  if (!body.type || !body.title || !body.due_date) {
    return c.json({ error: 'type, title, due_date required', code: 'MISSING_FIELDS' }, 400);
  }
  const id = crypto.randomUUID().replace(/-/g, '');
  await c.env.DB.prepare('INSERT INTO compliance_events (id, org_id, case_id, type, title, due_date, notes) VALUES (?, ?, ?, ?, ?, ?, ?)')
    .bind(id, user.orgId, body.case_id ?? null, body.type, body.title, body.due_date, body.notes ?? null).run();

  // Schedule alarm via ComplianceAgent DO
  const doId = c.env.COMPLIANCE_AGENT.idFromName(id);
  const agent = c.env.COMPLIANCE_AGENT.get(doId);
  await agent.fetch(new Request('https://do/schedule', {
    method: 'POST',
    body: JSON.stringify({ eventId: id, dueDate: body.due_date, orgId: user.orgId, title: body.title }),
    headers: { 'Content-Type': 'application/json' },
  }));

  const event = await c.env.DB.prepare('SELECT * FROM compliance_events WHERE id = ?').bind(id).first();
  return c.json(event, 201);
});

app.patch('/compliance/:id', async (c) => {
  const user = c.get('user');
  const id = c.req.param('id');
  const body = await c.req.json<{ status?: string; notes?: string }>();
  const updates: string[] = [];
  const vals: unknown[] = [];
  if (body.status) { updates.push('status = ?'); vals.push(body.status.toUpperCase()); }
  if (body.notes !== undefined) { updates.push('notes = ?'); vals.push(body.notes); }
  if (!updates.length) return c.json({ error: 'No fields to update', code: 'NO_CHANGES' }, 400);
  vals.push(id, user.orgId);
  await c.env.DB.prepare(`UPDATE compliance_events SET ${updates.join(', ')} WHERE id = ? AND org_id = ?`).bind(...vals).run();
  const event = await c.env.DB.prepare('SELECT * FROM compliance_events WHERE id = ?').bind(id).first();
  return c.json(event);
});

// ─── Documents ────────────────────────────────────────────────────────────────

app.post('/documents/upload', async (c) => {
  const user = c.get('user');
  const formData = await c.req.formData();
  const file = formData.get('file') as File | null;
  if (!file) return c.json({ error: 'file field required', code: 'MISSING_FILE' }, 400);

  const r2Key = `${user.orgId}/${crypto.randomUUID()}-${file.name}`;
  await c.env.DOCUMENTS.put(r2Key, file.stream(), {
    httpMetadata: { contentType: file.type },
    customMetadata: { orgId: user.orgId, filename: file.name },
  });

  return c.json({ r2_key: r2Key, filename: file.name, size: file.size }, 201);
});

app.get('/documents/*', async (c) => {
  const user = c.get('user');
  const key = c.req.path.replace('/documents/', '');
  const obj = await c.env.DOCUMENTS.get(key);
  if (!obj) return c.json({ error: 'Document not found', code: 'NOT_FOUND' }, 404);

  // Verify org ownership via custom metadata
  const orgId = obj.customMetadata?.orgId;
  if (orgId !== user.orgId) return c.json({ error: 'Forbidden', code: 'FORBIDDEN' }, 403);

  const filename = obj.customMetadata?.filename ?? 'document';
  return new Response(obj.body, {
    headers: {
      'Content-Type': obj.httpMetadata?.contentType ?? 'application/octet-stream',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  });
});

export default app;
