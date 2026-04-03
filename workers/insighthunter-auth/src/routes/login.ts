import { Hono } from "hono";
import { z } from "zod";
import type { Env } from "@/types";
import { validateBody } from "@/middleware/validate";
import { rateLimitMiddleware } from "@/middleware/rateLimit";
import { loginUser } from "@/services/authService";
import { logger } from "@/lib/logger";

const LoginSchema = z.object({
  email:    z.string().email().toLowerCase().trim(),
  password: z.string().min(1),
});

const login = new Hono<{ Bindings: Env; Variables: { body: z.infer<typeof LoginSchema> } }>();

login.post(
  "/",
  rateLimitMiddleware(10), // strict: 10 login attempts per window per IP
  validateBody(LoginSchema),
  async (c) => {
    const body = c.get("body");
    try {
      const result = await loginUser(c.env, body, c.req.raw);
      return c.json(result, 200);
    } catch (e: any) {
      logger.warn("Login failed", { email: body.email, error: e.message });
      return c.json({ error: e.message }, e.status ?? 500);
    }
  }
);

export default login;
