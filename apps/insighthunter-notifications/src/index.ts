import { Hono } from "hono";

const app = new Hono();

app.get("/health", (c) => c.json({ service: "notifications", ok: true }));
app.post("/send", async (c) => {
  const body = await c.req.json();
  // TODO: wire to email/push provider
  return c.json({ queued: true, to: body.to });
});

export default app;
