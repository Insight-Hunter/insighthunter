// apps/insighthunter-pbx/src/backend/routes/conversations.ts
//
// Planning stub for unified messaging inbox (conversation threads across SMS/MMS/RCS/WhatsApp) (docs/insight-pbx-master-prompt.md §4.6).
// TODO(conversations): not implemented. routes/messages.ts already implements message send; this adds thread/conversation grouping on top.
// Returns 501 so callers get an explicit, typed "not built yet" response
// instead of a silent 404 that could be mistaken for a routing bug.
import { Hono } from "hono";
import type { Env } from "../types.js";

export const conversations = new Hono<{ Bindings: Env }>();

conversations.all("*", (c) => c.json({ error: "not_implemented", feature: "conversations" }, 501));
