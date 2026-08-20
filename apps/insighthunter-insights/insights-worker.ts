import { generateInsights } from "./analyze";
import { InsightsFeed } from "./feed";
import type { BookkeepingSummary, EntitlementsResponse, Env, SessionPayload } from "./types";

export { InsightsFeed };

const TIER_RANK = { startup: 0, standard: 1, pro: 2 } as const;

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const cors = corsHeaders(env, request);

    if (request.method === "OPTIONS") return new Response(null, { headers: cors });

    try {
      const token = bearerOrCookieToken(request);
      if (!token) return withCors(Response.json({ error: "unauthorized" }, { status: 401 }), cors);

      const session = await verifySession(env, token);
      if (!session) return withCors(Response.json({ error: "unauthorized" }, { status: 401 }), cors);

      const entitlements = await fetchEntitlements(env, token);
      const depth = insightDepth(entitlements);
      if (!depth) {
        return withCors(
          Response.json(
            { error: "upgrade_required", detail: "Insights requires the Standard or Pro plan, or the Insights Pro add-on." },
            { status: 403 }
          ),
          cors
        );
      }

      const feedId = env.FEED.idFromName(session.userId);
      const feed = env.FEED.get(feedId);

      if (url.pathname === "/insights" && request.method === "GET") {
        const doRes = await feed.fetch(new Request(`https://feed${url.search}`));
        return withCors(doRes, cors);
      }

      if (url.pathname === "/generate" && request.method === "POST") {
        return withCors(await handleGenerate(env, token, feed, depth), cors);
      }

      return withCors(Response.json({ error: "not_found" }, { status: 404 }), cors);
    } catch (err) {
      console.error("insights worker error:", err);
      return withCors(Response.json({ error: "internal_error" }, { status: 500 }), cors);
    }
  },
} satisfies ExportedHandler<Env>;

async function handleGenerate(
  env: Env,
  token: string,
  feed: DurableObjectStub,
  depth: "basic" | "full"
): Promise<Response> {
  const now = new Date();
  const periods = depth === "full" ? 4 : 1; // full: current + 3 trailing months for trend comparison

  const summaries: BookkeepingSummary[] = [];
  for (let i = 0; i < periods; i++) {
    const periodDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const from = periodDate.getTime();
    const to = new Date(periodDate.getFullYear(), periodDate.getMonth() + 1, 0, 23, 59, 59).getTime();
    const res = await fetch(`${env.BOOKKEEPING_API_URL}/summary?from=${from}&to=${to}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) break;
    summaries.push((await res.json()) as BookkeepingSummary);
  }

  if (summaries.length === 0) {
    return Response.json({ error: "no_bookkeeping_data", detail: "Add some transactions in Bookkeeping first." }, { status: 400 });
  }

  const [current, ...prior] = summaries;
  const generated = await generateInsights(env.AI, current, prior, depth);

  const stored = [];
  for (const insight of generated) {
    const res = await feed.fetch(
      new Request("https://feed/insights", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(insight),
      })
    );
    stored.push(await res.json());
  }

  return Response.json({ generated: stored.length, insights: stored });
}

function insightDepth(entitlements: EntitlementsResponse | null): "basic" | "full" | null {
  if (!entitlements) return null;
  const rank = TIER_RANK[entitlements.accountTier];
  if (rank >= TIER_RANK.pro) return "full";
  const hasInsightsPro = entitlements.addons.some((a) => a.module === "insights_pro" && a.status === "active");
  if (hasInsightsPro) return "full";
  if (rank >= TIER_RANK.standard) return "basic";
  return null; // startup tier, no add-on — not entitled
}

async function verifySession(env: Env, token: string): Promise<SessionPayload | null> {
  const res = await fetch(`${env.AUTH_API_URL}/session/verify`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) return null;
  const data = (await res.json()) as SessionPayload & { valid: boolean };
  return data.valid ? data : null;
}

async function fetchEntitlements(env: Env, token: string): Promise<EntitlementsResponse | null> {
  const res = await fetch(`${env.AUTH_API_URL}/entitlements`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) return null;
  return (await res.json()) as EntitlementsResponse;
}

function bearerOrCookieToken(request: Request): string | null {
  const header = request.headers.get("Authorization");
  if (header?.startsWith("Bearer ")) return header.slice("Bearer ".length);
  const cookie = request.headers.get("Cookie");
  if (!cookie) return null;
  const match = cookie.split(";").map((c) => c.trim()).find((c) => c.startsWith("ih_session="));
  return match ? match.slice("ih_session=".length) : null;
}

function corsHeaders(env: Env, request: Request): HeadersInit {
  const origin = request.headers.get("Origin");
  const allowed = origin === env.ALLOWED_ORIGIN ? origin : env.ALLOWED_ORIGIN;
  return {
    "Access-Control-Allow-Origin": allowed,
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Allow-Credentials": "true",
  };
}

function withCors(response: Response, cors: HeadersInit): Response {
  const merged = new Headers(response.headers);
  for (const [k, v] of Object.entries(cors as Record<string, string>)) merged.set(k, v);
  return new Response(response.body, { status: response.status, headers: merged });
}
