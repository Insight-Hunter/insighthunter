import { Hono } from 'hono';
import type { Context, Next } from 'hono';

type BizFormaStatus =
  | 'QUESTIONNAIRE'
  | 'ENTITY_SELECTED'
  | 'EIN_PENDING'
  | 'EIN_COMPLETE'
  | 'STATE_PENDING'
  | 'STATE_COMPLETE'
  | 'TAX_SETUP'
  | 'COMPLETE';

type EntityType =
  | 'SOLE_PROP'
  | 'LLC'
  | 'S_CORP'
  | 'C_CORP'
  | 'PARTNERSHIP'
  | 'NONPROFIT';

type AuthUser = {
  userId: string;
  orgId: string;
  email: string;
  name: string;
  tier: 'free' | 'lite' | 'standard' | 'pro' | 'enterprise';
  role: 'owner' | 'admin' | 'member' | 'viewer';
};

type FormationCaseRow = {
  id: string;
  org_id: string;
  user_id: string;
  status: BizFormaStatus;
  entity_type: EntityType | null;
  business_name: string | null;
  state: string | null;
  created_at: string;
  updated_at: string;
};

type Env = {
  DB: D1Database;
  DOCUMENTS: R2Bucket;
  CACHE: KVNamespace;
  AUTH_BASE_URL: string;
  APP_BASE_URL: string;
  PUBLIC_APP_URL: string;
  BOOKKEEPING_WORKER_URL: string;
  ENVIRONMENT: string;
  JWT_SECRET?: string;
  X_INTERNAL_SECRET?: string;
};

type Variables = {
  user: AuthUser;
};

const app = new Hono<{ Bindings: Env; Variables: Variables }>();

app.use('*', async (c, next) => {
  c.header('Access-Control-Allow-Origin', c.req.header('Origin') ?? c.env.APP_BASE_URL);
  c.header('Access-Control-Allow-Headers', 'Authorization, Content-Type, X-Internal-Secret');
  c.header('Access-Control-Allow-Methods', 'GET, POST, PATCH, PUT, DELETE, OPTIONS');
  c.header('Access-Control-Allow-Credentials', 'true');

  if (c.req.method === 'OPTIONS') {
    return c.body(null, 204);
  }

  await next();
});

app.get('/health', (c) =>
  c.json({
    ok: true,
    service: 'insighthunter-bizforma',
    environment: c.env.ENVIRONMENT,
    authBaseUrl: c.env.AUTH_BASE_URL,
    appBaseUrl: c.env.APP_BASE_URL,
  }),
);

app.get('/auth/login', (c) => {
  const redirectUri = `${c.env.APP_BASE_URL}/auth/callback`;
  const loginUrl = new URL('/login', c.env.AUTH_BASE_URL);
  loginUrl.searchParams.set('redirect_uri', redirectUri);
  return c.redirect(loginUrl.toString(), 302);
});

app.get('/auth/signup', (c) => {
  const redirectUri = `${c.env.APP_BASE_URL}/auth/callback`;
  const signupUrl = new URL('/register', c.env.AUTH_BASE_URL);
  signupUrl.searchParams.set('redirect_uri', redirectUri);
  return c.redirect(signupUrl.toString(), 302);
});

app.get('/auth/callback', (c) => {
  return c.html(`<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width,initial-scale=1" />
    <title>Signing you in…</title>
  </head>
  <body>
    <script>
      const params = new URLSearchParams(window.location.search);
      const accessToken = params.get('access_token');
      if (accessToken) {
        document.cookie = "ih_access_token=" + encodeURIComponent(accessToken) + "; Path=/; Secure; SameSite=Lax";
      }
      window.location.replace('/app');
    </script>
  </body>
</html>`);
});

app.use('/api/*', requireAuth);

app.get('/api/me', (c) => {
  return c.json({ user: c.get('user') });
});

app.get('/api/dashboard', async (c) => {
  const user = c.get('user');
  const summary = await c.env.DB.prepare(
    `
      SELECT
        COUNT(*) AS totalCases,
        SUM(CASE WHEN status = 'COMPLETE' THEN 1 ELSE 0 END) AS completeCases,
        SUM(CASE WHEN status != 'COMPLETE' THEN 1 ELSE 0 END) AS activeCases
      FROM formation_cases
      WHERE org_id = ?
    `,
  )
    .bind(user.orgId)
    .first<{
      totalCases: number | null;
      completeCases: number | null;
      activeCases: number | null;
    }>();

  return c.json({
    orgId: user.orgId,
    summary: {
      totalCases: Number(summary?.totalCases ?? 0),
      completeCases: Number(summary?.completeCases ?? 0),
      activeCases: Number(summary?.activeCases ?? 0),
    },
  });
});

app.get('/api/cases', async (c) => {
  const user = c.get('user');
  const rows = await c.env.DB.prepare(
    `
      SELECT id, org_id, user_id, status, entity_type, business_name, state, created_at, updated_at
      FROM formation_cases
      WHERE org_id = ?
      ORDER BY updated_at DESC
    `,
  )
    .bind(user.orgId)
    .all<FormationCaseRow>();

  return c.json({ items: rows.results ?? [] });
});

app.post('/api/cases', async (c) => {
  const user = c.get('user');
  const body = await c.req.json<{
    business_name?: string;
    entity_type?: EntityType;
    state?: string;
  }>();

  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  const businessName = body.business_name?.trim() || null;
  const entityType = body.entity_type ?? null;
  const state = body.state?.trim().toUpperCase() || null;

  await c.env.DB.prepare(
    `
      INSERT INTO formation_cases (
        id, org_id, user_id, status, entity_type, business_name, state, created_at, updated_at
      ) VALUES (?, ?, ?, 'QUESTIONNAIRE', ?, ?, ?, ?, ?)
    `,
  )
    .bind(id, user.orgId, user.userId, entityType, businessName, state, now, now)
    .run();

  return c.json(
    {
      id,
      org_id: user.orgId,
      user_id: user.userId,
      status: 'QUESTIONNAIRE',
      entity_type: entityType,
      business_name: businessName,
      state,
      created_at: now,
      updated_at: now,
    },
    201,
  );
});

