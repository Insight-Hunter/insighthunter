// apps/insighthunter-pbx/src/backend/routes/addons.ts
//
// Planning stub for physical-services add-on ordering (mailbox, forwarding, registered agent) (docs/insight-pbx-master-prompt.md §4.10).
// TODO(addons): not implemented. Must not go live before docs/physical-services-feasibility.md go/no-go gates are satisfied.
// Returns 501 so callers get an explicit, typed "not built yet" response
// instead of a silent 404 that could be mistaken for a routing bug.
import { Hono } from "hono";
import type { Env } from "../types.js";

export const addons = new Hono<{ Bindings: Env }>();

addons.all("*", (c) => c.json({ error: "not_implemented", feature: "addons" }, 501));
