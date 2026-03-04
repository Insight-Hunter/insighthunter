// apps/insighthunter-main/src/CfoAgent.ts
import { Agent } from "agents";
import { embedAndUpsert, semanticSearch } from "./vectorEmbeddings";

// POST /embed — index a new transaction or document
app.post("/embed", async (c) => {
  const { userId, documents } = await c.req.json();
  const result = await embedAndUpsert(c.env, documents);
  return c.json(result);
});

// GET /search?q=late+invoices&userId=xxx
app.get("/search", async (c) => {
  const query  = c.req.query("q") ?? "";
  const userId = c.req.query("userId") ?? "";
  const type   = c.req.query("type") as any;

  const results = await semanticSearch(c.env, query, userId, {
    topK: 5,
    type,
    minScore: 0.4,
  });
  return c.json({ results });
});

interface Env {
  CFO_AGENT: DurableObjectNamespace;
  AI: Ai;
  DB: D1Database;
  REPORT_QUEUE: Queue;
}

interface CfoState {
  plan: "free" | "pro";
  lastForecastAt: string | null;
  alerts: string[];
}

export class CfoAgent extends Agent<Env, CfoState> {

  // Handle HTTP requests from the main Worker
  async onRequest(request: Request): Promise<Response> {
    const { pathname } = new URL(request.url);

    if (pathname === "/forecast")   return this.runForecast();
    if (pathname === "/report")     return this.queueReport();
    if (pathname === "/kpis")       return this.getKpis();

    return Response.json({ error: "Not found" }, { status: 404 });
  }

  // Real-time WebSocket updates to the dashboard
  async onMessage(connection: Connection, message: string) {
    const { type } = JSON.parse(message);
    if (type === "ping") connection.send(JSON.stringify({ type: "pong" }));
  }

  // Scheduled: daily forecast refresh at 8AM UTC
  async dailyDigest() {
    await this.runForecast();
    this.setState({ ...this.state, lastForecastAt: new Date().toISOString() });
  }

  // AI-powered cash flow forecast
  private async runForecast(): Promise<Response> {
    const history = await this.sql`
      SELECT date, amount, category FROM transactions
      ORDER BY date DESC LIMIT 90
    `;
    const insight = await this.env.AI.run("@cf/meta/llama-3.1-8b-instruct", {
      prompt: `You are a CFO. Analyze this 90-day transaction history and
               provide a 30-day cash flow forecast with risks: ${JSON.stringify(history)}`
    });
    return Response.json({ forecast: insight });
  }

  // Push report generation to the queue
  private async queueReport(): Promise<Response> {
    await this.env.REPORT_QUEUE.send({ userId: this.name, requestedAt: Date.now() });
    return Response.json({ status: "queued" });
  }

  private async getKpis(): Promise<Response> {
    const kpis = await this.sql`
      SELECT SUM(amount) as revenue, COUNT(*) as transactions
      FROM transactions WHERE date >= date('now', '-30 days')
    `;
    return Response.json(kpis);
  }
}