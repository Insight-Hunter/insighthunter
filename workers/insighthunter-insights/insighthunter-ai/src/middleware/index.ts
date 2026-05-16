// packages/agents/src/index.ts
import { DurableObject } from 'cloudflare:workers';

// ─── Types ────────────────────────────────────────────────────────────────────

type Plan = 'lite' | 'standard' | 'pro';
type SubscriptionStatus = 'active' | 'past_due' | 'cancelled';

interface Env {
  CFO_AGENT:    DurableObjectNamespace;
  AUTH_WORKER:  Fetcher;
  AI:           Ai;
  VECTORIZE:    VectorizeIndex;
  CACHE:        KVNamespace;
  EVENTS:       AnalyticsEngineDataset;
  ENVIRONMENT:  string;
  SITE_URL:     string;
  AI_MODEL:     string;
  AI_MODEL_PRO: string;
  OPENAI_API_KEY?: string;
  AI_GATEWAY_URL?: string;
}

interface SessionPayload {
  userId: string;
  plan:   Plan;
}

interface FinancialContext {
  totalRevenue?:          number;
  totalExpenses?:         number;
  netIncome?:             number;
  cashBalance?:           number;
  outstandingInvoices?:   number;
  overdueInvoices?:       number;
  periodLabel?:           string;
  revenueGrowthPct?:      number;
  burnRate?:              number;
  runwayMonths?:          number;
  topExpenseCategories?:  Array<{ category: string; amount: number }>;
  monthlyRevenue?:        Array<{ month: string; amount: number }>;
}

interface AgentState {
  userId:              string;
  plan:                Plan;
  subscriptionStatus:  SubscriptionStatus;
  clientId?:           string;
  clientName?:         string;
  conversationTurns:   number;
  lastActivity:        string;
  financialContext?:   FinancialContext;
  weeklyDigest?:       string;
  weeklyDigestAt?:     string;
}

interface ChatMessage {
  role:    'user' | 'assistant' | 'system';
  content: string;
}

// ─── Plan Feature Gates ───────────────────────────────────────────────────────

const PLAN_RANK: Record<Plan, number> = { lite: 0, standard: 1, pro: 2 };

const AI_FEATURES: Record<Plan, {
  chat:                  boolean;
  forecast:              boolean;
  kpiAlerts:             boolean;
  anomalyDetection:      boolean;
  scenarioModeling:      boolean;
  multiClientCompare:    boolean;
  vectorSearch:          boolean;
  weeklyDigest:          boolean;
  modelTier:             'standard' | 'pro';
}> = {
  lite: {
    chat: false, forecast: false, kpiAlerts: false,
    anomalyDetection: false, scenarioModeling: false,
    multiClientCompare: false, vectorSearch: false,
    weeklyDigest: false, modelTier: 'standard',
  },
  standard: {
    chat: true, forecast: true, kpiAlerts: true,
    anomalyDetection: true, scenarioModeling: false,
    multiClientCompare: false, vectorSearch: true,
    weeklyDigest: true, modelTier: 'standard',
  },
  pro: {
    chat: true, forecast: true, kpiAlerts: true,
    anomalyDetection: true, scenarioModeling: true,
    multiClientCompare: true, vectorSearch: true,
    weeklyDigest: true, modelTier: 'pro',
  },
};

// ─── CfoAgent Durable Object ──────────────────────────────────────────────────

export class CfoAgent extends DurableObject<Env> {

  private state: AgentState | null = null;

  // ── Bootstrap SQLite tables on first access ──────────────────────────────

  private async ensureTables(): Promise<void> {
    await this.ctx.storage.sql.exec(`
      CREATE TABLE IF NOT EXISTS conversation (
        id         INTEGER PRIMARY KEY AUTOINCREMENT,
        role       TEXT    NOT NULL CHECK(role IN ('user','assistant','system')),
        content    TEXT    NOT NULL,
        tokens_est INTEGER NOT NULL DEFAULT 0,
        created_at TEXT    NOT NULL DEFAULT (datetime('now'))
      );

      CREATE TABLE IF NOT EXISTS analyses (
        id         INTEGER PRIMARY KEY AUTOINCREMENT,
        type       TEXT NOT NULL,
        input_hash TEXT NOT NULL,
        result     TEXT NOT NULL,
        plan       TEXT NOT NULL,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      );

      CREATE TABLE IF NOT EXISTS embeddings_log (
        id         INTEGER PRIMARY KEY AUTOINCREMENT,
        chunk_id   TEXT NOT NULL,
        content    TEXT NOT NULL,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      );
    `);
  }

