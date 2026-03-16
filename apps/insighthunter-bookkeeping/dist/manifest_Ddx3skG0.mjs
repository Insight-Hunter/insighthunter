import '@astrojs/internal-helpers/path';
import '@astrojs/internal-helpers/remote';
import 'piccolore';
import 'html-escaper';
import 'clsx';
import { N as NOOP_MIDDLEWARE_HEADER, g as decodeKey } from './chunks/astro/server_DPCtPSmh.mjs';
import './chunks/shared_9gEenf6c.mjs';
import 'es-module-lexer';

const NOOP_MIDDLEWARE_FN = async (_ctx, next) => {
  const response = await next();
  response.headers.set(NOOP_MIDDLEWARE_HEADER, "true");
  return response;
};

function sanitizeParams(params) {
  return Object.fromEntries(
    Object.entries(params).map(([key, value]) => {
      if (typeof value === "string") {
        return [key, value.normalize().replace(/#/g, "%23").replace(/\?/g, "%3F")];
      }
      return [key, value];
    })
  );
}
function getParameter(part, params) {
  if (part.spread) {
    return params[part.content.slice(3)] || "";
  }
  if (part.dynamic) {
    if (!params[part.content]) {
      throw new TypeError(`Missing parameter: ${part.content}`);
    }
    return params[part.content];
  }
  return part.content.normalize().replace(/\?/g, "%3F").replace(/#/g, "%23").replace(/%5B/g, "[").replace(/%5D/g, "]");
}
function getSegment(segment, params) {
  const segmentPath = segment.map((part) => getParameter(part, params)).join("");
  return segmentPath ? "/" + segmentPath : "";
}
function getRouteGenerator(segments, addTrailingSlash) {
  return (params) => {
    const sanitizedParams = sanitizeParams(params);
    let trailing = "";
    if (addTrailingSlash === "always" && segments.length) {
      trailing = "/";
    }
    const path = segments.map((segment) => getSegment(segment, sanitizedParams)).join("") + trailing;
    return path || "/";
  };
}

function deserializeRouteData(rawRouteData) {
  return {
    route: rawRouteData.route,
    type: rawRouteData.type,
    pattern: new RegExp(rawRouteData.pattern),
    params: rawRouteData.params,
    component: rawRouteData.component,
    generate: getRouteGenerator(rawRouteData.segments, rawRouteData._meta.trailingSlash),
    pathname: rawRouteData.pathname || void 0,
    segments: rawRouteData.segments,
    prerender: rawRouteData.prerender,
    redirect: rawRouteData.redirect,
    redirectRoute: rawRouteData.redirectRoute ? deserializeRouteData(rawRouteData.redirectRoute) : void 0,
    fallbackRoutes: rawRouteData.fallbackRoutes.map((fallback) => {
      return deserializeRouteData(fallback);
    }),
    isIndex: rawRouteData.isIndex,
    origin: rawRouteData.origin
  };
}

function deserializeManifest(serializedManifest) {
  const routes = [];
  for (const serializedRoute of serializedManifest.routes) {
    routes.push({
      ...serializedRoute,
      routeData: deserializeRouteData(serializedRoute.routeData)
    });
    const route = serializedRoute;
    route.routeData = deserializeRouteData(serializedRoute.routeData);
  }
  const assets = new Set(serializedManifest.assets);
  const componentMetadata = new Map(serializedManifest.componentMetadata);
  const inlinedScripts = new Map(serializedManifest.inlinedScripts);
  const clientDirectives = new Map(serializedManifest.clientDirectives);
  const serverIslandNameMap = new Map(serializedManifest.serverIslandNameMap);
  const key = decodeKey(serializedManifest.key);
  return {
    // in case user middleware exists, this no-op middleware will be reassigned (see plugin-ssr.ts)
    middleware() {
      return { onRequest: NOOP_MIDDLEWARE_FN };
    },
    ...serializedManifest,
    assets,
    componentMetadata,
    inlinedScripts,
    clientDirectives,
    routes,
    serverIslandNameMap,
    key
  };
}

const manifest = deserializeManifest({"hrefRoot":"file:///home/user/insighthunter/apps/insighthunter-bookkeeping/","cacheDir":"file:///home/user/insighthunter/apps/insighthunter-bookkeeping/node_modules/.astro/","outDir":"file:///home/user/insighthunter/apps/insighthunter-bookkeeping/dist/","srcDir":"file:///home/user/insighthunter/apps/insighthunter-bookkeeping/src/","publicDir":"file:///home/user/insighthunter/apps/insighthunter-bookkeeping/public/","buildClientDir":"file:///home/user/insighthunter/apps/insighthunter-bookkeeping/dist/client/","buildServerDir":"file:///home/user/insighthunter/apps/insighthunter-bookkeeping/dist/server/","adapterName":"","routes":[{"file":"file:///home/user/insighthunter/apps/insighthunter-bookkeeping/dist/clients/index.html","links":[],"scripts":[],"styles":[],"routeData":{"route":"/clients","isIndex":false,"type":"page","pattern":"^\\/clients\\/?$","segments":[[{"content":"clients","dynamic":false,"spread":false}]],"params":[],"component":"src/pages/clients.astro","pathname":"/clients","prerender":true,"fallbackRoutes":[],"distURL":[],"origin":"project","_meta":{"trailingSlash":"ignore"}}},{"file":"file:///home/user/insighthunter/apps/insighthunter-bookkeeping/dist/dashboard/index.html","links":[],"scripts":[],"styles":[],"routeData":{"route":"/dashboard","isIndex":false,"type":"page","pattern":"^\\/dashboard\\/?$","segments":[[{"content":"dashboard","dynamic":false,"spread":false}]],"params":[],"component":"src/pages/dashboard.astro","pathname":"/dashboard","prerender":true,"fallbackRoutes":[],"distURL":[],"origin":"project","_meta":{"trailingSlash":"ignore"}}},{"file":"file:///home/user/insighthunter/apps/insighthunter-bookkeeping/dist/onboarding/index.html","links":[],"scripts":[],"styles":[],"routeData":{"route":"/onboarding","isIndex":false,"type":"page","pattern":"^\\/onboarding\\/?$","segments":[[{"content":"onboarding","dynamic":false,"spread":false}]],"params":[],"component":"src/pages/onboarding.astro","pathname":"/onboarding","prerender":true,"fallbackRoutes":[],"distURL":[],"origin":"project","_meta":{"trailingSlash":"ignore"}}},{"file":"file:///home/user/insighthunter/apps/insighthunter-bookkeeping/dist/pricing/index.html","links":[],"scripts":[],"styles":[],"routeData":{"route":"/pricing","isIndex":false,"type":"page","pattern":"^\\/pricing\\/?$","segments":[[{"content":"pricing","dynamic":false,"spread":false}]],"params":[],"component":"src/pages/pricing.astro","pathname":"/pricing","prerender":true,"fallbackRoutes":[],"distURL":[],"origin":"project","_meta":{"trailingSlash":"ignore"}}},{"file":"file:///home/user/insighthunter/apps/insighthunter-bookkeeping/dist/reconciliations/index.html","links":[],"scripts":[],"styles":[],"routeData":{"route":"/reconciliations","isIndex":false,"type":"page","pattern":"^\\/reconciliations\\/?$","segments":[[{"content":"reconciliations","dynamic":false,"spread":false}]],"params":[],"component":"src/pages/reconciliations.astro","pathname":"/reconciliations","prerender":true,"fallbackRoutes":[],"distURL":[],"origin":"project","_meta":{"trailingSlash":"ignore"}}},{"file":"file:///home/user/insighthunter/apps/insighthunter-bookkeeping/dist/reports/index.html","links":[],"scripts":[],"styles":[],"routeData":{"route":"/reports","isIndex":false,"type":"page","pattern":"^\\/reports\\/?$","segments":[[{"content":"reports","dynamic":false,"spread":false}]],"params":[],"component":"src/pages/reports.astro","pathname":"/reports","prerender":true,"fallbackRoutes":[],"distURL":[],"origin":"project","_meta":{"trailingSlash":"ignore"}}},{"file":"file:///home/user/insighthunter/apps/insighthunter-bookkeeping/dist/settings/index.html","links":[],"scripts":[],"styles":[],"routeData":{"route":"/settings","isIndex":false,"type":"page","pattern":"^\\/settings\\/?$","segments":[[{"content":"settings","dynamic":false,"spread":false}]],"params":[],"component":"src/pages/settings.astro","pathname":"/settings","prerender":true,"fallbackRoutes":[],"distURL":[],"origin":"project","_meta":{"trailingSlash":"ignore"}}},{"file":"file:///home/user/insighthunter/apps/insighthunter-bookkeeping/dist/signup/index.html","links":[],"scripts":[],"styles":[],"routeData":{"route":"/signup","isIndex":false,"type":"page","pattern":"^\\/signup\\/?$","segments":[[{"content":"signup","dynamic":false,"spread":false}]],"params":[],"component":"src/pages/signup.astro","pathname":"/signup","prerender":true,"fallbackRoutes":[],"distURL":[],"origin":"project","_meta":{"trailingSlash":"ignore"}}}],"base":"/","trailingSlash":"ignore","compressHTML":true,"componentMetadata":[["/home/user/insighthunter/apps/insighthunter-bookkeeping/src/pages/pricing.astro",{"propagation":"none","containsHead":true}],["/home/user/insighthunter/apps/insighthunter-bookkeeping/src/pages/signup.astro",{"propagation":"none","containsHead":true}],["/home/user/insighthunter/apps/insighthunter-bookkeeping/src/pages/clients.astro",{"propagation":"none","containsHead":true}],["/home/user/insighthunter/apps/insighthunter-bookkeeping/src/pages/dashboard.astro",{"propagation":"none","containsHead":true}],["/home/user/insighthunter/apps/insighthunter-bookkeeping/src/pages/onboarding.astro",{"propagation":"none","containsHead":true}],["/home/user/insighthunter/apps/insighthunter-bookkeeping/src/pages/reconciliations.astro",{"propagation":"none","containsHead":true}],["/home/user/insighthunter/apps/insighthunter-bookkeeping/src/pages/reports.astro",{"propagation":"none","containsHead":true}],["/home/user/insighthunter/apps/insighthunter-bookkeeping/src/pages/settings.astro",{"propagation":"none","containsHead":true}]],"renderers":[],"clientDirectives":[["idle","(()=>{var l=(n,t)=>{let i=async()=>{await(await n())()},e=typeof t.value==\"object\"?t.value:void 0,s={timeout:e==null?void 0:e.timeout};\"requestIdleCallback\"in window?window.requestIdleCallback(i,s):setTimeout(i,s.timeout||200)};(self.Astro||(self.Astro={})).idle=l;window.dispatchEvent(new Event(\"astro:idle\"));})();"],["load","(()=>{var e=async t=>{await(await t())()};(self.Astro||(self.Astro={})).load=e;window.dispatchEvent(new Event(\"astro:load\"));})();"],["media","(()=>{var n=(a,t)=>{let i=async()=>{await(await a())()};if(t.value){let e=matchMedia(t.value);e.matches?i():e.addEventListener(\"change\",i,{once:!0})}};(self.Astro||(self.Astro={})).media=n;window.dispatchEvent(new Event(\"astro:media\"));})();"],["only","(()=>{var e=async t=>{await(await t())()};(self.Astro||(self.Astro={})).only=e;window.dispatchEvent(new Event(\"astro:only\"));})();"],["visible","(()=>{var a=(s,i,o)=>{let r=async()=>{await(await s())()},t=typeof i.value==\"object\"?i.value:void 0,c={rootMargin:t==null?void 0:t.rootMargin},n=new IntersectionObserver(e=>{for(let l of e)if(l.isIntersecting){n.disconnect(),r();break}},c);for(let e of o.children)n.observe(e)};(self.Astro||(self.Astro={})).visible=a;window.dispatchEvent(new Event(\"astro:visible\"));})();"]],"entryModules":{"\u0000astro-internal:middleware":"_astro-internal_middleware.mjs","\u0000virtual:astro:actions/noop-entrypoint":"noop-entrypoint.mjs","\u0000@astro-page:src/pages/clients@_@astro":"pages/clients.astro.mjs","\u0000@astro-page:src/pages/dashboard@_@astro":"pages/dashboard.astro.mjs","\u0000@astro-page:src/pages/onboarding@_@astro":"pages/onboarding.astro.mjs","\u0000@astro-page:src/pages/pricing@_@astro":"pages/pricing.astro.mjs","\u0000@astro-page:src/pages/reconciliations@_@astro":"pages/reconciliations.astro.mjs","\u0000@astro-page:src/pages/reports@_@astro":"pages/reports.astro.mjs","\u0000@astro-page:src/pages/settings@_@astro":"pages/settings.astro.mjs","\u0000@astro-page:src/pages/signup@_@astro":"pages/signup.astro.mjs","\u0000@astro-renderers":"renderers.mjs","\u0000@astrojs-manifest":"manifest_Ddx3skG0.mjs","/home/user/insighthunter/apps/insighthunter-bookkeeping/src/components/bookkeeping/LedgerTable.tsx":"_astro/LedgerTable.Bl4P5DCl.js","@/components/payment/PricingCards":"_astro/PricingCards.DItHPCf-.js","/home/user/insighthunter/apps/insighthunter-bookkeeping/src/components/ReconciliationWizard":"_astro/ReconciliationWizard.D4M6z07R.js","/home/user/insighthunter/apps/insighthunter-bookkeeping/src/components/bookkeeping/ReportCard.tsx":"_astro/ReportCard.BEACcoYa.js","/home/user/insighthunter/apps/insighthunter-bookkeeping/src/components/quickbooks/QuickBooksConnect.tsx":"_astro/QuickBooksConnect.Cc4u5tgE.js","@/components/auth/SignupForm":"_astro/SignupForm.CkOOjbVq.js","@/components/onboarding/OnboardingWizard":"_astro/OnboardingWizard.iNssapuP.js","/home/user/insighthunter/apps/insighthunter-bookkeeping/src/components/shared/NavBar.tsx":"_astro/NavBar.DRPT6k79.js","@astrojs/react/client.js":"_astro/client.DkeD9bak.js","/home/user/insighthunter/apps/insighthunter-bookkeeping/src/pages/dashboard.astro?astro&type=script&index=0&lang.ts":"_astro/dashboard.astro_astro_type_script_index_0_lang.CrcusKJZ.js","/home/user/insighthunter/apps/insighthunter-bookkeeping/src/pages/settings.astro?astro&type=script&index=0&lang.ts":"_astro/settings.astro_astro_type_script_index_0_lang.DScWXxpT.js","/home/user/insighthunter/apps/insighthunter-bookkeeping/src/pages/clients.astro?astro&type=script&index=0&lang.ts":"_astro/clients.astro_astro_type_script_index_0_lang.CnpkMSy2.js","astro:scripts/before-hydration.js":""},"inlinedScripts":[["/home/user/insighthunter/apps/insighthunter-bookkeeping/src/pages/dashboard.astro?astro&type=script&index=0&lang.ts","const o=\"http://localhost:8787\",n=\"default\";async function a(){try{const t=await(await fetch(`${o}/api/ledger/${n}/profit-loss`)).json();document.getElementById(\"totalRevenue\").textContent=`$${t.totalRevenue.toLocaleString()}`,document.getElementById(\"totalExpenses\").textContent=`$${t.totalExpenses.toLocaleString()}`,document.getElementById(\"netIncome\").textContent=`$${t.netIncome.toLocaleString()}`}catch(e){console.error(\"Failed to load metrics:\",e)}}a();"],["/home/user/insighthunter/apps/insighthunter-bookkeeping/src/pages/settings.astro?astro&type=script&index=0&lang.ts","document.getElementById(\"companyForm\")?.addEventListener(\"submit\",e=>{e.preventDefault(),alert(\"Settings saved successfully!\")});document.getElementById(\"exportBtn\")?.addEventListener(\"click\",()=>{alert(\"Exporting data...\")});document.getElementById(\"importBtn\")?.addEventListener(\"click\",()=>{alert(\"Import feature coming soon!\")});document.getElementById(\"resetBtn\")?.addEventListener(\"click\",()=>{confirm(\"Are you sure? This will delete all data!\")&&alert(\"Data reset functionality not implemented in demo\")});"],["/home/user/insighthunter/apps/insighthunter-bookkeeping/src/pages/clients.astro?astro&type=script&index=0&lang.ts","const s=\"http://localhost:8787\",c=\"default\",a=document.getElementById(\"clientDialog\"),o=document.getElementById(\"clientForm\"),r=document.getElementById(\"clientsList\");document.getElementById(\"addClientBtn\").addEventListener(\"click\",()=>{a.showModal()});document.getElementById(\"cancelBtn\").addEventListener(\"click\",()=>{a.close()});o.addEventListener(\"submit\",async t=>{t.preventDefault();const n=new FormData(o),e=Object.fromEntries(n);try{await fetch(`${s}/api/clients/${c}`,{method:\"POST\",headers:{\"Content-Type\":\"application/json\"},body:JSON.stringify(e)}),a.close(),o.reset(),d()}catch(i){console.error(\"Failed to create client:\",i)}});async function d(){try{const n=await(await fetch(`${s}/api/clients/${c}`)).json();r.innerHTML=n.clients.map(e=>`\n        <div class=\"client-card\">\n          <h3>${e.name}</h3>\n          <p>📧 ${e.email}</p>\n          ${e.phone?`<p>📞 ${e.phone}</p>`:\"\"}\n          ${e.address?`<p>📍 ${e.address}</p>`:\"\"}\n          ${e.taxId?`<p>🆔 ${e.taxId}</p>`:\"\"}\n        </div>\n      `).join(\"\")}catch(t){console.error(\"Failed to load clients:\",t)}}d();"]],"assets":["/file:///home/user/insighthunter/apps/insighthunter-bookkeeping/dist/clients/index.html","/file:///home/user/insighthunter/apps/insighthunter-bookkeeping/dist/dashboard/index.html","/file:///home/user/insighthunter/apps/insighthunter-bookkeeping/dist/onboarding/index.html","/file:///home/user/insighthunter/apps/insighthunter-bookkeeping/dist/pricing/index.html","/file:///home/user/insighthunter/apps/insighthunter-bookkeeping/dist/reconciliations/index.html","/file:///home/user/insighthunter/apps/insighthunter-bookkeeping/dist/reports/index.html","/file:///home/user/insighthunter/apps/insighthunter-bookkeeping/dist/settings/index.html","/file:///home/user/insighthunter/apps/insighthunter-bookkeeping/dist/signup/index.html"],"buildFormat":"directory","checkOrigin":false,"allowedDomains":[],"actionBodySizeLimit":1048576,"serverIslandNameMap":[],"key":"hu2r6OoiKIHzhPYqHRg14Je0U72+eIRUcalFK1UHPYo="});
if (manifest.sessionConfig) manifest.sessionConfig.driverModule = null;

export { manifest };
