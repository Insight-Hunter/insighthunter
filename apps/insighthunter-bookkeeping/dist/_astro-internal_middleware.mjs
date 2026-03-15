import 'es-module-lexer';
import './chunks/shared_9gEenf6c.mjs';
import { appendForwardSlash, removeTrailingForwardSlash } from '@astrojs/internal-helpers/path';
import 'piccolore';
import 'html-escaper';
import 'clsx';
import { o as originPathnameSymbol, A as AstroError, F as ForbiddenRewrite } from './chunks/astro/server_DPCtPSmh.mjs';
import * as jose from 'jose';

function shouldAppendForwardSlash(trailingSlash, buildFormat) {
  switch (trailingSlash) {
    case "always":
      return true;
    case "never":
      return false;
    case "ignore": {
      switch (buildFormat) {
        case "directory":
          return true;
        case "preserve":
        case "file":
          return false;
      }
    }
  }
}

function setOriginPathname(request, pathname, trailingSlash, buildFormat) {
  if (!pathname) {
    pathname = "/";
  }
  const shouldAppendSlash = shouldAppendForwardSlash(trailingSlash, buildFormat);
  let finalPathname;
  if (pathname === "/") {
    finalPathname = "/";
  } else if (shouldAppendSlash) {
    finalPathname = appendForwardSlash(pathname);
  } else {
    finalPathname = removeTrailingForwardSlash(pathname);
  }
  Reflect.set(request, originPathnameSymbol, encodeURIComponent(finalPathname));
}

function getParams(route, pathname) {
  if (!route.params.length) return {};
  const paramsMatch = route.pattern.exec(pathname) || route.fallbackRoutes.map((fallbackRoute) => fallbackRoute.pattern.exec(pathname)).find((x) => x);
  if (!paramsMatch) return {};
  const params = {};
  route.params.forEach((key, i) => {
    if (key.startsWith("...")) {
      params[key.slice(3)] = paramsMatch[i + 1] ? paramsMatch[i + 1] : void 0;
    } else {
      params[key] = paramsMatch[i + 1];
    }
  });
  return params;
}

const apiContextRoutesSymbol = Symbol.for("context.routes");

function sequence(...handlers) {
  const filtered = handlers.filter((h) => !!h);
  const length = filtered.length;
  if (!length) {
    return defineMiddleware((_context, next) => {
      return next();
    });
  }
  return defineMiddleware((context, next) => {
    let carriedPayload = void 0;
    return applyHandle(0, context);
    function applyHandle(i, handleContext) {
      const handle = filtered[i];
      const result = handle(handleContext, async (payload) => {
        if (i < length - 1) {
          if (payload) {
            let newRequest;
            if (payload instanceof Request) {
              newRequest = payload;
            } else if (payload instanceof URL) {
              newRequest = new Request(payload, handleContext.request.clone());
            } else {
              newRequest = new Request(
                new URL(payload, handleContext.url.origin),
                handleContext.request.clone()
              );
            }
            const oldPathname = handleContext.url.pathname;
            const pipeline = Reflect.get(handleContext, apiContextRoutesSymbol);
            const { routeData, pathname } = await pipeline.tryRewrite(
              payload,
              handleContext.request
            );
            if (pipeline.serverLike === true && handleContext.isPrerendered === false && routeData.prerender === true) {
              throw new AstroError({
                ...ForbiddenRewrite,
                message: ForbiddenRewrite.message(
                  handleContext.url.pathname,
                  pathname,
                  routeData.component
                ),
                hint: ForbiddenRewrite.hint(routeData.component)
              });
            }
            carriedPayload = payload;
            handleContext.request = newRequest;
            handleContext.url = new URL(newRequest.url);
            handleContext.params = getParams(routeData, pathname);
            handleContext.routePattern = routeData.route;
            setOriginPathname(
              handleContext.request,
              oldPathname,
              pipeline.manifest.trailingSlash,
              pipeline.manifest.buildFormat
            );
          }
          return applyHandle(i + 1, handleContext);
        } else {
          return next(payload ?? carriedPayload);
        }
      });
      return result;
    }
  });
}

function defineMiddleware(fn) {
  return fn;
}

async function resolveAuth(cookieHeader, jwtSecret) {
  const defaults = { userId: null, userEmail: null, subscriptionTier: null };
  if (!cookieHeader) return defaults;
  const token = cookieHeader.split(";").map((c) => c.trim()).find((c) => c.startsWith("auth_token="))?.slice("auth_token=".length);
  if (!token) return defaults;
  try {
    const { payload } = await jose.jwtVerify(
      token,
      new TextEncoder().encode(jwtSecret)
    );
    return {
      userId: payload.sub ?? null,
      userEmail: payload.email ?? null,
      subscriptionTier: payload.tier ?? "free"
    };
  } catch {
    return defaults;
  }
}
const PROTECTED_PREFIXES = [
  "/dashboard",
  "/upload",
  "/account",
  "/api/upload",
  "/api/reports",
  "/api/account"
];
function isProtectedRoute(pathname) {
  return PROTECTED_PREFIXES.some((p) => pathname.startsWith(p));
}

const onRequest$1 = defineMiddleware(async ({ locals, request, url, redirect }, next) => {
  const env = locals.runtime?.env;
  const auth = await resolveAuth(
    request.headers.get("cookie"),
    env?.JWT_SECRET ?? ""
  );
  locals.userId = auth.userId;
  locals.userEmail = auth.userEmail;
  locals.subscriptionTier = auth.subscriptionTier;
  if (isProtectedRoute(url.pathname)) {
    if (!auth.userId) {
      return redirect(
        `https://insighthunter.app/auth/login?redirect=${encodeURIComponent(url.href)}`
      );
    }
    if (auth.subscriptionTier === "free") {
      return redirect("https://insighthunter.app/pricing?upgrade=bookkeeping");
    }
  }
  return next();
});

const onRequest = sequence(
	
	onRequest$1
	
);

export { onRequest };