  // ── Load/save agent state via DO persistent storage ──────────────────────

  private async loadState(): Promise<AgentState | null> {
    if (this.state) return this.state;
    const stored = await this.ctx.storage.get<AgentState>('agent_state');
    this.state = stored ?? null;
    return this.state;
  }

  private async saveState(state: AgentState): Promise<void> {
    this.state = state;
    await this.ctx.storage.put('agent_state', state);
  }

  // ─── Main Fetch Handler ───────────────────────────────────────────────────

  async fetch(request: Request): Promise<Response> {
    await this.ensureTables();

    const url      = new URL(request.url);
    const segment  = url.pathname.split('/').pop() ?? '';
    const method   = request.method;

    // CORS preflight
    if (method === 'OPTIONS') return this.cors(new Response(null, { status: 204 }));

    const routes: Record<string, () => Promise<Response>> = {
      'init':     () => this.handleInit(request),
      'chat':     () => this.handleChat(request),
      'analyze':  () => this.handleAnalyze(request),
      'embed':    () => this.handleEmbed(request),
      'search':   () => this.handleSearch(request),
      'digest':   () => this.handleDigest(request),
      'state':    () => this.handleGetState(),
      'history':  () => this.handleGetHistory(url),
      'reset':    () => this.handleReset(),
    };

    const handler = routes[segment];
    if (!handler) {
      return this.cors(Response.json({
        error: 'Unknown route',
        available: Object.keys(routes),
      }, { status: 404 }));
    }

    try {
      const response = await handler();
      return this.cors(response);
    } catch (err) {
      console.error(`[CfoAgent] ${segment} error:`, err);
      return this.cors(Response.json({
        error:   'Internal agent error',
        message: err instanceof Error ? err.message : 'Unknown error',
      }, { status: 500 }));
    }
  }

  // ─── POST /init ───────────────────────────────────────────────────────────
  // Validates session, loads plan, sets client + financial context

  private async handleInit(request: Request): Promise<Response> {
    const {
      token,
      clientId,
      clientName,
      financialContext,
    } = await request.json<{
      token:              string;
      clientId?:          string;
      clientName?:        string;
      financialContext?:  FinancialContext;
    }>();

    if (!token) {
      return Response.json({ error: 'token is required' }, { status: 400 });
    }

    // Validate session via CACHE KV first (fast path)
    const cached = await this.env.CACHE.get(`session:${token}`);
    let session: SessionPayload;

    if (cached) {
      session = JSON.parse(cached);
    } else {
      // Fallback: validate via auth worker
      const authRes = await this.env.AUTH_WORKER.fetch(
        new Request('https://auth/auth/me', {
          headers: { Authorization: `Bearer ${token}` },
        })
      );
      if (!authRes.ok) {
        return Response.json({ error: 'Invalid or expired session' }, { status: 401 });
      }
      const { id: userId, plan, subscriptionStatus } =
        await authRes.json<{ id: string; plan: Plan; subscriptionStatus: SubscriptionStatus }>();
      session = { userId, plan };

      // Cache for 5 minutes
      await this.env.CACHE.put(
        `session:${token}`,
        JSON.stringify({ userId, plan, subscriptionStatus }),
        { expirationTtl: 300 }
      );
    }

    const features = AI_FEATURES[session.plan];

    // Lite plan has no AI access — return upgrade prompt
    if (!features.chat) {
      return Response.json({
        error:       'AI features require Standard or Pro plan',
        plan:        session.plan,
        upgrade_url: `${this.env.SITE_URL}/pricing`,
        features,
      }, { status: 402 });
    }

    const newState: AgentState = {
      userId:             session.userId,
      plan:               session.plan,
      subscriptionStatus: 'active',
      clientId,
      clientName,
      conversationTurns:  0,
      lastActivity:       new Date().toISOString(),
      financialContext:   financialContext ?? undefined,
    };

    await this.saveState(newState);

    // Track init event
    this.env.EVENTS.writeDataPoint({
      blobs:   ['agent_init', session.plan, clientName ?? 'no-client'],
      doubles: [1],
      indexes: [session.userId],
    });

    return Response.json({
      ready:          true,
      plan:           session.plan,
      features,
      agentId:        this.ctx.id.toString(),
      clientContext:  clientName ? `Loaded context for ${clientName}` : 'No client loaded',
    });
  }

