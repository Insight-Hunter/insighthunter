import { Hono } from "hono";
import { evaluate1099Threshold } from "../../services/payrollService";

export const form1099Api = new Hono();

form1099Api.post("/evaluate", async (c) => {
  const body = await c.req.json<any>();

  if (typeof evaluate1099Threshold !== "function") {
    return c.json({ error: "Payroll threshold evaluator is not available" }, 500);
  }

  return c.json(evaluate1099Threshold(body.amountCents));
});
