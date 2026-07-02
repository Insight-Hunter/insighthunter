import { Hono } from "hono";

const app = new Hono();

app.get("/health", (c) => c.json({ service: "advisor", ok: true }));
app.get("/briefing", (c) => c.json({ headline: "Good Morning", items: [] }));

export default app;
