
import { defineMiddleware } from "astro:middleware";

const protectedRoutes = ["/dashboard", "/admin"];

export const onRequest = defineMiddleware(async (context, next) => {
  const user = context.locals.user;
  const url = context.url.pathname;

  if (protectedRoutes.some(route => url.startsWith(route))) {
    if (!user) {
      return context.redirect("/auth/login?redirect=" + url);
    }

    if (url.startsWith("/admin") && user.plan !== "pro") {
      return context.redirect("/dashboard");
    }
  }

  return next();
});
