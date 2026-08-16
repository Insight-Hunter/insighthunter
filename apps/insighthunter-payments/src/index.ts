import { Hono } from "hono";
import { cors } from "hono/cors";
import Stripe from "stripe";

type OrgPlan = "starter" | "growth" | "pro" | "enterprise";

type Bindings = {
  DB: D1Database;
  KV_ENTITLEMENTS: KVNamespace;
  STRIPE_SECRET_KEY: string;
  STRIPE_WEBHOOK_SECRET: string;
  DASHBOARD_URL: string; // https://app.insighthunter.app
};

interface CheckoutBody {
  orgId: string;
  email: string;
  plan: Exclude<OrgPlan, "starter">; // starter is free, no checkout needed
}

const PRICE_IDS: Record<Exclude<OrgPlan, "starter">, string> = {
  growth: "price_1U4y2cF3gri2YoH2cj78jVYx",
  pro: "price_1U4y2dF3gri2YoH2XSmaR1RE",
  // enterprise has no self-serve Price ID — product prod_V58JbAis1iFEZS is invoiced manually
  enterprise: "",
};

<<<<<<< HEAD
const BIZFORMA_PRICE_ID = "price_1U4y2fF3gri2YoH216cteUPm"; // one-time BizForma filing fee
const ENTERPRISE_PRODUCT_ID = "prod_V58JbAis1iFEZS";
=======
const BIZFORMA_PRICE_ID = 'price_1U4y2fF3gri2YoH216cteUPm'; // one-time BizForma filing fee
>>>>>>> 555271160f5d68fa5a56d39e1430755242ccacfc

const ADDON_PRICE_IDS = {
  bizforma: BIZFORMA_PRICE_ID,
  scout: "price_1U4yQ1F3gri2YoH2f92zGg4I",
  extraSeat: "price_1U4yR2F3gri2YoH2rCTwcAGV",
  payroll: "price_1U4ydIF3gri2YoH2nM6f3EtU",
  pbxSeat: "price_1U4ydTF3gri2YoH2wffhEcxz",
  pbxUsage: "price_1U4ydUF3gri2YoH2IYFJbrvq",
} as const;

const USAGE_METERS = {
  payroll: {
    meterId: "mtr_test_61VEMZ54T16CvSGWl41F3gri2YoH21qq",
    eventName: "payroll_employee_count",
  },
  pbx: { meterId: "mtr_test_61VEMa0BG5zOSyQfe41F3gri2YoH2MCu", eventName: "pbx_minutes_used" },
} as const;

const app = new Hono<{ Bindings: Bindings }>();

app.use(
  "*",
  cors({
    origin: (origin) =>
      origin && (origin.endsWith(".insighthunter.app") || origin === "https://insighthunter.app")
        ? origin
        : null,
    allowMethods: ["GET", "POST"],
  }),
);

app.get("/health", (c) => c.json({ service: "payments", ok: true }));

app.post("/usage", async (c) => {
  const body = await c.req
    .json<{ stripeCustomerId: string; type: "payroll" | "pbx"; value: number }>()
    .catch(() => null);
  if (!body?.stripeCustomerId || !body?.type || typeof body.value !== "number") {
    return c.json({ error: "stripeCustomerId, type, and numeric value required" }, 400);
  }
  const meter = USAGE_METERS[body.type];
  if (!meter) return c.json({ error: "invalid usage type" }, 400);

  const stripe = new Stripe(c.env.STRIPE_SECRET_KEY, { apiVersion: "2024-06-20" });
  const event = await stripe.billing.meterEvents.create({
    event_name: meter.eventName,
    payload: {
      stripe_customer_id: body.stripeCustomerId,
      value: String(body.value),
    },
  });
  return c.json({ received: true, eventId: event.identifier });
});

