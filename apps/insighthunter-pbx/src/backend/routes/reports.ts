// apps/insighthunter-pbx/src/backend/routes/reports.ts
//
// Planning stub for PBX usage/cost reporting surfaced to tenants and to insighthunter-reports (docs/insight-pbx-master-prompt.md §5.5, §10.3).
// TODO(reports): not implemented. Should read from services/usage-ledger.ts and services/vendorUsageService.ts.
// Returns 501 so callers get an explicit, typed "not built yet" response
// instead of a silent 404 that could be mistaken for a routing bug.
import { Hono } from "hono";
import type { Env } from "../types.js";

export const reports = new Hono<{ Bindings: Env }>();

reports.all("*", (c) => c.json({ error: "not_implemented", feature: "reports" }, 501));
