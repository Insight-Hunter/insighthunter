// apps/insighthunter-pbx/src/backend/routes/aiReceptionist.ts
//
// Planning stub for AI receptionist and AI customer service (docs/insight-pbx-master-prompt.md §4.7).
// TODO(aiReceptionist): not implemented. Depends on a TranscriptionProvider implementation and callFlows.ts.
// Returns 501 so callers get an explicit, typed "not built yet" response
// instead of a silent 404 that could be mistaken for a routing bug.
import { Hono } from "hono";
import type { Env } from "../types.js";

export const aiReceptionist = new Hono<{ Bindings: Env }>();

aiReceptionist.all("*", (c) =>
  c.json({ error: "not_implemented", feature: "aiReceptionist" }, 501),
);
