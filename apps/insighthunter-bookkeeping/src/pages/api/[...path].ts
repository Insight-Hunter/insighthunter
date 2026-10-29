import type { APIRoute } from "astro";
import { app } from "../../index.js";

export const prerender = false;

export const ALL: APIRoute = ({ request, locals }) =>
  app.fetch(request, locals.runtime.env, locals.runtime.ctx);