  // ─── POST /chat ───────────────────────────────────────────────────────────
  // Streaming SSE chat response using Workers AI

  private async handleChat(request: Request): Promise<Response> {
    const state = await this.loadState();
    if (!state?.userId) {
      return Response.json({ error: 'Not initialized — call /init first' }, { status: 400 });
    }

    const { message } = await request.json<{ message: string }>();
    if (!message?.trim()) {
      return Response.json({ error: 'message is required' }, { status: 400 });
    }

    const features = AI_FEATURES[state.plan];
    if (!features.chat) {
      return Response.json({
        error:       'Chat requires Standard or Pro',
        upgrade_url: `${this.env.SITE_URL}/pricing`,
      }, { status: 402 });
    }

    // Load last 20 turns from SQLite
    const history = this.ctx.storage.sql.exec<{ role: string; content: string }>(
      `SELECT role, content FROM conversation ORDER BY id DESC LIMIT 40`
    );
    const historyRows = [...history].reverse();

    const messages: ChatMessage[] = [
      { role: 'system',    content: this.buildSystemPrompt(state) },
      ...historyRows.map((r) => ({ role: r.role as 'user' | 'assistant', content: r.content })),
      { role: 'user',      content: message },
    ];

    // Pick model based on plan
    const model = features.modelTier === 'pro'
      ? this.env.AI_MODEL_PRO
      : this.env.AI_MODEL;

    // Stream from Workers AI
    const aiStream = await this.env.AI.run(model as any, {
      messages,
      stream: true,
      max_tokens: 1024,
    }) as ReadableStream;

    // Save to history (non-blocking)
    this.ctx.waitUntil(
      this.saveToHistory(message, '', state)
    );

    // Track event
    this.env.EVENTS.writeDataPoint({
      blobs:   ['agent_chat', state.plan],
      doubles: [1],
      indexes: [state.userId],
    });

    return new Response(aiStream, {
      headers: {
        'Content-Type':  'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection':    'keep-alive',
        'X-IH-Plan':     state.plan,
      },
    });
  }

  // ─── POST /analyze ────────────────────────────────────────────────────────
  // Structured JSON analysis — forecast, KPI, scenario, anomaly

