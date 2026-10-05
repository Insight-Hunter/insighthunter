// apps/insighthunter-pbx/src/backend/routes/automations.ts
//
// Planning stub for messaging/workflow automations (docs/insight-pbx-master-prompt.md §4.6).
// TODO(automations): not implemented. Depends on conversations.ts.
// Returns 501 so callers get an explicit, typed "not built yet" response
// instead of a silent 404 that could be mistaken for a routing bug.
import { Hono } from "hono";
import type { Env } from "../types.js";

export const automations = new Hono<{ Bindings: Env }>();

automations.all("*", (c) => c.json({ error: "not_implemented", feature: "automations" }, 501));
