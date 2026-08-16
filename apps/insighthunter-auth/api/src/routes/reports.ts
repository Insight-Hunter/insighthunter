// apps/api/src/routes/reports.ts
import { Hono } from "hono";
import { requireOrgPermission } from "/Users/jamesmichaelhunterturner/insighthunter/packages/platform-middleware/src/require-permission.ts";

type Env = {
  Bindings: {
    DB: D1Database;
    AUTH_ISSUER: string;
    AUTH_AUDIENCE: string;
    AUTH_JWKS_URL: string;
  };
};

const app = new Hono<Env>();

app.get("/orgs/:orgId/reports/pnl", requireOrgPermission("reports:read"), async (c) => {
  return c.json({
    ok: true,
    report: "pnl",
    orgId: c.req.param("orgId"),
  });
});

export default app;
