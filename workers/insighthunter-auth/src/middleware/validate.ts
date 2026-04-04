import type { MiddlewareHandler } from "hono";
import type { ZodSchema } from "zod";
import type { Env } from "@/types";

/**
 * Zod schema validation middleware.
 * Parses JSON body and stores the validated result in c.var.body.
 */
export function validateBody<T>(
  schema: ZodSchema<T>
): MiddlewareHandler<{ Bindings: Env; Variables: { body: T } }> {
  return async (c, next) => {
    let raw: unknown;
    try {
      raw = await c.req.json();
    } catch {
      return c.json({ error: "Bad Request", message: "Invalid JSON body." }, 400);
    }

    const result = schema.safeParse(raw);
    if (!result.success) {
      return c.json({
        error:   "Validation Failed",
        message: result.error.issues[0]?.message ?? "Invalid request body.",
        issues:  result.error.issues.map(i => ({ field: i.path.join("."), message: i.message })),
      }, 422);
    }

    c.set("body", result.data);
    await next();
  };
}
