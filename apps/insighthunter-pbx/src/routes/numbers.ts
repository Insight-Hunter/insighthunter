// apps/insighthunter-pbx/src/routes/numbers.ts
// All Telnyx calls use master TELNYX_API_KEY.
// Phone numbers are assigned to the tenant's telnyx_connection_id.
import { Hono } from 'hono';
import { z }    from 'zod';

interface Env {
  PBX_DB:             D1Database;
  PBX_KV:             KVNamespace;
  ANALYTICS:          AnalyticsEngineDataset;
  TELNYX_API_KEY:     string;   // single master key — no per-tenant keys
}

const TELNYX = 'https://api.telnyx.com/v2';

async function telnyxFetch<T = unknown>(path: string, key: string, init: RequestInit = {}): Promise<T> {
  const r = await fetch(`${TELNYX}${path}`, {
    ...init,
    headers: {
      'Authorization': `Bearer ${key}`,
      'Content-Type':  'application/json',
      ...(init.headers ?? {}),
    },
  });
  const text = await r.text();
  if (!r.ok) throw new Error(`Telnyx ${path} ${r.status}: ${text}`);
  return JSON.parse(text) as T;
}

// Load tenant's connection_id — throws if not provisioned
async function getOrgConnection(orgId: string, db: D1Database): Promise<string> {
  const row = await db
    .prepare('SELECT telnyx_connection_id FROM orgs WHERE org_id=? AND status=\'active\' LIMIT 1')
    .bind(orgId).first<{ telnyx_connection_id: string }>();
  if (!row?.telnyx_connection_id)
    throw new Error(`Org ${orgId} not provisioned or inactive`);
  return row.telnyx_connection_id;
}

// Plan DID limits
const PLAN_DID_LIMITS: Record<string, number> = {
  starter: 3, professional: 15, enterprise: 100,
};

const SearchSchema = z.object({
  areaCode:   z.string().regex(/^\d{3}$/).optional(),
  state:      z.string().length(2).toUpperCase().optional(),
  city:       z.string().max(80).optional(),
  contains:   z.string().max(10).optional(),
  numberType: z.enum(['local', 'toll_free', 'mobile']).default('local'),
  limit:      z.coerce.number().min(1).max(50).default(20),
});

const PurchaseSchema = z.object({
  phoneNumber:  z.string().regex(/^\+1\d{10}$/),
  friendlyName: z.string().max(80).optional(),
});

const PortSchema = z.object({
  phoneNumber:    z.string().regex(/^\+1\d{10}$/),
  accountNumber:  z.string().max(30),
  pinOrPassword:  z.string().max(30),
  billingName:    z.string().max(80),
  serviceAddress: z.string().max(200),
  loaSignedBy:    z.string().max(80),
});

const numbers = new Hono<{ Bindings: Env }>();

// ── GET /api/pbx/numbers/search ───────────────────────────────────────────────
numbers.get('/search', async (c) => {
  const parsed = SearchSchema.safeParse(Object.fromEntries(new URL(c.req.url).searchParams));
  if (!parsed.success) return c.json({ error: parsed.error.issues }, 422);

  const { areaCode, state, city, contains, numberType, limit } = parsed.data;
  const params = new URLSearchParams({
    'filter[number_type]': numberType === 'toll_free' ? 'toll-free' : numberType,
    'filter[features]':    'voice',
    'filter[limit]':       String(limit),
    'filter[quickship]':   'true',
  });
  if (areaCode) params.set('filter[national_destination_code]', areaCode);
  if (state)    params.set('filter[administrative_area]',       state);
  if (city)     params.set('filter[locality]',                  city);
  if (contains) params.set('filter[phone_number][contains]',    contains);

  const result = await telnyxFetch<{ data: unknown[] }>(
    `/available_phone_numbers?${params}`, c.env.TELNYX_API_KEY,
  );
  return c.json({ data: result.data ?? [] });
});

// ── GET /api/pbx/numbers — list active numbers ────────────────────────────────
numbers.get('/', async (c) => {
  const { results } = await c.env.PBX_DB.prepare(`
    SELECT id, phone_number, friendly_name, number_type, status, purchased_at
    FROM phone_numbers WHERE org_id=? ORDER BY purchased_at DESC
  `).bind(c.get('orgId') as string).all<Record<string, unknown>>();
  return c.json({ data: results });
});

