import { Hono } from "hono";
const app = new Hono();
app.get("/health", (c) => c.json({ service: "dispatch", ok: true }));
app.get("/", (c) => c.json({ route: "dispatch-root" }));
export default app;