  private async handleAnalyze(request: Request): Promise<Response> {
    const state = await this.loadState();
    if (!state?.userId) {
      return Response.json({ error: 'Not initialized — call /init first' }, { status: 400 });
    }

    const { type, data } = await request.json<{
      type: 'forecast' | 'kpi_summary' | 'scenario' | 'anomaly_detection';
      data: Record<string, unknown>;
    }>();

    // Plan gates per analysis type
    const features = AI_FEATURES[state.plan];
    const gates: Record<string, boolean> = {
      forecast:          features.forecast,
      kpi_summary:       features.kpiAlerts,
      anomaly_detection: features.anomalyDetection,
      scenario:          features.scenarioModeling,
    };

    if (!gates[type]) {
      const planRequired = type === 'scenario' ? 'Pro' : 'Standard';
      return Response.json({
        error:       `${type} analysis requires ${planRequired} plan`,
        upgrade_url: `${this.env.SITE_URL}/pricing`,
        your_plan:   state.plan,
      }, { status: 402 });
    }

    // Check analysis cache (hash of type + data)
    const inputHash = await this.hashObject({ type, data });
    const cachedResult = this.ctx.storage.sql.exec<{ result: string }>(
      `SELECT result FROM analyses WHERE input_hash = ? AND created_at > datetime('now', '-1 hour') LIMIT 1`,
      inputHash
    );
    const cached = [...cachedResult][0];
    if (cached) {
      return Response.json({ analysis: JSON.parse(cached.result), type, cached: true });
    }

    const model = features.modelTier === 'pro' ? this.env.AI_MODEL_PRO : this.env.AI_MODEL;

    const response = await this.env.AI.run(model as any, {
      messages: [
        { role: 'system', content: this.buildSystemPrompt(state) },
        { role: 'user',   content: this.buildAnalysisPrompt(type, data, state) },
      ],
      max_tokens: 2048,
    }) as { response: string };

    // Parse JSON from model response
    let result: Record<string, unknown>;
    try {
      const jsonMatch = response.response.match(/\{[\s\S]*\}/);
      result = jsonMatch ? JSON.parse(jsonMatch[0]) : { raw: response.response };
    } catch {
      result = { raw: response.response };
    }

    // Cache result in SQLite
    this.ctx.storage.sql.exec(
      `INSERT INTO analyses (type, input_hash, result, plan) VALUES (?, ?, ?, ?)`,
      type, inputHash, JSON.stringify(result), state.plan
    );

    this.env.EVENTS.writeDataPoint({
      blobs:   ['agent_analyze', type, state.plan],
      doubles: [1],
      indexes: [state.userId],
    });

    return Response.json({ analysis: result, type, cached: false, plan: state.plan });
  }

  // ─── POST /embed ──────────────────────────────────────────────────────────
  // Vectorize financial documents for semantic search (Standard+)

  private async handleEmbed(request: Request): Promise<Response> {
    const state = await this.loadState();
    if (!state?.userId) {
      return Response.json({ error: 'Not initialized' }, { status: 400 });
    }
    if (!AI_FEATURES[state.plan].vectorSearch) {
      return Response.json({ error: 'Vector search requires Standard or Pro', upgrade_url: `${this.env.SITE_URL}/pricing` }, { status: 402 });
    }

    const { chunks, namespace } = await request.json<{
      chunks:    Array<{ id: string; text: string; metadata?: Record<string, string> }>;
      namespace: string;
    }>();

    if (!chunks?.length) {
      return Response.json({ error: 'chunks array is required' }, { status: 400 });
    }

    // Generate embeddings via Workers AI
    const embedded: VectorizeVector[] = [];
    for (const chunk of chunks) {
      const result = await this.env.AI.run('@cf/baai/bge-base-en-v1.5', {
        text: [chunk.text],
      }) as { data: number[][] };

      embedded.push({
        id:       `${state.userId}:${namespace}:${chunk.id}`,
        values:   result.data[0],
        metadata: {
          userId:    state.userId,
          namespace,
          chunkId:   chunk.id,
          text:      chunk.text.slice(0, 500),  // store first 500 chars as metadata
          ...chunk.metadata,
        },
      });

      // Log to SQLite for auditability
      this.ctx.storage.sql.exec(
        `INSERT INTO embeddings_log (chunk_id, content) VALUES (?, ?)`,
        chunk.id, chunk.text.slice(0, 1000)
      );
    }

    await this.env.VECTORIZE.upsert(embedded);

    return Response.json({
      success:  true,
      embedded: embedded.length,
      namespace,
    });
  }

  // ─── POST /search ─────────────────────────────────────────────────────────
  // Semantic search over vectorized financial documents

