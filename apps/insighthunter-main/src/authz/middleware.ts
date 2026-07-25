import { createMiddleware } from "hono/factory";
import { getLoginRedirectUrl } from "@insighthunter/auth-shared";
import { customerHasEntitlement } from "./entitlements.js";
import type { FeatureKey } from "./plans.js";
import { ensureCustomer, getSession } from "./session.js";

type Bindings = {
  AUTH_BASE_URL: string;
  MAIN_BASE_URL: string;
  DB: D1Database;
};

export function requireEntitlement(featureKey: FeatureKey) {
  return createMiddleware<{ Bindings: Bindings }>(async (c, next) => {
    const session = await getSession(c.env.AUTH_BASE_URL, c.req.raw);

    if (!session || !session.user.email) {
      const loginUrl = getLoginRedirectUrl(c.env.AUTH_BASE_URL, c.env.MAIN_BASE_URL);
      return c.redirect(loginUrl, 302);
    }

    const customer = await ensureCustomer(c.env.DB, session.user.subject, session.user.email);
    const allowed = await customerHasEntitlement(c.env.DB, customer.id, featureKey);

    if (!allowed) {
      return c.json(
        {
          ok: false,
          error: "entitlement_required",
          feature: featureKey,
        },
        403,
      );
    }

    c.set("session", session);
    c.set("customer", customer);
    await next();
  });
}
