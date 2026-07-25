import { Hono } from "hono";
import { ensureCustomer, getSession } from "../authz/session.js";
import { FEATURE_KEYS, getPlanFeatures } from "../authz/plans.js";
import { customerHasEntitlement } from "../authz/entitlements.js";

type Env = {
  Bindings: {
    AUTH_BASE_URL: string;
    MAIN_BASE_URL: string;
    DB: D1Database;
  };
};

const entitlements = new Hono<Env>();

entitlements.get("/api/entitlements", async (c) => {
  const session = await getSession(c.env.AUTH_BASE_URL, c.req.raw);

  if (!session || !session.user.email) {
    return c.json({ ok: false, error: "unauthorized" }, 401);
  }

  const customer = await ensureCustomer(c.env.DB, session.user.subject, session.user.email);

  const rows = await c.env.DB.prepare(
    `SELECT feature_key, status, source, expires_at, metadata_json
     FROM entitlements
     WHERE customer_id = ?
     ORDER BY feature_key ASC`
  ).bind(customer.id).all<{
    results: Array<{
      feature_key: string;
      status: string;
      source: string;
      expires_at?: string | null;
      metadata_json?: string | null;
    }>;
  }>();

  return c.json({
    ok: true,
    customerId: customer.id,
    entitlements: rows.results ?? [],
  });
});

entitlements.get("/api/entitlements/check/:featureKey", async (c) => {
  const featureKey = c.req.param("featureKey");

  if (!Object.values(FEATURE_KEYS).includes(featureKey as (typeof FEATURE_KEYS)[keyof typeof FEATURE_KEYS])) {
    return c.json({ ok: false, error: "unknown_feature" }, 400);
  }

  const session = await getSession(c.env.AUTH_BASE_URL, c.req.raw);

  if (!session || !session.user.email) {
    return c.json({ ok: false, error: "unauthorized" }, 401);
  }

  const customer = await ensureCustomer(c.env.DB, session.user.subject, session.user.email);
  const allowed = await customerHasEntitlement(c.env.DB, customer.id, featureKey as keyof typeof FEATURE_KEYS extends never ? never : any);

  return c.json({
    ok: true,
    featureKey,
    allowed,
  });
});

entitlements.get("/api/plans/:planCode/features", (c) => {
  const planCode = c.req.param("planCode");

  return c.json({
    ok: true,
    planCode,
    features: getPlanFeatures(planCode),
  });
});

export default entitlements;
