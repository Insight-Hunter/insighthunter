// apps/insighthunter-pbx/src/backend/routes/queues.ts
//
// Planning stub for call queues and agent presence (docs/insight-pbx-master-prompt.md §4.8).
// TODO(queues): not implemented. Depends on callFlows.ts and agents/QueueAgent.ts.
// Returns 501 so callers get an explicit, typed "not built yet" response
// instead of a silent 404 that could be mistaken for a routing bug.
import { Hono } from "hono";
import type { Env } from "../types.js";

export const queues = new Hono<{ Bindings: Env }>();

queues.all("*", (c) => c.json({ error: "not_implemented", feature: "queues" }, 501));
