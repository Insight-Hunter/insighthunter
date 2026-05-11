import type { APIRoute } from "astro";
import { QBOClient } from "@/lib/qbo/client";
import { getSessionToken, getSession } from "@/lib/auth/session";
import type { Env, QBOConnection } from "@/types";

export const GET: APIRoute = async ({ request, locals }) => {
  const env     = (locals as any).runtime?.env as Env;
  const token   = getSessionToken(request);
  const session = token ? await getSession(env.IH_SESSIONS, token) : null;
  if (!session) return new Response(null, { status: 401 });

  const raw = await env.IH_CACHE.get(`qbo:${session.userId}`);
  if (!raw) return new Response(null, { status: 404 });

  const conn   = JSON.parse(raw) as QBOConnection;
  const client = new QBOClient(conn, (env.QBO_ENVIRONMENT as any) ?? "sandbox");

  const now   = new Date();
  const start = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
  const end   = now.toISOString().split("T")[0];

  const [pl, cash] = await Promise.all([
    client.getProfitAndLoss(start, end),
    client.getCashSummary(),
  ]);

  return new Response(JSON.stringify({
    revenue:  pl.totalRevenue,
    expenses: pl.totalExpenses,
    netIncome: pl.netIncome,
    cash: cash.balance,
    period: `${start} – ${end}`,
  }), { headers: { "Content-Type": "application/json" } });
};
