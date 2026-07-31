// apps/auth/src/index.ts
// Mount all route groups — keeps Stripe billing AND adds identity layer

import { Hono } from "hono";
import { cors } from "hono/cors";
import { identityRoutes } from "./routes/identity";
import { orgRoutes } from "./routes/org";
import { stripeRoutes } from "./routes/stripe"; // existing Stripe logic moved here

type Bindings = {
  DB: D1Database;
  AUTH_KV: KVNamespace;
  JWT_SECRET: string;
  RESEND_API_KEY: string;
  STRIPE_SECRET_KEY: string;
  STRIPE_WEBHOOK_SECRET: string;
};

const app = new Hono<{ Bindings: Bindings }>();

app.use("*", cors({
  origin: [
    "https://insighthunter.app",
    "https://dashboard.insighthunter.app",
    "https://insights.insighthunter.app",
    "https://bookkeeping.insighthunter.app",
    "https://payroll.insighthunter.app",
    "https://advisor.insighthunter.app",
    "https://bizforma.insighthunter.app",
    "https://pbx.insighthunter.app",
  ],
  allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowHeaders: ["Content-Type", "Authorization", "stripe-signature"],
  credentials: true,
}));

app.get("/health", (c) =>
  c.json({ ok: true, service: "insighthunter-auth", ts: new Date().toISOString() })
);

// Identity: register, login, logout, verify, password reset
app.route("/auth", identityRoutes);

// Org: create org, invite members, manage roles
app.route("/auth/org", orgRoutes);

// Stripe billing webhooks (preserved from existing)
app.route("/webhooks", stripeRoutes);

export default app;