// Create a Checkout Session for a plan upgrade
app.post("/checkout", async (c) => {
  const body = await c.req.json<CheckoutBody>().catch(() => null);
  if (!body?.orgId || !body?.email || !body?.plan || !(body.plan in PRICE_IDS)) {
    return c.json({ error: "orgId, email, and valid plan required" }, 400);
  }
  if (body.plan === "enterprise") {
    return c.json(
      {
        error: "Enterprise is custom-quoted. Contact sales instead of checkout.",
        contactUrl: "https://insighthunter.app/contact-sales",
      },
      400,
    );
  }

  const stripe = new Stripe(c.env.STRIPE_SECRET_KEY, { apiVersion: "2024-06-20" });

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer_email: body.email,
    line_items: [{ price: PRICE_IDS[body.plan], quantity: 1 }],
    success_url: `${c.env.DASHBOARD_URL}/billing/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${c.env.DASHBOARD_URL}/billing/cancel`,
    client_reference_id: body.orgId,
    metadata: { orgId: body.orgId, plan: body.plan },
  });

  return c.json({ url: session.url });
});

// Stripe webhook — source of truth for entitlement writes
app.post("/webhook", async (c) => {
  const sig = c.req.header("stripe-signature");
  const rawBody = await c.req.text();
  if (!sig) return c.json({ error: "missing signature" }, 400);

  const stripe = new Stripe(c.env.STRIPE_SECRET_KEY, { apiVersion: "2024-06-20" });
  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(rawBody, sig, c.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    return c.json({ error: `signature verification failed: ${(err as Error).message}` }, 400);
  }

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      const orgId = session.client_reference_id;
      const plan = session.metadata?.plan as OrgPlan | undefined;
      if (orgId && plan) {
        await c.env.DB.prepare(
          `UPDATE organizations SET plan = ?, stripe_customer_id = ?, stripe_subscription_id = ? WHERE id = ?`,
        )
          .bind(plan, session.customer as string, session.subscription as string, orgId)
          .run();
        await c.env.KV_ENTITLEMENTS.put(orgId, JSON.stringify({ plan, updatedAt: Date.now() }));
      }
      break;
    }
    case "customer.subscription.deleted": {
      const sub = event.data.object as Stripe.Subscription;
      const row = await c.env.DB.prepare(
        `SELECT id FROM organizations WHERE stripe_subscription_id = ?`,
      )
        .bind(sub.id)
        .first<{ id: string }>();
      if (row) {
        await c.env.DB.prepare(`UPDATE organizations SET plan = 'starter' WHERE id = ?`)
          .bind(row.id)
          .run();
        await c.env.KV_ENTITLEMENTS.put(
          row.id,
          JSON.stringify({ plan: "starter", updatedAt: Date.now() }),
        );
      }
      break;
    }
  }

  return c.json({ received: true });
});

app.post("/addon-checkout", async (c) => {
  const body = await c.req
    .json<{
      orgId: string;
      email: string;
      addon: keyof typeof ADDON_PRICE_IDS;
      quantity?: number;
    }>()
    .catch(() => null);
  if (!body?.orgId || !body?.email || !body?.addon || !(body.addon in ADDON_PRICE_IDS)) {
    return c.json({ error: "orgId, email, and valid addon required" }, 400);
  }

  const stripe = new Stripe(c.env.STRIPE_SECRET_KEY, { apiVersion: "2024-06-20" });
  const isOneTime = body.addon === "bizforma";

  const session = await stripe.checkout.sessions.create({
    mode: isOneTime ? "payment" : "subscription",
    customer_email: body.email,
    line_items: [{ price: ADDON_PRICE_IDS[body.addon], quantity: body.quantity ?? 1 }],
    success_url: `${c.env.DASHBOARD_URL}/billing/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${c.env.DASHBOARD_URL}/billing/cancel`,
    client_reference_id: body.orgId,
    metadata: { orgId: body.orgId, addon: body.addon },
  });

  return c.json({ url: session.url });
});

export default app;
