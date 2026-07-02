import { Hono } from "hono";

export const accountsRoutes = new Hono();

accountsRoutes.get("/accounts", (c) => c.json({ items: [] }));
accountsRoutes.post("/accounts", async (c) => {
  const body = await c.req.json();
  return c.json({ created: true, account: body }, 201);
});
accountsRoutes.patch("/accounts/:id", async (c) => {
  const body = await c.req.json();
  return c.json({ updated: true, id: c.req.param("id"), patch: body });
});