app.patch('/api/cases/:id', async (c) => {
  const user = c.get('user');
  const caseId = c.req.param('id');
  const body = await c.req.json<{
    status?: BizFormaStatus;
    entity_type?: EntityType;
    business_name?: string;
    state?: string;
  }>();

  const existing = await c.env.DB.prepare(
    `
      SELECT id, org_id, user_id, status, entity_type, business_name, state, created_at, updated_at
      FROM formation_cases
      WHERE id = ? AND org_id = ?
    `,
  )
    .bind(caseId, user.orgId)
    .first<FormationCaseRow>();

  if (!existing) {
    return c.json({ error: 'Case not found' }, 404);
  }

  const nextStatus = body.status ?? existing.status;
  const nextEntity = body.entity_type ?? existing.entity_type;
  const nextName = body.business_name?.trim() ?? existing.business_name;
  const nextState = body.state?.trim().toUpperCase() ?? existing.state;
  const updatedAt = new Date().toISOString();

  await c.env.DB.prepare(
    `
      UPDATE formation_cases
      SET status = ?, entity_type = ?, business_name = ?, state = ?, updated_at = ?
      WHERE id = ? AND org_id = ?
    `,
  )
    .bind(nextStatus, nextEntity, nextName, nextState, updatedAt, caseId, user.orgId)
    .run();

  if (nextStatus === 'COMPLETE') {
    await seedBookkeeping(c.env, user.orgId);
  }

  return c.json({
    ...existing,
    status: nextStatus,
    entity_type: nextEntity,
    business_name: nextName,
    state: nextState,
    updated_at: updatedAt,
  });
});

app.get('/api/compliance', async (c) => {
  const user = c.get('user');
  const rows = await c.env.DB.prepare(
    `
      SELECT id, org_id, case_id, type, title, due_date, status, notes, created_at
      FROM compliance_events
      WHERE org_id = ?
      ORDER BY due_date ASC
    `,
  )
    .bind(user.orgId)
    .all();

  return c.json({ items: rows.results ?? [] });
});

app.post('/api/compliance', async (c) => {
  const user = c.get('user');
  const body = await c.req.json<{
    case_id?: string | null;
    type: string;
    title: string;
    due_date: string;
    notes?: string;
  }>();

  const id = crypto.randomUUID();
  const createdAt = new Date().toISOString();

  await c.env.DB.prepare(
    `
      INSERT INTO compliance_events (
        id, org_id, case_id, type, title, due_date, status, notes, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, 'PENDING', ?, ?)
    `,
  )
    .bind(
      id,
      user.orgId,
      body.case_id ?? null,
      body.type.trim(),
      body.title.trim(),
      body.due_date.trim(),
      body.notes?.trim() ?? null,
      createdAt,
    )
    .run();

  return c.json(
    {
      id,
      org_id: user.orgId,
      case_id: body.case_id ?? null,
      type: body.type.trim(),
      title: body.title.trim(),
      due_date: body.due_date.trim(),
      status: 'PENDING',
      notes: body.notes?.trim() ?? null,
      created_at: createdAt,
    },
    201,
  );
});

app.get('/app', (c) => {
  return c.html(renderShell(c.env.APP_BASE_URL, c.env.AUTH_BASE_URL));
});

app.get('*', (c) => {
  return c.html(renderShell(c.env.APP_BASE_URL, c.env.AUTH_BASE_URL));
});

async function requireAuth(c: Context<{ Bindings: Env; Variables: Variables }>, next: Next) {
  const token = extractToken(c.req.header('Authorization'), c.req.header('Cookie'));

  if (!token) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  const verifyUrl = new URL('/auth/verify', c.env.AUTH_BASE_URL);
  const verifyResponse = await fetch(verifyUrl.toString(), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Internal-Secret': c.env.X_INTERNAL_SECRET ?? c.env.JWT_SECRET ?? '',
    },
    body: JSON.stringify({ token }),
  });

  if (!verifyResponse.ok) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  const payload = (await verifyResponse.json()) as AuthUser;
  c.set('user', payload);
  await next();
}

function extractToken(authHeader?: string | null, cookieHeader?: string | null) {
  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.slice(7).trim();
  }

  if (!cookieHeader) {
    return null;
  }

  const cookies = cookieHeader.split(';').map((part) => part.trim());
  const tokenCookie = cookies.find((cookie) => cookie.startsWith('ih_access_token='));
  return tokenCookie ? decodeURIComponent(tokenCookie.split('=').slice(1).join('=')) : null;
}

async function seedBookkeeping(env: Env, orgId: string) {
  const url = new URL('/seed', env.BOOKKEEPING_WORKER_URL);

  try {
    await fetch(url.toString(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Internal-Secret': env.X_INTERNAL_SECRET ?? env.JWT_SECRET ?? '',
        'X-Org-Id': orgId,
      },
    });
  } catch {
    return;
  }
}

function renderShell(appBaseUrl: string, authBaseUrl: string) {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width,initial-scale=1" />
    <title>BizForma · Insight Hunter</title>
    <link rel="icon" href="/favicon.svg" />
    <script type="module" src="/src/main.tsx"></script>
  </head>
  <body>
    <div id="root"></div>
    <script>
      window.__BIZFORMA_CONFIG__ = ${JSON.stringify({
        appBaseUrl,
        authBaseUrl,
      })};
    </script>
  </body>
</html>`;
}
