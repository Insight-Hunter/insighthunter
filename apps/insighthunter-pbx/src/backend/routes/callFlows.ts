// apps/insighthunter-pbx/src/backend/routes/callFlows.ts
//
// Planning stub for call-flow designer and runtime (docs/insight-pbx-master-prompt.md §4.3).
// TODO(callFlows): not implemented. The single largest remaining backend phase; needs agents/CallSessionAgent.ts for live call state.
// Returns 501 so callers get an explicit, typed "not built yet" response
// instead of a silent 404 that could be mistaken for a routing bug.
import { Hono } from "hono";
import type { Env } from "../types.js";

export const callFlows = new Hono<{ Bindings: Env }>();

callFlows.all("*", (c) => c.json({ error: "not_implemented", feature: "callFlows" }, 501));
