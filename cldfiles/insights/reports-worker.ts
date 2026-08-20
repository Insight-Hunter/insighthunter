import { ReportArchive } from "./archive";
import { buildProfitLoss, profitLossToCsv } from "./build";
import type { BookkeepingSummary, EntitlementsResponse, Env, SessionPayload } from "./types";

export { ReportArchive };

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
      if (!entitlements || TIER_RANK[entitlements.accountTier] < TIER_RANK.standard) {
        return withCors(
          Response.json({ error: "upgrade_required", detail: "Reports requires the Standard plan or above." }, { status: 403 }),
          cors
        );
      }

      const archiveId = env.ARCHIVE.idFromName(session.userId);
      const archive = env.ARCHIVE.get(archiveId);

      if (url.pathname === "/profit-loss" && request.method === "GET") {
        return withCors(await handleProfitLoss(env, token, archive, url, "json"), cors);
      }

      if (url.pathname === "/export/csv" && request.method === "GET") {
        return await handleProfitLoss(env, token, archive, url, "csv"); // no CORS wrap — file download
      }

      if (url.pathname === "/cash-flow" && request.method === "GET") {
        // Cash-flow-from-transactions is, for now, the same underlying data
        // as P&L (we don't yet distinguish accrual timing). See README.
        return withCors(await handleProfitLoss(env, token, archive, url, "json"), cors);
      }

      if (url.pathname === "/balance-sheet" && request.method === "GET") {
        return withCors(
          Response.json(
            {
              error: "not_available",
              detail:
                "Balance sheet requires asset/liability/equity account tracking, which Bookkeeping doesn't record yet (only income/expense categorized transactions). Flagged as a follow-up, not faked with placeholder data.",
            },
            { status: 501 }
          ),
          cors
        );
      }

      if (url.pathname === "/snapshots" && request.method === "GET") {
        const doRes = await archive.fetch(new Request(`https://archive/snapshots${url.search}`));
        return withCors(doRes, cors);
      }

      return withCors(Response.json({ error: "not_found" }, { status: 404 }), cors);
    } catch (err) {
      console.error("reports worker error:", err);
      return withCors(Response.json({ error: "internal_error" }, { status: 500 }), cors);
    }
  },
} satisfies ExportedHandler<Env>;

async function handleProfitLoss(
  env: Env,
  token: string,
  archive: DurableObjectStub,
  url: URL,
  format: "json" | "csv"
): Promise<Response> {
  const from = url.searchParams.get("from");
  const to = url.searchParams.get("to");
  const now = new Date();
  const defaultFrom = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
  const defaultTo = Date.now();

  const summaryRes = await fetch(
    `${env.BOOKKEEPING_API_URL}/summary?from=${from ?? defaultFrom}&to=${to ?? defaultTo}`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  if (!summaryRes.ok) {
    return Response.json({ error: "bookkeeping_unavailable" }, { status: 502 });
  }
  const summary = (await summaryRes.json()) as BookkeepingSummary;
  const report = buildProfitLoss(summary);

  // Archive every generated report so it's retrievable later (lender/accountant use).
  await archive.fetch(
    new Request("https://archive/snapshots", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "profit_loss", periodStart: report.periodStart, periodEnd: report.periodEnd, data: report }),
    })
  ).catch((err) => console.error("archive write failed:", err));

  if (format === "csv") {
    const csv = profitLossToCsv(report);
    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename="profit-loss-${report.periodStart}-${report.periodEnd}.csv"`,
      },
    });
  }

  return Response.json(report);
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
    "Access-Control-Allow-Methods": "GET,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Allow-Credentials": "true",
  };
}

function withCors(response: Response, cors: HeadersInit): Response {
  const merged = new Headers(response.headers);
  for (const [k, v] of Object.entries(cors as Record<string, string>)) merged.set(k, v);
  return new Response(response.body, { status: response.status, headers: merged });
}
