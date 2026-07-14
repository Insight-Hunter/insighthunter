import { Hono } from "hono";

const app = new Hono();

app.get("/health", (c) => c.json({ service: "insights", ok: true }));
app.get("/dashboard", (c) => c.json({ metrics: [] }));

export default app;
