import { Hono } from "hono";

const app = new Hono();

app.get("/health", (c) => c.json({ service: "pbx", ok: true }));
app.get("/lines", (c) => c.json({ items: [] }));

export default app;
