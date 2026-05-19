import { Hono } from "hono";
import * as einService from "../services/einService";

export const einApi = new Hono();

einApi.post("/prefill", async (c) => {
  const buildSS4Prefill = einService.buildSS4Prefill ?? einService.default;
  if (typeof buildSS4Prefill !== "function") {
    throw new TypeError("einService.buildSS4Prefill is not a function");
  }

  return c.json(buildSS4Prefill(await c.req.json<any>()));
});
