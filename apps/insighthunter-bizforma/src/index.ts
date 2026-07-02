import { Hono } from "hono";
const app = new Hono();
app.get("/health", (c) => c.json({ service: "bizforma", ok: true }));
app.get("/api/compliance", (c) => c.json({ filings: [] }));
export default app;
