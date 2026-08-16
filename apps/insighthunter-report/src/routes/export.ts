// routes/export.ts
// GET /api/export/:type?format=csv|json — streams any report as CSV or JSON download.

import { Hono } from "hono";
import type { Env } from "../index.js";
import { getSession } from "../index.js";

export const exportRoutes = new Hono<{ Bindings: Env }>();

function toCsv(rows: Record<string, unknown>[]): string {
  if (!rows.length) return "";
  const headers = Object.keys(rows[0]!);
  const lines = rows.map((r) =>
    headers
      .map((h) => {
        const v = r[h];
        const s = v == null ? "" : String(v);
        return s.includes(",") || s.includes('"') || s.includes("\n")
          ? `"${s.replace(/"/g, '""')}"`
          : s;
      })
      .join(","),
  );
  return [headers.join(","), ...lines].join("\n");
}

exportRoutes.get("/:type", async (c) => {
  const session = getSession(c.req.raw);
  if (!session) return c.json({ error: "unauthorized" }, 401);

  const type = c.req.param("type");
  const format = c.req.query("format") ?? "json";
  const from = c.req.query("from") ?? `${new Date().getFullYear()}-01-01`;
  const to = c.req.query("to") ?? new Date().toISOString().slice(0, 10);
  const as_of = c.req.query("as_of") ?? new Date().toISOString().slice(0, 10);

  // Delegate to the internal report API — forward query params + session headers
  const params = new URLSearchParams({ from, to, as_of });
  const internalUrl = new URL(c.req.url);
  internalUrl.pathname = `/api/reports/${type}`;
  internalUrl.search = params.toString();

  const reportRes = await fetch(internalUrl.toString(), {
    headers: {
      "X-User-Id": session.userId,
      "X-Org-Id": session.orgId,
      "X-User-Email": session.email,
      "X-User-Role": session.role,
      "X-User-Name": session.name,
      "X-Org-Name": session.orgName,
      "X-Org-Plan": session.orgPlan,
    },
  });

  if (!reportRes.ok) return c.json({ error: "Report generation failed" }, 502);

  const data = await reportRes.json<Record<string, unknown>>();
  const filename = `${type}-${as_of ?? to}.${format}`;

  if (format === "csv") {
    // Flatten whichever key holds the row array
    const rowKey = [
      "items",
      "revenue",
      "expenses",
      "assets",
      "liabilities",
      "equity",
      "operating",
    ].find((k) => Array.isArray(data[k]));
    const rows = rowKey ? (data[rowKey] as Record<string, unknown>[]) : [data];
    return new Response(toCsv(rows), {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  }

  return new Response(JSON.stringify(data, null, 2), {
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
});
