import { Hono } from "hono";
import { z } from "zod";
import type { Env } from "@/types";
import { validateBody } from "@/middleware/validate";
import { rateLimitMiddleware } from "@/middleware/rateLimit";
import { registerUser } from "@/services/authService";
import { logger } from "@/lib/logger";

const RegisterSchema = z.object({
  name:     z.string().min(2).max(80).trim(),
  email:    z.string().email().toLowerCase().trim(),
  password: z.string().min(8).max(128),
  orgName:  z.string().min(2).max(100).trim().optional(),
});

const register = new Hono<{ Bindings: Env; Variables: { body: z.infer<typeof RegisterSchema> } }>();

register.post(
  "/",
  rateLimitMiddleware(10), // 10 registrations per window per IP
  validateBody(RegisterSchema),
  async (c) => {
    const body = c.get("body");
    try {
      const result = await registerUser(c.env, body, c.req.raw);
      return c.json(result, 201);
    } catch (e: any) {
      logger.warn("Registration failed", { email: body.email, error: e.message });
      return c.json({ error: e.message }, e.status ?? 500);
    }
  }
);

export default register;