  private async handleSearch(request: Request): Promise<Response> {
    const state = await this.loadState();
    if (!state?.userId) {
      return Response.json({ error: 'Not initialized' }, { status: 400 });
    }
    if (!AI_FEATURES[state.plan].vectorSearch) {
      return Response.json({ error: 'Vector search requires Standard or Pro', upgrade_url: `${this.env.SITE_URL}/pricing` }, { status: 402 });
    }

    const { query, namespace, topK = 5 } = await request.json<{
      query:      string;
      namespace?: string;
      topK?:      number;
    }>();

    if (!query?.trim()) {
      return Response.json({ error: 'query is required' }, { status: 400 });
    }

    // Embed the query
    const result = await this.env.AI.run('@cf/baai/bge-base-en-v1.5', {
      text: [query],
    }) as { data: number[][] };

    // Build filter — scope to this user + optional namespace
    const filter: VectorizeVectorMetadataFilter = { userId: state.userId };
    if (namespace) filter['namespace'] = namespace;

    const matches = await this.env.VECTORIZE.query(result.data[0], {
      topK,
      filter,
      returnMetadata: 'all',
    });

    return Response.json({
      query,
      results: matches.matches.map((m) => ({
        id:       m.id,
        score:    m.score,
        text:     m.metadata?.['text'] ?? '',
        metadata: m.metadata,
      })),
    });
  }

  // ─── POST /digest ─────────────────────────────────────────────────────────
  // Generate or return cached weekly KPI digest (Standard+)

  private async handleDigest(request: Request): Promise<Response> {
    const state = await this.loadState();
    if (!state?.userId) {
      return Response.json({ error: 'Not initialized' }, { status: 400 });
    }
    if (!AI_FEATURES[state.plan].weeklyDigest) {
      return Response.json({ error: 'Weekly digest requires Standard or Pro', upgrade_url: `${this.env.SITE_URL}/pricing` }, { status: 402 });
    }

    // Return cached digest if generated within last 7 days
    if (state.weeklyDigest && state.weeklyDigestAt) {
      const age = Date.now() - new Date(state.weeklyDigestAt).getTime();
      if (age < 7 * 24 * 60 * 60 * 1000) {
        return Response.json({
          digest:     state.weeklyDigest,
          generatedAt: state.weeklyDigestAt,
          cached:     true,
        });
      }
    }

    const { financialContext } = await request.json<{
      financialContext?: FinancialContext;
    }>();

    const ctx = financialContext ?? state.financialContext;
    if (!ctx) {
      return Response.json({ error: 'No financial context available. Call /init with financialContext or pass it here.' }, { status: 400 });
    }

    const model = AI_FEATURES[state.plan].modelTier === 'pro'
      ? this.env.AI_MODEL_PRO
      : this.env.AI_MODEL;

    const response = await this.env.AI.run(model as any, {
      messages: [
        {
          role: 'system',
          content: 'You are a CFO assistant. Write a concise, actionable weekly financial digest for a small business owner. Use plain language. Format with clear sections: Summary, Cash Position, Key Risks, Top 3 Actions. Max 300 words.',
        },
        {
          role: 'user',
          content: `Generate this week's financial digest for ${state.clientName ?? 'my business'} based on this data: ${JSON.stringify(ctx)}`,
        },
      ],
      max_tokens: 600,
    }) as { response: string };

    const digest = response.response;
    const generatedAt = new Date().toISOString();

    await this.saveState({ ...state, weeklyDigest: digest, weeklyDigestAt: generatedAt, financialContext: ctx });

    this.env.EVENTS.writeDataPoint({
      blobs:   ['agent_digest', state.plan],
      doubles: [1],
      indexes: [state.userId],
    });

    return Response.json({ digest, generatedAt, cached: false });
  }

  // ─── GET /state ───────────────────────────────────────────────────────────

  private async handleGetState(): Promise<Response> {
    const state = await this.loadState();
    if (!state) {
      return Response.json({ initialized: false });
    }
    return Response.json({
      initialized:        true,
      plan:               state.plan,
      clientName:         state.clientName ?? null,
      conversationTurns:  state.conversationTurns,
      lastActivity:       state.lastActivity,
      hasFinancialContext: !!state.financialContext,
      features:           AI_FEATURES[state.plan],
      weeklyDigestAge:    state.weeklyDigestAt
        ? Math.round((Date.now() - new Date(state.weeklyDigestAt).getTime()) / 86400000) + ' days'
        : null,
    });
  }

