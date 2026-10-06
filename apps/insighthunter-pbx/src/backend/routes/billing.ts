// apps/insighthunter-pbx/src/backend/routes/billing.ts
//
// Planning stub for tenant-facing billing summary for PBX add-ons (docs/insight-pbx-master-prompt.md §5).
// TODO(billing): not implemented. Depends on services/reconciliationService.ts.
// Returns 501 so callers get an explicit, typed "not built yet" response
// instead of a silent 404 that could be mistaken for a routing bug.
import { Hono } from "hono";
import type { Env } from "../types.js";

export const billing = new Hono<{ Bindings: Env }>();

billing.all("*", (c) => c.json({ error: "not_implemented", feature: "billing" }, 501));
