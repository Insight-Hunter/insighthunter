import { Hono } from "hono";
const app = new Hono();
app.get("/health", (c) => c.json({ service: "auth", ok: true }));
app.get("/session", (c) => c.json({ authenticated: false }));
export default app;
