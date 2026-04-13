import { Hono } from "hono"; export const sCorpElectionApi = new Hono(); sCorpElectionApi.get("/", (c) => c.json({ deadlineRule: "Generally 2 months and 15 days after beginning of tax year." }));
