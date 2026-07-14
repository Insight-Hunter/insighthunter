import { Hono } from "hono";

const app = new Hono();

app.get("/health", (c) => c.json({ service: "scout", ok: true }));
app.get("/leads", (c) => c.json({ items: [] }));

export default app;
