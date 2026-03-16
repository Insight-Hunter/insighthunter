
const fs = require('node:fs');
const path = require('node:path');
const { execSync } = require('node:child_process');

const ROOT = path.join(process.cwd(), 'apps', 'insighthunter-bizforma');

const files = {
  'wrangler.toml': `
name = "insighthunter-bizforma"
main = "src/backend/index.ts"
compatibility_date = "2025-03-07"
compatibility_flags = ["nodejs_compat"]

[observability]
enabled = true
head_sampling_rate = 1

[[d1_databases]]
binding = "DB"
database_name = "bizforma-db"
database_id = "XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX"

[[r2_buckets]]
binding = "R2_DOCS"
bucket_name = "bizforma-documents"

[durable_objects]
bindings = [
  { name = "FORMATION_AGENT", class_name = "FormationAgent" },
  { name = "COMPLIANCE_AGENT", class_name = "ComplianceAgent" }
]

[[migrations]]
tag = "v1"
new_sqlite_classes = ["FormationAgent", "ComplianceAgent"]

[[analytics_engine_datasets]]
binding = "ANALYTICS"
dataset = "bizforma-requests"

[vars]
AUTH_WORKER_URL = "https://auth.insighthunter.workers.dev"
`,
  'tsconfig.json': `{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "jsx": "react-jsx",
    "types": ["@cloudflare/workers-types", "vite/client"],
    "baseUrl": ".",
    "paths": {
      "@backend/*": ["src/backend/*"],
      "@frontend/*": ["src/frontend/*"]
    }
  },
  "include": ["src"]
}
`,
  'vite.config.ts': `import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  root: 'src/frontend',
  build: {
    outDir: '../../dist/bizforma-frontend',
    emptyOutDir: true,
  },
});
`,
  'package.json': `{
  "name": "insighthunter-bizforma",
  "private": true,
  "scripts": {
    "dev": "wrangler dev",
    "dev:frontend": "vite",
    "build": "wrangler deploy --dry-run",
    "build:frontend": "vite build",
    "deploy": "wrangler deploy"
  },
  "dependencies": {
    "hono": "^4.6.0",
    "react": "^18.3.0",
    "react-dom": "^18.3.0",
    "react-router-dom": "^6.22.0"
  },
  "devDependencies": {
    "@cloudflare/workers-types": "^4.20250211.0",
    "@types/react": "^18.2.74",
    "@types/react-dom": "^18.2.25",
    "typescript": "^5.6.0",
    "vite": "^5.1.0",
    "@vitejs/plugin-react": "^4.0.0"
  }
}
`,
  'src/backend/index.ts': `import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger as honoLogger } from 'hono/logger';
import { HTTPException } from 'hono/http-exception';

import type { Env, FormationCase, ApiError } from './types';
import { registerFormationRoutes } from './routes/formation';
import { registerEntityDeterminationRoutes } from './routes/entityDetermination';
import { registerEinRoutes } from './routes/ein';
import { registerStateRegistrationRoutes } from './routes/stateRegistration';
import { registerTaxAccountRoutes } from './routes/taxAccounts';
import { registerComplianceRoutes } from './routes/compliance';
import { registerDocumentRoutes } from './routes/documents';
import { authMiddleware } from './middleware/auth';
import { requestLogger } from './middleware/logger';

const app = new Hono();

app.use('*', cors());
app.use('*', honoLogger());
app.use('*', requestLogger);
app.use('*', authMiddleware);

app.get('/health', (c) => c.json({ ok: true, service: 'bizforma' }));

registerFormationRoutes(app);
registerEntityDeterminationRoutes(app);
registerEinRoutes(app);
registerStateRegistrationRoutes(app);
registerTaxAccountRoutes(app);
registerComplianceRoutes(app);
registerDocumentRoutes(app);

app.all('*', (c) => c.json({ error: 'Not found' }, 404));

app.onError((err, c) => {
  console.error('Unhandled error', err);

  if (err instanceof HTTPException) {
    return c.json(
      {
        error: err.message,
        details: err.cause instanceof Error ? err.cause.message : undefined,
      },
      err.status
    );
  }

  return c.json({ error: 'Internal server error' }, 500);
});

export default app;
`,
  'src/backend/types.ts': `export interface Env {
  DB: D1Database;
  R2_DOCS: R2Bucket;
  AUTH_WORKER_URL: string;
  ANALYTICS: AnalyticsEngineDataset;
  FORMATION_AGENT: DurableObjectNamespace<FormationAgent>;
  COMPLIANCE_AGENT: DurableObjectNamespace<ComplianceAgent>;
}

export interface FormationCase {
  id: string;
  userId: string;
  status: 'NEW' | 'IN_PROGRESS' | 'FILED' | 'COMPLETE' | 'CANCELLED';
  entityType: string | null;
  state: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ApiError {
  error: string;
  details?: string;
}

export interface Paginated<T> {
  items: T[];
  total: number;
}

export interface FormationAgent extends DurableObject {}
export interface ComplianceAgent extends DurableObject {}
`,
  'src/backend/middleware/auth.ts': `import type { MiddlewareHandler } from 'hono';
import { HTTPException } from 'hono/http-exception';
import type { Env } from '../types';

interface AuthResponse {
  authenticated: boolean;
  userId?: string;
}

export const authMiddleware: MiddlewareHandler<{ Bindings: Env; Variables: { userId?: string } }> =
  async (c, next) => {
    const authHeader = c.req.header('Authorization');
    const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : undefined;

    if (!token) {
      throw new HTTPException(401, { message: 'Missing Authorization token' });
    }

    const url = new URL('/auth/validate', c.env.AUTH_WORKER_URL);
    const res = await fetch(url.toString(), {
      method: 'GET',
      headers: { Authorization: \`Bearer \${token}\` },
    });

    if (!res.ok) {
      throw new HTTPException(res.status, { message: 'Auth worker rejected token' });
    }

    const body = (await res.json()) as AuthResponse;
    if (!body.authenticated || !body.userId) {
      throw new HTTPException(401, { message: 'Unauthenticated' });
    }

    c.set('userId', body.userId);
    await next();
  };
`,
  'src/backend/middleware/logger.ts': `import type { MiddlewareHandler } from 'hono';
import type { Env } from '../types';

export const requestLogger: MiddlewareHandler<{ Bindings: Env }> = async (c, next) => {
  const start = Date.now();
  await next();
  const duration = Date.now() - start;

  try {
    await c.env.ANALYTICS.writeDataPoint({
      blobs: ['bizforma_request', c.req.method, c.req.path],
      doubles: [duration],
      indexes: [c.req.header('cf-connecting-ip') ?? 'unknown'],
    });
  } catch (e) {
    console.error('Analytics write failed', e);
  }
};
`,
  'src/backend/routes/formation.ts': `import type { Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';
import type { Env, FormationCase, Paginated } from '../types';
import { bookkeepingHandoffService } from '../services/bookkeepingHandoffService';

export function registerFormationRoutes(
  app: Hono<{ Bindings: Env; Variables: { userId?: string } }>
) {
  const base = '/api/formation';

  app.get(\`\${base}\`, async (c) => {
    const userId = c.var.userId!;
    const page = Number(c.req.query('page') ?? '1');
    const pageSize = Number(c.req.query('pageSize') ?? '20');
    const offset = (page - 1) * pageSize;

    const list = await c.env.DB.prepare(
      \`SELECT * FROM formation_cases WHERE user_id = ? ORDER BY created_at DESC LIMIT ? OFFSET ?\`
    )
      .bind(userId, pageSize, offset)
      .all<FormationCase>();

    const count = await c.env.DB.prepare(
      \`SELECT COUNT(*) as total FROM formation_cases WHERE user_id = ?\`
    )
      .bind(userId)
      .first<{ total: number }>();

    return c.json<Paginated<FormationCase>>({
      items: list.results ?? [],
      total: count?.total ?? 0,
    });
  });

  app.post(\`\${base}\`, async (c) => {
    const userId = c.var.userId!;
    const body = await c.req.json<{ entityType?: string; state?: string }>().catch(() => ({}));

    const id = crypto.randomUUID();
    const now = new Date().toISOString();

    await c.env.DB.prepare(
      \`INSERT INTO formation_cases (id, user_id, status, entity_type, state, created_at, updated_at)
       VALUES (?, ?, 'NEW', ?, ?, ?, ?)\`
    )
      .bind(id, userId, body.entityType ?? null, body.state ?? null, now, now)
      .run();

    const row = await c.env.DB.prepare(
      \`SELECT * FROM formation_cases WHERE id = ? AND user_id = ?\`
    )
      .bind(id, userId)
      .first<FormationCase>();

    return c.json(row, 201);
  });

  app.get(\`\${base}/:id\`, async (c) => {
    const userId = c.var.userId!;
    const id = c.req.param('id');

    const row = await c.env.DB.prepare(
      \`SELECT * FROM formation_cases WHERE id = ? AND user_id = ?\`
    )
      .bind(id, userId)
      .first<FormationCase>();

    if (!row) throw new HTTPException(404, { message: 'Formation case not found' });
    return c.json(row);
  });

  app.patch(\`\${base}/:id\`, async (c) => {
    const userId = c.var.userId!;
    const id = c.req.param('id');
    const body = (await c.req.json().catch(() => ({}))) as Partial<FormationCase>;

    const now = new Date().toISOString();
    await c.env.DB.prepare(
      \`UPDATE formation_cases
       SET status = COALESCE(?, status),
           entity_type = COALESCE(?, entity_type),
           state = COALESCE(?, state),
           updated_at = ?
       WHERE id = ? AND user_id = ?\`
    )
      .bind(body.status ?? null, body.entityType ?? null, body.state ?? null, now, id, userId)
      .run();

    const updated = await c.env.DB.prepare(
      \`SELECT * FROM formation_cases WHERE id = ? AND user_id = ?\`
    )
      .bind(id, userId)
      .first<FormationCase>();

    if (!updated) throw new HTTPException(404, { message: 'Formation case not found after update' });

    if (updated.status === 'COMPLETE') {
      c.executionCtx.waitUntil(bookkeepingHandoffService.onFormationComplete(c.env, updated));
    }

    return c.json(updated);
  });
}
`,
  'src/backend/routes/entityDetermination.ts': `import type { Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';
import type { Env } from '../types';
import { entityDeterminationService } from '../services/entityDeterminationService';

export function registerEntityDeterminationRoutes(
  app: Hono<{ Bindings: Env; Variables: { userId?: string } }>
) {
  const base = '/api/entity';

  app.post(\`\${base}/questionnaire\`, async (c) => {
    const body = await c.req.json().catch(() => null);
    if (!body) throw new HTTPException(400, { message: 'Invalid questionnaire payload' });

    const result = await entityDeterminationService.scoreAndRecommend(c.env, body);
    return c.json(result);
  });
}
`,
  'src/backend/routes/ein.ts': `import type { Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';
import type { Env } from '../types';
import { einService } from '../services/einService';

export function registerEinRoutes(
  app: Hono<{ Bindings: Env; Variables: { userId?: string } }>
) {
  const base = '/api/ein';

  app.post(\`\${base}/prefill\`, async (c) => {
    const userId = c.var.userId!;
    const body = await c.req.json().catch(() => null);
    if (!body) throw new HTTPException(400, { message: 'Invalid EIN payload' });

    const res = await einService.buildSs4Draft(c.env, userId, body);
    return c.json(res);
  });
}
`,
  'src/backend/routes/stateRegistration.ts': `import type { Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';
import type { Env } from '../types';
import { stateRegistrationService } from '../services/stateRegistrationService';

export function registerStateRegistrationRoutes(
  app: Hono<{ Bindings: Env; Variables: { userId?: string } }>
) {
  const base = '/api/state-registration';

  app.get(\`\${base}/wizard\`, async (c) => {
    const state = c.req.query('state');
    if (!state) throw new HTTPException(400, { message: 'state is required' });

    const wizard = await stateRegistrationService.getWizardConfig(c.env, state);
    return c.json(wizard);
  });
}
`,
  'src/backend/routes/taxAccounts.ts': `import type { Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';
import type { Env } from '../types';
import { taxAccountService } from '../services/taxAccountService';

export function registerTaxAccountRoutes(
  app: Hono<{ Bindings: Env; Variables: { userId?: string } }>
) {
  const base = '/api/tax-accounts';

  app.get(\`\${base}/checklist\`, async (c) => {
    const state = c.req.query('state');
    const entityType = c.req.query('entityType');
    if (!state || !entityType) {
      throw new HTTPException(400, { message: 'state and entityType are required' });
    }

    const checklist = await taxAccountService.buildChecklist(c.env, {
      state,
      entityType,
    });

    return c.json(checklist);
  });
}
`,
  'src/backend/routes/compliance.ts': `import type { Hono } from 'hono';
import type { Env } from '../types';
import { complianceService } from '../services/complianceService';

export function registerComplianceRoutes(
  app: Hono<{ Bindings: Env; Variables: { userId?: string } }>
) {
  const base = '/api/compliance';

  app.get(\`\${base}/calendar\`, async (c) => {
    const userId = c.var.userId!;
    const events = await complianceService.getEventsForUser(c.env, userId);
    return c.json(events);
  });
}
`,
  'src/backend/routes/documents.ts': `import type { Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';
import type { Env } from '../types';
import { documentService } from '../services/documentService';

export function registerDocumentRoutes(
  app: Hono<{ Bindings: Env; Variables: { userId?: string } }>
) {
  const base = '/api/documents';

  app.post(\`\${base}/upload\`, async (c) => {
    const userId = c.var.userId!;
    const formData = await c.req.formData();
    const file = formData.get('file');
    if (!(file instanceof File)) {
      throw new HTTPException(400, { message: 'file is required' });
    }

    const key = await documentService.upload(c.env, userId, file);
    return c.json({ key });
  });

  app.get(\`\${base}/:key\`, async (c) => {
    const userId = c.var.userId!;
    const key = c.req.param('key');

    const obj = await documentService.get(c.env, userId, key);
    if (!obj) throw new HTTPException(404, { message: 'Document not found' });

    return new Response(obj.body, {
      headers: {
        'Content-Type': obj.httpMetadata?.contentType ?? 'application/octet-stream',
        'Content-Disposition': \`attachment; filename="\${key}"\`,
      },
    });
  });
}
`,
  'src/backend/services/entityDeterminationService.ts': `import type { Env } from '../types';
import { entityMatrix } from '../utils/entityMatrix';

interface QuestionnaireInput {
  answers: Record<string, number | string | boolean>;
}

interface EntityRecommendation {
  entityType: string;
  confidence: number;
  rationale: string[];
}

export const entityDeterminationService = {
  async scoreAndRecommend(env: Env, input: QuestionnaireInput): Promise<EntityRecommendation> {
    const { entityType, scoreBreakdown } = entityMatrix.score(input.answers);

    return {
      entityType,
      confidence: 0.8,
      rationale: scoreBreakdown.map((b) => b.reason),
    };
  },
};
`,
  'src/backend/services/einService.ts': `import type { Env } from '../types';

export const einService = {
  async buildSs4Draft(env: Env, userId: string, payload: unknown) {
    return {
      pdfTemplate: 'ss4-draft-v1',
      fields: {
        legalName: 'TBD LLC',
        tradeName: null,
        entityType: 'LLC',
      },
      guidance: [
        'Review legal name exactly as it should appear on IRS records.',
        'Confirm responsible party SSN/ITIN separately; do not store raw SSN here.',
      ],
    };
  },
};
`,
  'src/backend/services/stateRegistrationService.ts': `import type { Env } from '../types';
import { stateRules } from '../utils/stateRules';

export const stateRegistrationService = {
  async getWizardConfig(env: Env, state: string) {
    const rules = stateRules[state] ?? stateRules.DEFAULT;
    return {
      state,
      filingFee: rules.filingFee,
      expectedTimelineDays: rules.timelineDays,
      steps: rules.steps,
    };
  },
};
`,
  'src/backend/services/taxAccountService.ts': `import type { Env } from '../types';

interface ChecklistInput {
  state: string;
  entityType: string;
}

export const taxAccountService = {
  async buildChecklist(env: Env, input: ChecklistInput) {
    return [
      {
        id: 'eftps',
        label: 'Enroll in EFTPS',
        url: 'https://www.eftps.gov/eftps/',
        required: true,
      },
      {
        id: 'state_withholding',
        label: \`Register for \${input.state} withholding (if employees)\`,
        url: 'https://www.google.com/search?q=' + encodeURIComponent(\`\${input.state} withholding tax registration\`),
        required: true,
      },
    ];
  },
};
`,
  'src/backend/services/complianceService.ts': `import type { Env } from '../types';

interface ComplianceEvent {
  id: string;
  dueDate: string;
  label: string;
  type: 'FILING' | 'PAYMENT';
  status: 'UPCOMING' | 'PAST_DUE' | 'COMPLETED';
}

export const complianceService = {
  async getEventsForUser(env: Env, userId: string): Promise<ComplianceEvent[]> {
    const now = new Date();
    return [
      {
        id: 'annual-report',
        dueDate: new Date(now.getFullYear(), 3, 15).toISOString(),
        label: 'State annual report',
        type: 'FILING',
        status: 'UPCOMING',
      },
    ];
  },
};
`,
  'src/backend/services/documentService.ts': `import type { Env } from '../types';

export const documentService = {
  async upload(env: Env, userId: string, file: File): Promise<string> {
    const key = \`\${userId}/\${Date.now()}-\${file.name}\`;
    await env.R2_DOCS.put(key, await file.arrayBuffer(), {
      httpMetadata: { contentType: file.type },
    });
    return key;
  },

  async get(env: Env, userId: string, key: string) {
    if (!key.startsWith(\`\${userId}/\`)) {
      return null;
    }
    return env.R2_DOCS.get(key);
  },
};
`,
  'src/backend/services/bookkeepingHandoffService.ts': `import type { Env, FormationCase } from '../types';

export const bookkeepingHandoffService = {
  async onFormationComplete(env: Env, formation: FormationCase) {
    console.log('Formation complete; seeding CoA', formation.id);
  },
};
`,
  'src/backend/utils/stateRules.ts': `export const stateRules: Record<
  string,
  { filingFee: number; timelineDays: number; steps: string[] }
> = {
  DEFAULT: {
    filingFee: 100,
    timelineDays: 10,
    steps: ['Prepare articles', 'File with SOS', 'Obtain EIN'],
  },
  GA: {
    filingFee: 100,
    timelineDays: 7,
    steps: ['Reserve name (optional)', 'File with Georgia SOS', 'Publish if required'],
  },
};
`,
  'src/backend/utils/entityMatrix.ts': `interface ScoreResult {
  entityType: string;
  scoreBreakdown: { reason: string; weight: number }[];
}

export const entityMatrix = {
  score(answers: Record<string, unknown>): ScoreResult {
    return {
      entityType: 'LLC',
      scoreBreakdown: [
        { reason: 'Default entity type for small businesses', weight: 0.7 },
        { reason: 'Liability protection preferred', weight: 0.3 },
      ],
    };
  },
};
`,
  'src/backend/db/schema.sql': `CREATE TABLE IF NOT EXISTS formation_cases (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  status TEXT NOT NULL,
  entity_type TEXT,
  state TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
`,
  'src/backend/agents/FormationAgent.ts': `import { DurableObject } from 'cloudflare:workers';
import type { Env } from '../types';

interface FormationState {
  id: string;
  lastStatus: string;
  updatedAt: string;
}

export class FormationAgent extends DurableObject<Env> {
  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env);
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    if (url.pathname.endsWith('/state')) {
      const state = (await this.ctx.storage.get<FormationState>('state')) ?? null;
      return Response.json(state);
    }

    return new Response('Not found', { status: 404 });
  }
}
`,
  'src/backend/agents/ComplianceAgent.ts': `import { DurableObject } from 'cloudflare:workers';
import type { Env } from '../types';

export class ComplianceAgent extends DurableObject<Env> {
  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env);
  }

  async alarm(): Promise<void> {
    console.log('ComplianceAgent alarm fired');
  }
}
`,
  'src/frontend/main.tsx': `import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { App } from './App';
import { Home } from './pages/Home';
import { NewFormation } from './pages/NewFormation';
import { FormationCasePage } from './pages/FormationCase';
import { CompliancePage } from './pages/Compliance';
import { DocumentsPage } from './pages/Documents';
import './styles/globals.scss';

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <BrowserRouter>
      <App>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/formation/new" element={<NewFormation />} />
          <Route path="/formation/:id" element={<FormationCasePage />} />
          <Route path="/compliance" element={<CompliancePage />} />
          <Route path="/documents" element={<DocumentsPage />} />
        </Routes>
      </App>
    </BrowserRouter>
  </React.StrictMode>
);
`,
  'src/frontend/App.tsx': `import React from 'react';
import { Shell } from './components/layout/Shell';

export const App: React.FC<React.PropsWithChildren> = ({ children }) => {
  return <Shell>{children}</Shell>;
};
`,
  'src/frontend/components/layout/Shell.tsx': `import React from 'react';
import { Link } from 'react-router-dom';

export const Shell: React.FC<React.PropsWithChildren> = ({ children }) => (
  <div className="shell">
    <header className="shell__header">
      <h1>BizForma</h1>
      <nav>
        <Link to="/">Home</Link>
        <Link to="/formation/new">New formation</Link>
        <Link to="/compliance">Compliance</Link>
        <Link to="/documents">Documents</Link>
      </nav>
    </header>
    <main className="shell__main">{children}</main>
  </div>
);
`,
  'src/frontend/pages/Home.tsx': `import React from 'react';

export const Home: React.FC = () => (
  <section>
    <h2>Formation & compliance cockpit</h2>
    <p>Track entity setup, EIN, state registration, tax accounts and compliance in one place.</p>
  </section>
);
`,
  'src/frontend/pages/NewFormation.tsx': `import React from 'react';

export const NewFormation: React.FC = () => (
  <section>
    <h2>New formation</h2>
    <p>Start a new entity formation case.</p>
  </section>
);
`,
  'src/frontend/pages/FormationCase.tsx': `import React from 'react';

export const FormationCasePage: React.FC = () => (
  <section>
    <h2>Formation case</h2>
    <p>Formation case details will appear here.</p>
  </section>
);
`,
  'src/frontend/pages/Compliance.tsx': `import React from 'react';

export const CompliancePage: React.FC = () => (
  <section>
    <h2>Compliance</h2>
    <p>Compliance calendar and reminders.</p>
  </section>
);
`,
  'src/frontend/pages/Documents.tsx': `import React from 'react';

export const DocumentsPage: React.FC = () => (
  <section>
    <h2>Documents</h2>
    <p>Upload and download formation documents.</p>
  </section>
);
`,
  'src/frontend/styles/globals.scss': `.shell {
  font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
}

.shell__header {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1rem;
  border-bottom: 1px solid #eee;
}

.shell__main {
  padding: 1.5rem;
}
`
};

function ensureDir(p) {
  if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true });
}

function writeAll() {
  for (const [rel, content] of Object.entries(files)) {
    const full = path.join(ROOT, rel);
    ensureDir(path.dirname(full));
    fs.writeFileSync(full, content, 'utf8');
  }
}

ensureDir(ROOT);
writeAll();