  // ─── GET /history ─────────────────────────────────────────────────────────

  private async handleGetHistory(url: URL): Promise<Response> {
    const state = await this.loadState();
    if (!state?.userId) {
      return Response.json({ error: 'Not initialized' }, { status: 400 });
    }

    const limit = Math.min(parseInt(url.searchParams.get('limit') ?? '20'), 100);

    const rows = this.ctx.storage.sql.exec<{
      id: number; role: string; content: string; created_at: string;
    }>(
      `SELECT id, role, content, created_at FROM conversation ORDER BY id DESC LIMIT ?`,
      limit
    );

    const history = [...rows].reverse();
    return Response.json({ history, total: history.length });
  }

  // ─── DELETE /reset ────────────────────────────────────────────────────────

  private async handleReset(): Promise<Response> {
    const state = await this.loadState();
    this.ctx.storage.sql.exec(`DELETE FROM conversation`);
    if (state) {
      await this.saveState({ ...state, conversationTurns: 0, weeklyDigest: undefined, weeklyDigestAt: undefined });
    }
    return Response.json({ success: true, message: 'Conversation history cleared' });
  }

  // ─── Helpers ─────────────────────────────────────────────────────────────

  private async saveToHistory(userMsg: string, assistantMsg: string, state: AgentState): Promise<void> {
    this.ctx.storage.sql.exec(
      `INSERT INTO conversation (role, content, tokens_est) VALUES (?, ?, ?)`,
      'user', userMsg, Math.ceil(userMsg.length / 4)
    );
    if (assistantMsg) {
      this.ctx.storage.sql.exec(
        `INSERT INTO conversation (role, content, tokens_est) VALUES (?, ?, ?)`,
        'assistant', assistantMsg, Math.ceil(assistantMsg.length / 4)
      );
    }
    // Keep last 100 turns only
    this.ctx.storage.sql.exec(
      `DELETE FROM conversation WHERE id NOT IN (SELECT id FROM conversation ORDER BY id DESC LIMIT 100)`
    );
    await this.saveState({
      ...state,
      conversationTurns: state.conversationTurns + 1,
      lastActivity:      new Date().toISOString(),
    });
  }

  private buildSystemPrompt(state: AgentState): string {
    const ctx = state.financialContext;
    const clientLine = state.clientName ? `Current client: **${state.clientName}**` : 'No client loaded.';

    const financialSummary = ctx ? `
FINANCIAL SNAPSHOT:
- Revenue:              $${ctx.totalRevenue?.toLocaleString() ?? 'N/A'}
- Expenses:             $${ctx.totalExpenses?.toLocaleString() ?? 'N/A'}
- Net Income:           $${ctx.netIncome?.toLocaleString() ?? 'N/A'}
- Cash Balance:         $${ctx.cashBalance?.toLocaleString() ?? 'N/A'}
- Outstanding Invoices: $${ctx.outstandingInvoices?.toLocaleString() ?? 'N/A'}
- Overdue Invoices:     $${ctx.overdueInvoices?.toLocaleString() ?? 'N/A'}
- Period:               ${ctx.periodLabel ?? 'N/A'}
- Revenue Growth:       ${ctx.revenueGrowthPct != null ? `${ctx.revenueGrowthPct.toFixed(1)}%` : 'N/A'}
- Burn Rate:            ${ctx.burnRate != null ? `$${ctx.burnRate.toLocaleString()}/mo` : 'N/A'}
- Runway:               ${ctx.runwayMonths != null ? `${ctx.runwayMonths} months` : 'N/A'}
${ctx.topExpenseCategories?.length ? `- Top Expenses: ${ctx.topExpenseCategories.map((e) => `${e.category} ($${e.amount.toLocaleString()})`).join(', ')}` : ''}
`.trim() : 'No financial data loaded. Ask the user to upload a CSV or connect accounts.';

    return `You are InsightHunter's AI CFO Assistant — a precise, trustworthy financial advisor for small businesses and freelancers.

${clientLine}
User plan: ${state.plan.toUpperCase()}
Available features: ${JSON.stringify(AI_FEATURES[state.plan])}

${financialSummary}

RULES:
- Be direct and actionable. No filler. No hedge words unless genuinely uncertain.
- Cite specific numbers from the snapshot when available.
- If data is missing, say exactly what is missing and how to fix it.
- Never invent numbers. Say "based on available data" when extrapolating.
- Format currency as $X,XXX. Percentages as X.X%.
- Keep responses under 250 words unless a detailed breakdown is requested.
- For Lite users asking about paid features, explain what they're missing and link to ${this.env.SITE_URL}/pricing.`;
  }

