import { Hono } from "hono";
import { isBalanced } from "@insighthunter/accounting";

export const journalRoutes = new Hono();

journalRoutes.post("/journals/validate", async (c) => {
  const entry = await c.req.json();
  return c.json({ balanced: isBalanced(entry) });
});

journalRoutes.post("/journals/post", async (c) => {
  const entry = await c.req.json();
  const balanced = isBalanced(entry);
  if (!balanced) {
    return c.json({ posted: false, error: "Journal entry is not balanced." }, 400);
  }
  return c.json({ posted: true, entry });
});
