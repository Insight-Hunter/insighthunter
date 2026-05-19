import { Hono } from "hono";
import * as askAdvisorService from "../../services/aiAdvisorService";

const askAdvisor =
  typeof (askAdvisorService as any).askAdvisor === "function"
    ? (askAdvisorService as any).askAdvisor
    : typeof (askAdvisorService as any).default === "function"
      ? (askAdvisorService as any).default
      : undefined;

if (typeof askAdvisor !== "function") {
  throw new TypeError("aiAdvisorService does not export a callable askAdvisor function");
}

export const chatApi = new Hono();
chatApi.post("/", async (c) =>
  c.json({ result: await askAdvisor(c.env, (await c.req.json<any>()).message) })
);