// ── POST /api/pbx/numbers/purchase ───────────────────────────────────────────
numbers.post('/purchase', async (c) => {
  const orgId  = c.get('orgId') as string;
  const parsed = PurchaseSchema.safeParse(await c.req.json());
  if (!parsed.success) return c.json({ error: parsed.error.issues }, 422);

  // Enforce plan DID limit
  const org = await c.env.PBX_DB
    .prepare('SELECT plan_id FROM orgs WHERE org_id=? LIMIT 1')
    .bind(orgId).first<{ plan_id: string }>();
  if (!org) return c.json({ error: 'Org not found' }, 404);

  const { count } = await c.env.PBX_DB
    .prepare(`SELECT COUNT(*) AS count FROM phone_numbers WHERE org_id=? AND status='active'`)
    .bind(orgId).first<{ count: number }>() ?? { count: 0 };

  const limit = PLAN_DID_LIMITS[org.plan_id] ?? 3;
  if (count >= limit)
    return c.json({ error: `DID limit (${limit}) reached for ${org.plan_id} plan` }, 402);

  // Get this tenant's Telnyx connection_id
  const connectionId = await getOrgConnection(orgId, c.env.PBX_DB);

  // Purchase under master org, assign to tenant's credential connection
  const result = await telnyxFetch<{ data: Record<string, unknown> }>(
    '/phone_numbers', c.env.TELNYX_API_KEY, {
      method: 'POST',
      body: JSON.stringify({
        phone_number:       parsed.data.phoneNumber,
        connection_id:      connectionId,       // ← routes calls to tenant's SIP connection
        customer_reference: orgId,
        tags:               [`org:${orgId}`],
      }),
    },
  );
  const did = result.data;

  await c.env.PBX_DB.prepare(`
    INSERT INTO phone_numbers (org_id, phone_number, telnyx_id, friendly_name, status, purchased_at)
    VALUES (?,?,?,?,'active',CURRENT_TIMESTAMP)
  `).bind(orgId, parsed.data.phoneNumber, did.id, parsed.data.friendlyName ?? parsed.data.phoneNumber).run();

  // DID → orgId in KV (webhook dispatch)
  await c.env.PBX_KV.put(`telnyx:did:${parsed.data.phoneNumber}`, orgId);

  c.env.ANALYTICS.writeDataPoint({
    blobs: ['number_purchased', orgId, parsed.data.phoneNumber], doubles: [1], indexes: [orgId],
  });

  return c.json({ ok: true, data: did });
});

// ── DELETE /api/pbx/numbers/:encoded — release ───────────────────────────────
numbers.delete('/:encoded', async (c) => {
  const orgId  = c.get('orgId') as string;
  const number = decodeURIComponent(c.req.param('encoded'));

  const row = await c.env.PBX_DB
    .prepare(`SELECT id, telnyx_id FROM phone_numbers WHERE org_id=? AND phone_number=? AND status='active' LIMIT 1`)
    .bind(orgId, number).first<{ id: number; telnyx_id: string }>();
  if (!row) return c.json({ error: 'Number not found or already released' }, 404);

  await telnyxFetch(`/phone_numbers/${row.telnyx_id}`, c.env.TELNYX_API_KEY, { method: 'DELETE' });

  await c.env.PBX_DB
    .prepare(`UPDATE phone_numbers SET status='released', released_at=CURRENT_TIMESTAMP WHERE id=?`)
    .bind(row.id).run();

  await c.env.PBX_KV.delete(`telnyx:did:${number}`);

  return c.json({ ok: true });
});

// ── POST /api/pbx/numbers/port ───────────────────────────────────────────────
numbers.post('/port', async (c) => {
  const orgId  = c.get('orgId') as string;
  const parsed = PortSchema.safeParse(await c.req.json());
  if (!parsed.success) return c.json({ error: parsed.error.issues }, 422);

  const connectionId = await getOrgConnection(orgId, c.env.PBX_DB);

  const order = await telnyxFetch<{ data: Record<string, unknown> }>(
    '/porting_orders', c.env.TELNYX_API_KEY, {
      method: 'POST',
      body: JSON.stringify({
        phone_numbers: [{ phone_number: parsed.data.phoneNumber }],
        end_user: {
          company_name: parsed.data.billingName,
          location:     { street_address: parsed.data.serviceAddress },
        },
        misc: {
          account_number:    parsed.data.accountNumber,
          pin_or_password:   parsed.data.pinOrPassword,
          authorized_person: parsed.data.loaSignedBy,
        },
        connection_id: connectionId,
      }),
    },
  );

  await c.env.PBX_DB.prepare(`
    INSERT INTO phone_numbers (org_id, phone_number, telnyx_id, friendly_name, status, purchased_at)
    VALUES (?,?,?,?,'porting',CURRENT_TIMESTAMP)
  `).bind(orgId, parsed.data.phoneNumber, order.data.id, parsed.data.phoneNumber).run();

  return c.json({ ok: true, orderId: order.data.id });
});

export default numbers;

