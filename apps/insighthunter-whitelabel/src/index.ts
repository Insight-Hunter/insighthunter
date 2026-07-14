import { Hono } from "hono";

const app = new Hono();

app.get("/health", (c) => c.json({ service: "whitelabel", ok: true }));
app.get("/config", (c) => c.json({ theme: "default", logo: null, primaryColor: "#3b82d4" }));

export default app;