  private buildAnalysisPrompt(
    type: string,
    data: Record<string, unknown>,
    state: AgentState
  ): string {
    const client = state.clientName ?? 'this business';
    const prompts: Record<string, string> = {
      forecast: `Analyze this financial data for ${client} and produce a 3-month cash flow forecast. Return valid JSON only: { "forecast": [{"month": string, "projectedRevenue": number, "projectedExpenses": number, "projectedCash": number, "confidence": "low"|"medium"|"high"}], "assumptions": string[], "risks": string[], "recommendations": string[] }. Data: ${JSON.stringify(data)}`,

      kpi_summary: `Analyze this data for ${client} and return a KPI health summary as valid JSON only: { "healthScore": number (0-100), "grade": "A"|"B"|"C"|"D"|"F", "kpis": [{"name": string, "value": string, "trend": "up"|"down"|"flat", "status": "good"|"warning"|"critical"}], "alerts": string[], "topRecommendation": string, "summary": string }. Data: ${JSON.stringify(data)}`,

      scenario: `Model 3 financial scenarios for ${client}. Return valid JSON only: { "scenarios": [{"name": "Conservative"|"Base"|"Optimistic", "description": string, "projectedRevenue": number, "projectedExpenses": number, "netIncome": number, "cashIn6Months": number, "probability": number}], "keyDrivers": string[], "recommendation": string }. Data: ${JSON.stringify(data)}`,

      anomaly_detection: `Identify financial anomalies or unusual patterns in this data for ${client}. Return valid JSON only: { "anomalies": [{"description": string, "severity": "low"|"medium"|"high"|"critical", "affectedAmount": number, "category": string, "recommendation": string}], "overallRisk": "low"|"medium"|"high", "summary": string }. Data: ${JSON.stringify(data)}`,
    };

    return prompts[type] ?? `Analyze this financial data for ${client} and return structured JSON insights: ${JSON.stringify(data)}`;
  }

  private async hashObject(obj: unknown): Promise<string> {
    const str  = JSON.stringify(obj);
    const buf  = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(str));
    return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, '0')).join('').slice(0, 16);
  }

  private cors(response: Response): Response {
    const headers = new Headers(response.headers);
    headers.set('Access-Control-Allow-Origin',  'https://insighthunter.app');
    headers.set('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
    headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    headers.set('Access-Control-Max-Age',       '86400');
    return new Response(response.body, { status: response.status, headers });
  }
}

// ─── Worker Entry ─────────────────────────────────────────────────────────────

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);

    // Health check
    if (url.pathname === '/health') {
      return Response.json({
        status:      'ok',
        service:     'insighthunter-agents',
        environment: env.ENVIRONMENT,
        timestamp:   new Date().toISOString(),
      });
    }

    // Route: /agents/cfo/:agentId/:action
    // agentId is typically userId — one DO per user, persistent across sessions
    const match = url.pathname.match(/^\/agents\/cfo\/([^/]+)(?:\/(.+))?$/);
    if (!match) {
      return Response.json({
        error:   'Invalid route',
        pattern: '/agents/cfo/:agentId/:action',
        actions: ['init', 'chat', 'analyze', 'embed', 'search', 'digest', 'state', 'history', 'reset'],
      }, { status: 404 });
    }

    const agentId = match[1];
    const id      = env.CFO_AGENT.idFromName(agentId);
    const agent   = env.CFO_AGENT.get(id);

    return agent.fetch(request);
  },
} satisfies ExportedHandler<Env>;
