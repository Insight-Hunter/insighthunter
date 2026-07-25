import { Hono } from "hono";
import { customerHasEntitlement } from "../authz/entitlements.js";
import { FEATURE_KEYS } from "../authz/plans.js";
import { ensureCustomer, getSession } from "../authz/session.js";

type Env = {
  Bindings: {
    AUTH_BASE_URL: string;
    MAIN_BASE_URL: string;
    GATEWAY_BASE_URL: string;
    DB: D1Database;
  };
};

const onboarding = new Hono<Env>();

onboarding.get("/onboarding/route", async (c) => {
  const product = c.req.query("product") ?? "main";
  const session = await getSession(c.env.AUTH_BASE_URL, c.req.raw);

  if (!session || !session.user.email) {
    return c.redirect("/pricing", 302);
  }

  const customer = await ensureCustomer(c.env.DB, session.user.subject, session.user.email);

  if (product === "bizforma") {
    const canUseBizForma = await customerHasEntitlement(c.env.DB, customer.id, FEATURE_KEYS.APP_BIZFORMA);

    if (!canUseBizForma) {
      return c.redirect("/pricing", 302);
    }

    return c.redirect('${c.env.GATEWAY_BASE_URL}/handoff?app=bizforma', 302);
  }

  return c.redirect("/dashboard", 302);
});

export default onboarding;
