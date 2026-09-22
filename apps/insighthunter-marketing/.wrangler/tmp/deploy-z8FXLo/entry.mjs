globalThis.process ??= {};
globalThis.process.env ??= {};
import { A as AstroJSX, a as renderStreaming, j as createVNode, o as chunkToString } from "./chunks/server_Cr6k-K-A.mjs";
import { c as App, i as deserializeManifest, l as DefaultFetchHandler, o as deserializeRouteInfo } from "./chunks/entrypoints_B7rZtD65.mjs";
import { n as AstroUserError } from "./chunks/errors_DRbxFVnQ.mjs";
import "./chunks/service_MgP1XiK3.mjs";
import "./chunks/path_O1YIaOrL.mjs";
import "./chunks/remote_DnebYEqN.mjs";
import "cloudflare:workers";
//#region \0virtual:astro-cloudflare:config
var sessionKVBindingName = "SESSION";
//#endregion
//#region \0virtual:astro:fetchable
var _virtual_astro_fetchable_default = new DefaultFetchHandler();
//#endregion
//#region ../../node_modules/.pnpm/@astrojs+mdx@7.0.5_@astrojs+markdown-satteri@0.3.5_astro@7.2.2_@astrojs+markdown-remark_6f5e11dccf6d86686f9f32b1367a07fb/node_modules/@astrojs/mdx/dist/server.js
var slotName = (str) => str.trim().replace(/[-_]([a-z])/g, (_, w) => w.toUpperCase());
async function check(Component, props, { default: children = null, ...slotted } = {}) {
	if (typeof Component !== "function") return false;
	const slots = {};
	for (const [key, value] of Object.entries(slotted)) {
		const name = slotName(key);
		slots[name] = value;
	}
	try {
		return (await Component({
			...props,
			...slots,
			children
		}))[AstroJSX];
	} catch (e) {
		throwEnhancedErrorIfMdxComponent(e, Component);
	}
	return false;
}
async function renderToStaticMarkup(Component, props = {}, { default: children = null, ...slotted } = {}) {
	const slots = {};
	for (const [key, value] of Object.entries(slotted)) {
		const name = slotName(key);
		slots[name] = value;
	}
	const { result } = this;
	try {
		let html = "";
		const destination = { write(chunk) {
			if (chunk instanceof Response) return;
			html += chunkToString(result, chunk);
		} };
		await renderStreaming(createVNode(Component, {
			...props,
			...slots,
			children
		}), result, destination);
		return { html };
	} catch (e) {
		throwEnhancedErrorIfMdxComponent(e, Component);
		throw e;
	}
}
function throwEnhancedErrorIfMdxComponent(error, Component) {
	if (Component[/* @__PURE__ */ Symbol.for("mdx-component")]) {
		if (AstroUserError.is(error)) return;
		error.title = error.name;
		error.hint = `This issue often occurs when your MDX component encounters runtime errors.`;
		throw error;
	}
}
//#endregion
//#region \0virtual:astro:renderers
var renderers = [Object.assign({
	"name": "astro:jsx",
	"serverEntrypoint": "file:///Users/jamesmichaelhunterturner/Projects/insighthunter/node_modules/.pnpm/@astrojs+mdx@7.0.5_@astrojs+markdown-satteri@0.3.5_astro@7.2.2_@astrojs+markdown-remark_6f5e11dccf6d86686f9f32b1367a07fb/node_modules/@astrojs/mdx/dist/server.js"
}, { ssr: {
	name: "astro:jsx",
	check,
	renderToStaticMarkup
} })];
[
	{
		"file": "",
		"links": [],
		"scripts": [],
		"styles": [],
		"routeData": {
			"type": "page",
			"component": "_server-islands.astro",
			"params": ["name"],
			"segments": [[{
				"content": "_server-islands",
				"dynamic": false,
				"spread": false
			}], [{
				"content": "name",
				"dynamic": true,
				"spread": false
			}]],
			"pattern": "^\\/_server-islands\\/([^/]+?)\\/?$",
			"prerender": false,
			"isIndex": false,
			"fallbackRoutes": [],
			"route": "/_server-islands/[name]",
			"origin": "internal",
			"distURL": [],
			"_meta": { "trailingSlash": "ignore" }
		}
	},
	{
		"file": "",
		"links": [],
		"scripts": [],
		"styles": [],
		"routeData": {
			"route": "/_image",
			"component": "../../node_modules/.pnpm/@astrojs+cloudflare@14.2.3_@types+node@25.9.4_astro@7.2.2_@astrojs+markdown-remark@7.2._a03aab5eba31d05e6cae5f11ca597233/node_modules/@astrojs/cloudflare/dist/entrypoints/image-passthrough-endpoint.js",
			"params": [],
			"pathname": "/_image",
			"pattern": "^\\/_image\\/?$",
			"segments": [[{
				"content": "_image",
				"dynamic": false,
				"spread": false
			}]],
			"type": "endpoint",
			"prerender": false,
			"fallbackRoutes": [],
			"distURL": [],
			"isIndex": false,
			"origin": "internal",
			"_meta": { "trailingSlash": "ignore" }
		}
	},
	{
		"file": "",
		"links": [],
		"scripts": [],
		"styles": [],
		"routeData": {
			"route": "/404",
			"isIndex": false,
			"type": "page",
			"pattern": "^\\/404\\/?$",
			"segments": [[{
				"content": "404",
				"dynamic": false,
				"spread": false
			}]],
			"params": [],
			"component": "src/pages/404.astro",
			"pathname": "/404",
			"prerender": false,
			"fallbackRoutes": [],
			"distURL": [],
			"origin": "project",
			"_meta": { "trailingSlash": "ignore" }
		}
	},
	{
		"file": "",
		"links": [],
		"scripts": [],
		"styles": [],
		"routeData": {
			"route": "/500",
			"isIndex": false,
			"type": "page",
			"pattern": "^\\/500\\/?$",
			"segments": [[{
				"content": "500",
				"dynamic": false,
				"spread": false
			}]],
			"params": [],
			"component": "src/pages/500.astro",
			"pathname": "/500",
			"prerender": false,
			"fallbackRoutes": [],
			"distURL": [],
			"origin": "project",
			"_meta": { "trailingSlash": "ignore" }
		}
	},
	{
		"file": "",
		"links": [],
		"scripts": [],
		"styles": [],
		"routeData": {
			"route": "/about",
			"isIndex": false,
			"type": "page",
			"pattern": "^\\/about\\/?$",
			"segments": [[{
				"content": "about",
				"dynamic": false,
				"spread": false
			}]],
			"params": [],
			"component": "src/pages/about.astro",
			"pathname": "/about",
			"prerender": false,
			"fallbackRoutes": [],
			"distURL": [],
			"origin": "project",
			"_meta": { "trailingSlash": "ignore" }
		}
	},
	{
		"file": "",
		"links": [],
		"scripts": [],
		"styles": [],
		"routeData": {
			"route": "/api/checkout/start",
			"isIndex": false,
			"type": "endpoint",
			"pattern": "^\\/api\\/checkout\\/start\\/?$",
			"segments": [
				[{
					"content": "api",
					"dynamic": false,
					"spread": false
				}],
				[{
					"content": "checkout",
					"dynamic": false,
					"spread": false
				}],
				[{
					"content": "start",
					"dynamic": false,
					"spread": false
				}]
			],
			"params": [],
			"component": "src/pages/api/checkout/start.ts",
			"pathname": "/api/checkout/start",
			"prerender": false,
			"fallbackRoutes": [],
			"distURL": [],
			"origin": "project",
			"_meta": { "trailingSlash": "ignore" }
		}
	},
	{
		"file": "",
		"links": [],
		"scripts": [],
		"styles": [],
		"routeData": {
			"route": "/api/contact",
			"isIndex": false,
			"type": "endpoint",
			"pattern": "^\\/api\\/contact\\/?$",
			"segments": [[{
				"content": "api",
				"dynamic": false,
				"spread": false
			}], [{
				"content": "contact",
				"dynamic": false,
				"spread": false
			}]],
			"params": [],
			"component": "src/pages/api/contact.ts",
			"pathname": "/api/contact",
			"prerender": false,
			"fallbackRoutes": [],
			"distURL": [],
			"origin": "project",
			"_meta": { "trailingSlash": "ignore" }
		}
	},
	{
		"file": "",
		"links": [],
		"scripts": [],
		"styles": [],
		"routeData": {
			"route": "/api/health",
			"isIndex": false,
			"type": "endpoint",
			"pattern": "^\\/api\\/health\\/?$",
			"segments": [[{
				"content": "api",
				"dynamic": false,
				"spread": false
			}], [{
				"content": "health",
				"dynamic": false,
				"spread": false
			}]],
			"params": [],
			"component": "src/pages/api/health.ts",
			"pathname": "/api/health",
			"prerender": false,
			"fallbackRoutes": [],
			"distURL": [],
			"origin": "project",
			"_meta": { "trailingSlash": "ignore" }
		}
	},
	{
		"file": "",
		"links": [],
		"scripts": [],
		"styles": [],
		"routeData": {
			"route": "/api/pricing",
			"isIndex": false,
			"type": "endpoint",
			"pattern": "^\\/api\\/pricing\\/?$",
			"segments": [[{
				"content": "api",
				"dynamic": false,
				"spread": false
			}], [{
				"content": "pricing",
				"dynamic": false,
				"spread": false
			}]],
			"params": [],
			"component": "src/pages/api/pricing.ts",
			"pathname": "/api/pricing",
			"prerender": false,
			"fallbackRoutes": [],
			"distURL": [],
			"origin": "project",
			"_meta": { "trailingSlash": "ignore" }
		}
	},
	{
		"file": "",
		"links": [],
		"scripts": [],
		"styles": [],
		"routeData": {
			"route": "/api/waitlist",
			"isIndex": false,
			"type": "endpoint",
			"pattern": "^\\/api\\/waitlist\\/?$",
			"segments": [[{
				"content": "api",
				"dynamic": false,
				"spread": false
			}], [{
				"content": "waitlist",
				"dynamic": false,
				"spread": false
			}]],
			"params": [],
			"component": "src/pages/api/waitlist.ts",
			"pathname": "/api/waitlist",
			"prerender": false,
			"fallbackRoutes": [],
			"distURL": [],
			"origin": "project",
			"_meta": { "trailingSlash": "ignore" }
		}
	},
	{
		"file": "",
		"links": [],
		"scripts": [],
		"styles": [],
		"routeData": {
			"route": "/bizforma",
			"isIndex": true,
			"type": "page",
			"pattern": "^\\/bizforma\\/?$",
			"segments": [[{
				"content": "bizforma",
				"dynamic": false,
				"spread": false
			}]],
			"params": [],
			"component": "src/pages/bizforma/index.astro",
			"pathname": "/bizforma",
			"prerender": false,
			"fallbackRoutes": [],
			"distURL": [],
			"origin": "project",
			"_meta": { "trailingSlash": "ignore" }
		}
	},
	{
		"file": "",
		"links": [],
		"scripts": [],
		"styles": [],
		"routeData": {
			"route": "/blog",
			"isIndex": true,
			"type": "page",
			"pattern": "^\\/blog\\/?$",
			"segments": [[{
				"content": "blog",
				"dynamic": false,
				"spread": false
			}]],
			"params": [],
			"component": "src/pages/blog/index.astro",
			"pathname": "/blog",
			"prerender": false,
			"fallbackRoutes": [],
			"distURL": [],
			"origin": "project",
			"_meta": { "trailingSlash": "ignore" }
		}
	},
	{
		"file": "",
		"links": [],
		"scripts": [],
		"styles": [],
		"routeData": {
			"route": "/bookkeeping",
			"isIndex": true,
			"type": "page",
			"pattern": "^\\/bookkeeping\\/?$",
			"segments": [[{
				"content": "bookkeeping",
				"dynamic": false,
				"spread": false
			}]],
			"params": [],
			"component": "src/pages/bookkeeping/index.astro",
			"pathname": "/bookkeeping",
			"prerender": false,
			"fallbackRoutes": [],
			"distURL": [],
			"origin": "project",
			"_meta": { "trailingSlash": "ignore" }
		}
	},
	{
		"file": "",
		"links": [],
		"scripts": [],
		"styles": [],
		"routeData": {
			"route": "/contact",
			"isIndex": false,
			"type": "page",
			"pattern": "^\\/contact\\/?$",
			"segments": [[{
				"content": "contact",
				"dynamic": false,
				"spread": false
			}]],
			"params": [],
			"component": "src/pages/contact.astro",
			"pathname": "/contact",
			"prerender": false,
			"fallbackRoutes": [],
			"distURL": [],
			"origin": "project",
			"_meta": { "trailingSlash": "ignore" }
		}
	},
	{
		"file": "",
		"links": [],
		"scripts": [],
		"styles": [],
		"routeData": {
			"route": "/dashboard",
			"isIndex": true,
			"type": "page",
			"pattern": "^\\/dashboard\\/?$",
			"segments": [[{
				"content": "dashboard",
				"dynamic": false,
				"spread": false
			}]],
			"params": [],
			"component": "src/pages/dashboard/index.astro",
			"pathname": "/dashboard",
			"prerender": false,
			"fallbackRoutes": [],
			"distURL": [],
			"origin": "project",
			"_meta": { "trailingSlash": "ignore" }
		}
	},
	{
		"file": "",
		"links": [],
		"scripts": [],
		"styles": [],
		"routeData": {
			"route": "/docs",
			"isIndex": true,
			"type": "page",
			"pattern": "^\\/docs\\/?$",
			"segments": [[{
				"content": "docs",
				"dynamic": false,
				"spread": false
			}]],
			"params": [],
			"component": "src/pages/docs/index.astro",
			"pathname": "/docs",
			"prerender": false,
			"fallbackRoutes": [],
			"distURL": [],
			"origin": "project",
			"_meta": { "trailingSlash": "ignore" }
		}
	},
	{
		"file": "",
		"links": [],
		"scripts": [],
		"styles": [],
		"routeData": {
			"route": "/features/ai-cfo",
			"isIndex": false,
			"type": "page",
			"pattern": "^\\/features\\/ai-cfo\\/?$",
			"segments": [[{
				"content": "features",
				"dynamic": false,
				"spread": false
			}], [{
				"content": "ai-cfo",
				"dynamic": false,
				"spread": false
			}]],
			"params": [],
			"component": "src/pages/features/ai-cfo.astro",
			"pathname": "/features/ai-cfo",
			"prerender": false,
			"fallbackRoutes": [],
			"distURL": [],
			"origin": "project",
			"_meta": { "trailingSlash": "ignore" }
		}
	},
	{
		"file": "",
		"links": [],
		"scripts": [],
		"styles": [],
		"routeData": {
			"route": "/features/bizforma",
			"isIndex": false,
			"type": "page",
			"pattern": "^\\/features\\/bizforma\\/?$",
			"segments": [[{
				"content": "features",
				"dynamic": false,
				"spread": false
			}], [{
				"content": "bizforma",
				"dynamic": false,
				"spread": false
			}]],
			"params": [],
			"component": "src/pages/features/bizforma.astro",
			"pathname": "/features/bizforma",
			"prerender": false,
			"fallbackRoutes": [],
			"distURL": [],
			"origin": "project",
			"_meta": { "trailingSlash": "ignore" }
		}
	},
	{
		"file": "",
		"links": [],
		"scripts": [],
		"styles": [],
		"routeData": {
			"route": "/features/bookkeeping",
			"isIndex": false,
			"type": "page",
			"pattern": "^\\/features\\/bookkeeping\\/?$",
			"segments": [[{
				"content": "features",
				"dynamic": false,
				"spread": false
			}], [{
				"content": "bookkeeping",
				"dynamic": false,
				"spread": false
			}]],
			"params": [],
			"component": "src/pages/features/bookkeeping.astro",
			"pathname": "/features/bookkeeping",
			"prerender": false,
			"fallbackRoutes": [],
			"distURL": [],
			"origin": "project",
			"_meta": { "trailingSlash": "ignore" }
		}
	},
	{
		"file": "",
		"links": [],
		"scripts": [],
		"styles": [],
		"routeData": {
			"route": "/features/forecasting",
			"isIndex": false,
			"type": "page",
			"pattern": "^\\/features\\/forecasting\\/?$",
			"segments": [[{
				"content": "features",
				"dynamic": false,
				"spread": false
			}], [{
				"content": "forecasting",
				"dynamic": false,
				"spread": false
			}]],
			"params": [],
			"component": "src/pages/features/forecasting.astro",
			"pathname": "/features/forecasting",
			"prerender": false,
			"fallbackRoutes": [],
			"distURL": [],
			"origin": "project",
			"_meta": { "trailingSlash": "ignore" }
		}
	},
	{
		"file": "",
		"links": [],
		"scripts": [],
		"styles": [],
		"routeData": {
			"route": "/features/payroll",
			"isIndex": false,
			"type": "page",
			"pattern": "^\\/features\\/payroll\\/?$",
			"segments": [[{
				"content": "features",
				"dynamic": false,
				"spread": false
			}], [{
				"content": "payroll",
				"dynamic": false,
				"spread": false
			}]],
			"params": [],
			"component": "src/pages/features/payroll.astro",
			"pathname": "/features/payroll",
			"prerender": false,
			"fallbackRoutes": [],
			"distURL": [],
			"origin": "project",
			"_meta": { "trailingSlash": "ignore" }
		}
	},
	{
		"file": "",
		"links": [],
		"scripts": [],
		"styles": [],
		"routeData": {
			"route": "/features/reporting",
			"isIndex": false,
			"type": "page",
			"pattern": "^\\/features\\/reporting\\/?$",
			"segments": [[{
				"content": "features",
				"dynamic": false,
				"spread": false
			}], [{
				"content": "reporting",
				"dynamic": false,
				"spread": false
			}]],
			"params": [],
			"component": "src/pages/features/reporting.astro",
			"pathname": "/features/reporting",
			"prerender": false,
			"fallbackRoutes": [],
			"distURL": [],
			"origin": "project",
			"_meta": { "trailingSlash": "ignore" }
		}
	},
	{
		"file": "",
		"links": [],
		"scripts": [],
		"styles": [],
		"routeData": {
			"route": "/insights",
			"isIndex": true,
			"type": "page",
			"pattern": "^\\/insights\\/?$",
			"segments": [[{
				"content": "insights",
				"dynamic": false,
				"spread": false
			}]],
			"params": [],
			"component": "src/pages/insights/index.astro",
			"pathname": "/insights",
			"prerender": false,
			"fallbackRoutes": [],
			"distURL": [],
			"origin": "project",
			"_meta": { "trailingSlash": "ignore" }
		}
	},
	{
		"file": "",
		"links": [],
		"scripts": [],
		"styles": [],
		"routeData": {
			"route": "/integrations",
			"isIndex": false,
			"type": "page",
			"pattern": "^\\/integrations\\/?$",
			"segments": [[{
				"content": "integrations",
				"dynamic": false,
				"spread": false
			}]],
			"params": [],
			"component": "src/pages/integrations.astro",
			"pathname": "/integrations",
			"prerender": false,
			"fallbackRoutes": [],
			"distURL": [],
			"origin": "project",
			"_meta": { "trailingSlash": "ignore" }
		}
	},
	{
		"file": "",
		"links": [],
		"scripts": [],
		"styles": [],
		"routeData": {
			"route": "/kb/DEPLOYMENT",
			"isIndex": false,
			"type": "page",
			"pattern": "^\\/kb\\/DEPLOYMENT\\/?$",
			"segments": [[{
				"content": "kb",
				"dynamic": false,
				"spread": false
			}], [{
				"content": "DEPLOYMENT",
				"dynamic": false,
				"spread": false
			}]],
			"params": [],
			"component": "src/pages/kb/DEPLOYMENT.md",
			"pathname": "/kb/DEPLOYMENT",
			"prerender": false,
			"fallbackRoutes": [],
			"distURL": [],
			"origin": "project",
			"_meta": { "trailingSlash": "ignore" }
		}
	},
	{
		"file": "",
		"links": [],
		"scripts": [],
		"styles": [],
		"routeData": {
			"route": "/kb",
			"isIndex": true,
			"type": "page",
			"pattern": "^\\/kb\\/?$",
			"segments": [[{
				"content": "kb",
				"dynamic": false,
				"spread": false
			}]],
			"params": [],
			"component": "src/pages/kb/index.astro",
			"pathname": "/kb",
			"prerender": false,
			"fallbackRoutes": [],
			"distURL": [],
			"origin": "project",
			"_meta": { "trailingSlash": "ignore" }
		}
	},
	{
		"file": "",
		"links": [],
		"scripts": [],
		"styles": [],
		"routeData": {
			"route": "/legal/acceptable-use",
			"isIndex": false,
			"type": "page",
			"pattern": "^\\/legal\\/acceptable-use\\/?$",
			"segments": [[{
				"content": "legal",
				"dynamic": false,
				"spread": false
			}], [{
				"content": "acceptable-use",
				"dynamic": false,
				"spread": false
			}]],
			"params": [],
			"component": "src/pages/legal/acceptable-use.astro",
			"pathname": "/legal/acceptable-use",
			"prerender": false,
			"fallbackRoutes": [],
			"distURL": [],
			"origin": "project",
			"_meta": { "trailingSlash": "ignore" }
		}
	},
	{
		"file": "",
		"links": [],
		"scripts": [],
		"styles": [],
		"routeData": {
			"route": "/legal/cookies",
			"isIndex": false,
			"type": "page",
			"pattern": "^\\/legal\\/cookies\\/?$",
			"segments": [[{
				"content": "legal",
				"dynamic": false,
				"spread": false
			}], [{
				"content": "cookies",
				"dynamic": false,
				"spread": false
			}]],
			"params": [],
			"component": "src/pages/legal/cookies.astro",
			"pathname": "/legal/cookies",
			"prerender": false,
			"fallbackRoutes": [],
			"distURL": [],
			"origin": "project",
			"_meta": { "trailingSlash": "ignore" }
		}
	},
	{
		"file": "",
		"links": [],
		"scripts": [],
		"styles": [],
		"routeData": {
			"route": "/legal/data-processing",
			"isIndex": false,
			"type": "page",
			"pattern": "^\\/legal\\/data-processing\\/?$",
			"segments": [[{
				"content": "legal",
				"dynamic": false,
				"spread": false
			}], [{
				"content": "data-processing",
				"dynamic": false,
				"spread": false
			}]],
			"params": [],
			"component": "src/pages/legal/data-processing.astro",
			"pathname": "/legal/data-processing",
			"prerender": false,
			"fallbackRoutes": [],
			"distURL": [],
			"origin": "project",
			"_meta": { "trailingSlash": "ignore" }
		}
	},
	{
		"file": "",
		"links": [],
		"scripts": [],
		"styles": [],
		"routeData": {
			"route": "/legal/privacy",
			"isIndex": false,
			"type": "page",
			"pattern": "^\\/legal\\/privacy\\/?$",
			"segments": [[{
				"content": "legal",
				"dynamic": false,
				"spread": false
			}], [{
				"content": "privacy",
				"dynamic": false,
				"spread": false
			}]],
			"params": [],
			"component": "src/pages/legal/privacy.astro",
			"pathname": "/legal/privacy",
			"prerender": false,
			"fallbackRoutes": [],
			"distURL": [],
			"origin": "project",
			"_meta": { "trailingSlash": "ignore" }
		}
	},
	{
		"file": "",
		"links": [],
		"scripts": [],
		"styles": [],
		"routeData": {
			"route": "/legal/security",
			"isIndex": false,
			"type": "page",
			"pattern": "^\\/legal\\/security\\/?$",
			"segments": [[{
				"content": "legal",
				"dynamic": false,
				"spread": false
			}], [{
				"content": "security",
				"dynamic": false,
				"spread": false
			}]],
			"params": [],
			"component": "src/pages/legal/security.astro",
			"pathname": "/legal/security",
			"prerender": false,
			"fallbackRoutes": [],
			"distURL": [],
			"origin": "project",
			"_meta": { "trailingSlash": "ignore" }
		}
	},
	{
		"file": "",
		"links": [],
		"scripts": [],
		"styles": [],
		"routeData": {
			"route": "/legal/terms",
			"isIndex": false,
			"type": "page",
			"pattern": "^\\/legal\\/terms\\/?$",
			"segments": [[{
				"content": "legal",
				"dynamic": false,
				"spread": false
			}], [{
				"content": "terms",
				"dynamic": false,
				"spread": false
			}]],
			"params": [],
			"component": "src/pages/legal/terms.astro",
			"pathname": "/legal/terms",
			"prerender": false,
			"fallbackRoutes": [],
			"distURL": [],
			"origin": "project",
			"_meta": { "trailingSlash": "ignore" }
		}
	},
	{
		"file": "",
		"links": [],
		"scripts": [],
		"styles": [],
		"routeData": {
			"route": "/login",
			"isIndex": false,
			"type": "page",
			"pattern": "^\\/login\\/?$",
			"segments": [[{
				"content": "login",
				"dynamic": false,
				"spread": false
			}]],
			"params": [],
			"component": "src/pages/login.astro",
			"pathname": "/login",
			"prerender": false,
			"fallbackRoutes": [],
			"distURL": [],
			"origin": "project",
			"_meta": { "trailingSlash": "ignore" }
		}
	},
	{
		"file": "",
		"links": [],
		"scripts": [],
		"styles": [],
		"routeData": {
			"route": "/modules",
			"isIndex": false,
			"type": "page",
			"pattern": "^\\/modules\\/?$",
			"segments": [[{
				"content": "modules",
				"dynamic": false,
				"spread": false
			}]],
			"params": [],
			"component": "src/pages/modules.astro",
			"pathname": "/modules",
			"prerender": false,
			"fallbackRoutes": [],
			"distURL": [],
			"origin": "project",
			"_meta": { "trailingSlash": "ignore" }
		}
	},
	{
		"file": "",
		"links": [],
		"scripts": [],
		"styles": [],
		"routeData": {
			"route": "/payroll",
			"isIndex": true,
			"type": "page",
			"pattern": "^\\/payroll\\/?$",
			"segments": [[{
				"content": "payroll",
				"dynamic": false,
				"spread": false
			}]],
			"params": [],
			"component": "src/pages/payroll/index.astro",
			"pathname": "/payroll",
			"prerender": false,
			"fallbackRoutes": [],
			"distURL": [],
			"origin": "project",
			"_meta": { "trailingSlash": "ignore" }
		}
	},
	{
		"file": "",
		"links": [],
		"scripts": [],
		"styles": [],
		"routeData": {
			"route": "/pbx",
			"isIndex": true,
			"type": "page",
			"pattern": "^\\/pbx\\/?$",
			"segments": [[{
				"content": "pbx",
				"dynamic": false,
				"spread": false
			}]],
			"params": [],
			"component": "src/pages/pbx/index.astro",
			"pathname": "/pbx",
			"prerender": false,
			"fallbackRoutes": [],
			"distURL": [],
			"origin": "project",
			"_meta": { "trailingSlash": "ignore" }
		}
	},
	{
		"file": "",
		"links": [],
		"scripts": [],
		"styles": [],
		"routeData": {
			"route": "/pricing",
			"isIndex": false,
			"type": "page",
			"pattern": "^\\/pricing\\/?$",
			"segments": [[{
				"content": "pricing",
				"dynamic": false,
				"spread": false
			}]],
			"params": [],
			"component": "src/pages/pricing.astro",
			"pathname": "/pricing",
			"prerender": false,
			"fallbackRoutes": [],
			"distURL": [],
			"origin": "project",
			"_meta": { "trailingSlash": "ignore" }
		}
	},
	{
		"file": "",
		"links": [],
		"scripts": [],
		"styles": [],
		"routeData": {
			"route": "/register",
			"isIndex": false,
			"type": "page",
			"pattern": "^\\/register\\/?$",
			"segments": [[{
				"content": "register",
				"dynamic": false,
				"spread": false
			}]],
			"params": [],
			"component": "src/pages/register.astro",
			"pathname": "/register",
			"prerender": false,
			"fallbackRoutes": [],
			"distURL": [],
			"origin": "project",
			"_meta": { "trailingSlash": "ignore" }
		}
	},
	{
		"file": "",
		"links": [],
		"scripts": [],
		"styles": [],
		"routeData": {
			"route": "/reports",
			"isIndex": true,
			"type": "page",
			"pattern": "^\\/reports\\/?$",
			"segments": [[{
				"content": "reports",
				"dynamic": false,
				"spread": false
			}]],
			"params": [],
			"component": "src/pages/reports/index.astro",
			"pathname": "/reports",
			"prerender": false,
			"fallbackRoutes": [],
			"distURL": [],
			"origin": "project",
			"_meta": { "trailingSlash": "ignore" }
		}
	},
	{
		"file": "",
		"links": [],
		"scripts": [],
		"styles": [],
		"routeData": {
			"route": "/resources/automated-financial-reporting",
			"isIndex": false,
			"type": "page",
			"pattern": "^\\/resources\\/automated-financial-reporting\\/?$",
			"segments": [[{
				"content": "resources",
				"dynamic": false,
				"spread": false
			}], [{
				"content": "automated-financial-reporting",
				"dynamic": false,
				"spread": false
			}]],
			"params": [],
			"component": "src/pages/resources/automated-financial-reporting.astro",
			"pathname": "/resources/automated-financial-reporting",
			"prerender": false,
			"fallbackRoutes": [],
			"distURL": [],
			"origin": "project",
			"_meta": { "trailingSlash": "ignore" }
		}
	},
	{
		"file": "",
		"links": [],
		"scripts": [],
		"styles": [],
		"routeData": {
			"route": "/resources/cash-flow-forecasting",
			"isIndex": false,
			"type": "page",
			"pattern": "^\\/resources\\/cash-flow-forecasting\\/?$",
			"segments": [[{
				"content": "resources",
				"dynamic": false,
				"spread": false
			}], [{
				"content": "cash-flow-forecasting",
				"dynamic": false,
				"spread": false
			}]],
			"params": [],
			"component": "src/pages/resources/cash-flow-forecasting.astro",
			"pathname": "/resources/cash-flow-forecasting",
			"prerender": false,
			"fallbackRoutes": [],
			"distURL": [],
			"origin": "project",
			"_meta": { "trailingSlash": "ignore" }
		}
	},
	{
		"file": "",
		"links": [],
		"scripts": [],
		"styles": [],
		"routeData": {
			"route": "/resources/fractional-cfo-tools",
			"isIndex": false,
			"type": "page",
			"pattern": "^\\/resources\\/fractional-cfo-tools\\/?$",
			"segments": [[{
				"content": "resources",
				"dynamic": false,
				"spread": false
			}], [{
				"content": "fractional-cfo-tools",
				"dynamic": false,
				"spread": false
			}]],
			"params": [],
			"component": "src/pages/resources/fractional-cfo-tools.astro",
			"pathname": "/resources/fractional-cfo-tools",
			"prerender": false,
			"fallbackRoutes": [],
			"distURL": [],
			"origin": "project",
			"_meta": { "trailingSlash": "ignore" }
		}
	},
	{
		"file": "",
		"links": [],
		"scripts": [],
		"styles": [],
		"routeData": {
			"route": "/resources/small-business-financial-dashboard",
			"isIndex": false,
			"type": "page",
			"pattern": "^\\/resources\\/small-business-financial-dashboard\\/?$",
			"segments": [[{
				"content": "resources",
				"dynamic": false,
				"spread": false
			}], [{
				"content": "small-business-financial-dashboard",
				"dynamic": false,
				"spread": false
			}]],
			"params": [],
			"component": "src/pages/resources/small-business-financial-dashboard.astro",
			"pathname": "/resources/small-business-financial-dashboard",
			"prerender": false,
			"fallbackRoutes": [],
			"distURL": [],
			"origin": "project",
			"_meta": { "trailingSlash": "ignore" }
		}
	},
	{
		"file": "",
		"links": [],
		"scripts": [],
		"styles": [],
		"routeData": {
			"route": "/resources",
			"isIndex": true,
			"type": "page",
			"pattern": "^\\/resources\\/?$",
			"segments": [[{
				"content": "resources",
				"dynamic": false,
				"spread": false
			}]],
			"params": [],
			"component": "src/pages/resources/index.astro",
			"pathname": "/resources",
			"prerender": false,
			"fallbackRoutes": [],
			"distURL": [],
			"origin": "project",
			"_meta": { "trailingSlash": "ignore" }
		}
	},
	{
		"file": "",
		"links": [],
		"scripts": [],
		"styles": [],
		"routeData": {
			"route": "/security",
			"isIndex": false,
			"type": "page",
			"pattern": "^\\/security\\/?$",
			"segments": [[{
				"content": "security",
				"dynamic": false,
				"spread": false
			}]],
			"params": [],
			"component": "src/pages/security.astro",
			"pathname": "/security",
			"prerender": false,
			"fallbackRoutes": [],
			"distURL": [],
			"origin": "project",
			"_meta": { "trailingSlash": "ignore" }
		}
	},
	{
		"file": "",
		"links": [],
		"scripts": [],
		"styles": [],
		"routeData": {
			"route": "/signup",
			"isIndex": false,
			"type": "page",
			"pattern": "^\\/signup\\/?$",
			"segments": [[{
				"content": "signup",
				"dynamic": false,
				"spread": false
			}]],
			"params": [],
			"component": "src/pages/signup.astro",
			"pathname": "/signup",
			"prerender": false,
			"fallbackRoutes": [],
			"distURL": [],
			"origin": "project",
			"_meta": { "trailingSlash": "ignore" }
		}
	},
	{
		"file": "",
		"links": [],
		"scripts": [],
		"styles": [],
		"routeData": {
			"route": "/",
			"isIndex": true,
			"type": "page",
			"pattern": "^\\/$",
			"segments": [],
			"params": [],
			"component": "src/pages/index.astro",
			"pathname": "/",
			"prerender": false,
			"fallbackRoutes": [],
			"distURL": [],
			"origin": "project",
			"_meta": { "trailingSlash": "ignore" }
		}
	}
].map(deserializeRouteInfo);
//#endregion
//#region \0virtual:astro:pages
var _page0 = () => import("./chunks/image-passthrough-endpoint_DQdBpHhk.mjs");
var _page1 = () => import("./chunks/404_Bl-UTOpf.mjs");
var _page2 = () => import("./chunks/500_DZNBAkgb.mjs");
var _page3 = () => import("./chunks/about_CcoQ3C5i.mjs");
var _page4 = () => import("./chunks/start_8uxuHdO4.mjs");
var _page5 = () => import("./chunks/contact_BLyPzKaZ.mjs");
var _page6 = () => import("./chunks/health_DPN6O5KW.mjs");
var _page7 = () => import("./chunks/pricing_ZiT-G6LH.mjs");
var _page8 = () => import("./chunks/waitlist_B4Xer-Tx.mjs");
var _page9 = () => import("./chunks/index_C8QeXvmH.mjs");
var _page10 = () => import("./chunks/index_BL_NF6lB.mjs");
var _page11 = () => import("./chunks/index_DwSD597T.mjs");
var _page12 = () => import("./chunks/contact_BkltKKCY.mjs");
var _page13 = () => import("./chunks/index_BDyMjnjV.mjs");
var _page14 = () => import("./chunks/index_c95EDJ_x.mjs");
var _page15 = () => import("./chunks/ai-cfo_CgqaqQKr.mjs");
var _page16 = () => import("./chunks/bizforma_IRJMHiv0.mjs");
var _page17 = () => import("./chunks/bookkeeping_C0to9b5o.mjs");
var _page18 = () => import("./chunks/forecasting_CAAE-8H0.mjs");
var _page19 = () => import("./chunks/payroll_BlEQ31ix.mjs");
var _page20 = () => import("./chunks/reporting_BRLXXqRp.mjs");
var _page21 = () => import("./chunks/index_DCuXNHUl.mjs");
var _page22 = () => import("./chunks/integrations_BKyf_jt0.mjs");
var _page23 = () => import("./chunks/DEPLOYMENT_CxkG98bO.mjs");
var _page24 = () => import("./chunks/index_CDUXZMrE.mjs");
var _page25 = () => import("./chunks/acceptable-use_CUYx_KW9.mjs");
var _page26 = () => import("./chunks/cookies_B1VD0V7-.mjs");
var _page27 = () => import("./chunks/data-processing_C22LyY3U.mjs");
var _page28 = () => import("./chunks/privacy_DAYel6rB.mjs");
var _page29 = () => import("./chunks/security_BasixRs8.mjs");
var _page30 = () => import("./chunks/terms_DHEZVTf9.mjs");
var _page31 = () => import("./chunks/login_BZqW-oUC.mjs");
var _page32 = () => import("./chunks/modules_COa2uw_E.mjs");
var _page33 = () => import("./chunks/index_CpyOtCJM.mjs");
var _page34 = () => import("./chunks/index_BBbBWLCs2.mjs");
var _page35 = () => import("./chunks/pricing_C0H4PeTg.mjs");
var _page36 = () => import("./chunks/register_B6rrIicn.mjs");
var _page37 = () => import("./chunks/index_xM2uUCt92.mjs");
var _page38 = () => import("./chunks/automated-financial-reporting_-xtuaWT6.mjs");
var _page39 = () => import("./chunks/cash-flow-forecasting_D3wCfStF.mjs");
var _page40 = () => import("./chunks/fractional-cfo-tools_CjqDXrl7.mjs");
var _page41 = () => import("./chunks/small-business-financial-dashboard_C3zhr4vy.mjs");
var _page42 = () => import("./chunks/index_4k5A7APj.mjs");
var _page43 = () => import("./chunks/security_Ca9_yo28.mjs");
var _page44 = () => import("./chunks/signup_1IPjbbM_.mjs");
var _page45 = () => import("./chunks/index_BgAiOhBJ.mjs");
var pageMap = /* @__PURE__ */ new Map([
	["../../node_modules/.pnpm/@astrojs+cloudflare@14.2.3_@types+node@25.9.4_astro@7.2.2_@astrojs+markdown-remark@7.2._a03aab5eba31d05e6cae5f11ca597233/node_modules/@astrojs/cloudflare/dist/entrypoints/image-passthrough-endpoint.js", _page0],
	["src/pages/404.astro", _page1],
	["src/pages/500.astro", _page2],
	["src/pages/about.astro", _page3],
	["src/pages/api/checkout/start.ts", _page4],
	["src/pages/api/contact.ts", _page5],
	["src/pages/api/health.ts", _page6],
	["src/pages/api/pricing.ts", _page7],
	["src/pages/api/waitlist.ts", _page8],
	["src/pages/bizforma/index.astro", _page9],
	["src/pages/blog/index.astro", _page10],
	["src/pages/bookkeeping/index.astro", _page11],
	["src/pages/contact.astro", _page12],
	["src/pages/dashboard/index.astro", _page13],
	["src/pages/docs/index.astro", _page14],
	["src/pages/features/ai-cfo.astro", _page15],
	["src/pages/features/bizforma.astro", _page16],
	["src/pages/features/bookkeeping.astro", _page17],
	["src/pages/features/forecasting.astro", _page18],
	["src/pages/features/payroll.astro", _page19],
	["src/pages/features/reporting.astro", _page20],
	["src/pages/insights/index.astro", _page21],
	["src/pages/integrations.astro", _page22],
	["src/pages/kb/DEPLOYMENT.md", _page23],
	["src/pages/kb/index.astro", _page24],
	["src/pages/legal/acceptable-use.astro", _page25],
	["src/pages/legal/cookies.astro", _page26],
	["src/pages/legal/data-processing.astro", _page27],
	["src/pages/legal/privacy.astro", _page28],
	["src/pages/legal/security.astro", _page29],
	["src/pages/legal/terms.astro", _page30],
	["src/pages/login.astro", _page31],
	["src/pages/modules.astro", _page32],
	["src/pages/payroll/index.astro", _page33],
	["src/pages/pbx/index.astro", _page34],
	["src/pages/pricing.astro", _page35],
	["src/pages/register.astro", _page36],
	["src/pages/reports/index.astro", _page37],
	["src/pages/resources/automated-financial-reporting.astro", _page38],
	["src/pages/resources/cash-flow-forecasting.astro", _page39],
	["src/pages/resources/fractional-cfo-tools.astro", _page40],
	["src/pages/resources/small-business-financial-dashboard.astro", _page41],
	["src/pages/resources/index.astro", _page42],
	["src/pages/security.astro", _page43],
	["src/pages/signup.astro", _page44],
	["src/pages/index.astro", _page45]
]);
//#endregion
//#region \0virtual:astro:manifest
var _manifest = deserializeManifest({"rootDir":"file:///Users/jamesmichaelhunterturner/Projects/insighthunter/apps/insighthunter-marketing/","cacheDir":"file:///Users/jamesmichaelhunterturner/Projects/insighthunter/apps/insighthunter-marketing/node_modules/.astro/","outDir":"file:///Users/jamesmichaelhunterturner/Projects/insighthunter/apps/insighthunter-marketing/dist/","srcDir":"file:///Users/jamesmichaelhunterturner/Projects/insighthunter/apps/insighthunter-marketing/src/","publicDir":"file:///Users/jamesmichaelhunterturner/Projects/insighthunter/apps/insighthunter-marketing/public/","buildClientDir":"file:///Users/jamesmichaelhunterturner/Projects/insighthunter/apps/insighthunter-marketing/dist/client/","buildServerDir":"file:///Users/jamesmichaelhunterturner/Projects/insighthunter/apps/insighthunter-marketing/dist/server/","adapterName":"@astrojs/cloudflare","assetsDir":"_astro","routes":[{"file":"","links":[],"scripts":[],"styles":[],"routeData":{"type":"page","component":"_server-islands.astro","params":["name"],"segments":[[{"content":"_server-islands","dynamic":false,"spread":false}],[{"content":"name","dynamic":true,"spread":false}]],"pattern":"^\\/_server-islands\\/([^/]+?)\\/?$","prerender":false,"isIndex":false,"fallbackRoutes":[],"route":"/_server-islands/[name]","origin":"internal","distURL":[],"_meta":{"trailingSlash":"ignore"}}},{"file":"","links":[],"scripts":[],"styles":[],"routeData":{"route":"/_image","component":"../../node_modules/.pnpm/@astrojs+cloudflare@14.2.3_@types+node@25.9.4_astro@7.2.2_@astrojs+markdown-remark@7.2._a03aab5eba31d05e6cae5f11ca597233/node_modules/@astrojs/cloudflare/dist/entrypoints/image-passthrough-endpoint.js","params":[],"pathname":"/_image","pattern":"^\\/_image\\/?$","segments":[[{"content":"_image","dynamic":false,"spread":false}]],"type":"endpoint","prerender":false,"fallbackRoutes":[],"distURL":[],"isIndex":false,"origin":"internal","_meta":{"trailingSlash":"ignore"}}},{"file":"","links":[],"scripts":[],"styles":[{"type":"external","src":"_astro/Layout.BaobIMfH.css"}],"routeData":{"route":"/404","isIndex":false,"type":"page","pattern":"^\\/404\\/?$","segments":[[{"content":"404","dynamic":false,"spread":false}]],"params":[],"component":"src/pages/404.astro","pathname":"/404","prerender":false,"fallbackRoutes":[],"distURL":[],"origin":"project","_meta":{"trailingSlash":"ignore"}}},{"file":"","links":[],"scripts":[],"styles":[{"type":"inline","content":".page[data-astro-cid-qnkxrarz]{padding-block:7rem}.page[data-astro-cid-qnkxrarz] p[data-astro-cid-qnkxrarz]{max-width:56ch;color:var(--ink-soft)}\n"},{"type":"external","src":"_astro/Layout.BaobIMfH.css"}],"routeData":{"route":"/500","isIndex":false,"type":"page","pattern":"^\\/500\\/?$","segments":[[{"content":"500","dynamic":false,"spread":false}]],"params":[],"component":"src/pages/500.astro","pathname":"/500","prerender":false,"fallbackRoutes":[],"distURL":[],"origin":"project","_meta":{"trailingSlash":"ignore"}}},{"file":"","links":[],"scripts":[],"styles":[{"type":"external","src":"_astro/Layout.BaobIMfH.css"}],"routeData":{"route":"/about","isIndex":false,"type":"page","pattern":"^\\/about\\/?$","segments":[[{"content":"about","dynamic":false,"spread":false}]],"params":[],"component":"src/pages/about.astro","pathname":"/about","prerender":false,"fallbackRoutes":[],"distURL":[],"origin":"project","_meta":{"trailingSlash":"ignore"}}},{"file":"","links":[],"scripts":[],"styles":[],"routeData":{"route":"/api/checkout/start","isIndex":false,"type":"endpoint","pattern":"^\\/api\\/checkout\\/start\\/?$","segments":[[{"content":"api","dynamic":false,"spread":false}],[{"content":"checkout","dynamic":false,"spread":false}],[{"content":"start","dynamic":false,"spread":false}]],"params":[],"component":"src/pages/api/checkout/start.ts","pathname":"/api/checkout/start","prerender":false,"fallbackRoutes":[],"distURL":[],"origin":"project","_meta":{"trailingSlash":"ignore"}}},{"file":"","links":[],"scripts":[],"styles":[],"routeData":{"route":"/api/contact","isIndex":false,"type":"endpoint","pattern":"^\\/api\\/contact\\/?$","segments":[[{"content":"api","dynamic":false,"spread":false}],[{"content":"contact","dynamic":false,"spread":false}]],"params":[],"component":"src/pages/api/contact.ts","pathname":"/api/contact","prerender":false,"fallbackRoutes":[],"distURL":[],"origin":"project","_meta":{"trailingSlash":"ignore"}}},{"file":"","links":[],"scripts":[],"styles":[],"routeData":{"route":"/api/health","isIndex":false,"type":"endpoint","pattern":"^\\/api\\/health\\/?$","segments":[[{"content":"api","dynamic":false,"spread":false}],[{"content":"health","dynamic":false,"spread":false}]],"params":[],"component":"src/pages/api/health.ts","pathname":"/api/health","prerender":false,"fallbackRoutes":[],"distURL":[],"origin":"project","_meta":{"trailingSlash":"ignore"}}},{"file":"","links":[],"scripts":[],"styles":[],"routeData":{"route":"/api/pricing","isIndex":false,"type":"endpoint","pattern":"^\\/api\\/pricing\\/?$","segments":[[{"content":"api","dynamic":false,"spread":false}],[{"content":"pricing","dynamic":false,"spread":false}]],"params":[],"component":"src/pages/api/pricing.ts","pathname":"/api/pricing","prerender":false,"fallbackRoutes":[],"distURL":[],"origin":"project","_meta":{"trailingSlash":"ignore"}}},{"file":"","links":[],"scripts":[],"styles":[],"routeData":{"route":"/api/waitlist","isIndex":false,"type":"endpoint","pattern":"^\\/api\\/waitlist\\/?$","segments":[[{"content":"api","dynamic":false,"spread":false}],[{"content":"waitlist","dynamic":false,"spread":false}]],"params":[],"component":"src/pages/api/waitlist.ts","pathname":"/api/waitlist","prerender":false,"fallbackRoutes":[],"distURL":[],"origin":"project","_meta":{"trailingSlash":"ignore"}}},{"file":"","links":[],"scripts":[],"styles":[{"type":"external","src":"_astro/Layout.BaobIMfH.css"},{"type":"inline","content":".module-page[data-astro-cid-ltb72aaw]{padding-block:5rem}.lead[data-astro-cid-ltb72aaw]{max-width:65ch;color:var(--ink-soft);font-size:1.1rem}.module-grid[data-astro-cid-ltb72aaw]{grid-template-columns:repeat(3,1fr);gap:1rem;margin:2rem 0;display:grid}article[data-astro-cid-ltb72aaw]{border:1px solid var(--line);border-radius:var(--radius);background:var(--panel);padding:1.5rem}article[data-astro-cid-ltb72aaw] h2[data-astro-cid-ltb72aaw]{font-size:1.2rem}article[data-astro-cid-ltb72aaw] p[data-astro-cid-ltb72aaw]{color:var(--ink-soft)}@media (width<=760px){.module-grid[data-astro-cid-ltb72aaw]{grid-template-columns:1fr}}\n"}],"routeData":{"route":"/bizforma","isIndex":true,"type":"page","pattern":"^\\/bizforma\\/?$","segments":[[{"content":"bizforma","dynamic":false,"spread":false}]],"params":[],"component":"src/pages/bizforma/index.astro","pathname":"/bizforma","prerender":false,"fallbackRoutes":[],"distURL":[],"origin":"project","_meta":{"trailingSlash":"ignore"}}},{"file":"","links":[],"scripts":[],"styles":[{"type":"external","src":"_astro/Layout.BaobIMfH.css"}],"routeData":{"route":"/blog","isIndex":true,"type":"page","pattern":"^\\/blog\\/?$","segments":[[{"content":"blog","dynamic":false,"spread":false}]],"params":[],"component":"src/pages/blog/index.astro","pathname":"/blog","prerender":false,"fallbackRoutes":[],"distURL":[],"origin":"project","_meta":{"trailingSlash":"ignore"}}},{"file":"","links":[],"scripts":[],"styles":[{"type":"external","src":"_astro/Layout.BaobIMfH.css"},{"type":"inline","content":".module-page[data-astro-cid-aouy3252]{padding-block:5rem}.lead[data-astro-cid-aouy3252]{max-width:65ch;color:var(--ink-soft);font-size:1.1rem}.module-grid[data-astro-cid-aouy3252]{grid-template-columns:repeat(3,1fr);gap:1rem;margin:2rem 0;display:grid}article[data-astro-cid-aouy3252]{border:1px solid var(--line);border-radius:var(--radius);background:var(--panel);padding:1.5rem}article[data-astro-cid-aouy3252] h2[data-astro-cid-aouy3252]{font-size:1.2rem}article[data-astro-cid-aouy3252] p[data-astro-cid-aouy3252]{color:var(--ink-soft)}@media (width<=760px){.module-grid[data-astro-cid-aouy3252]{grid-template-columns:1fr}}\n"}],"routeData":{"route":"/bookkeeping","isIndex":true,"type":"page","pattern":"^\\/bookkeeping\\/?$","segments":[[{"content":"bookkeeping","dynamic":false,"spread":false}]],"params":[],"component":"src/pages/bookkeeping/index.astro","pathname":"/bookkeeping","prerender":false,"fallbackRoutes":[],"distURL":[],"origin":"project","_meta":{"trailingSlash":"ignore"}}},{"file":"","links":[],"scripts":[],"styles":[{"type":"external","src":"_astro/Layout.BaobIMfH.css"}],"routeData":{"route":"/contact","isIndex":false,"type":"page","pattern":"^\\/contact\\/?$","segments":[[{"content":"contact","dynamic":false,"spread":false}]],"params":[],"component":"src/pages/contact.astro","pathname":"/contact","prerender":false,"fallbackRoutes":[],"distURL":[],"origin":"project","_meta":{"trailingSlash":"ignore"}}},{"file":"","links":[],"scripts":[],"styles":[],"routeData":{"route":"/dashboard","isIndex":true,"type":"page","pattern":"^\\/dashboard\\/?$","segments":[[{"content":"dashboard","dynamic":false,"spread":false}]],"params":[],"component":"src/pages/dashboard/index.astro","pathname":"/dashboard","prerender":false,"fallbackRoutes":[],"distURL":[],"origin":"project","_meta":{"trailingSlash":"ignore"}}},{"file":"","links":[],"scripts":[],"styles":[{"type":"external","src":"_astro/Layout.BaobIMfH.css"}],"routeData":{"route":"/docs","isIndex":true,"type":"page","pattern":"^\\/docs\\/?$","segments":[[{"content":"docs","dynamic":false,"spread":false}]],"params":[],"component":"src/pages/docs/index.astro","pathname":"/docs","prerender":false,"fallbackRoutes":[],"distURL":[],"origin":"project","_meta":{"trailingSlash":"ignore"}}},{"file":"","links":[],"scripts":[],"styles":[{"type":"external","src":"_astro/Layout.BaobIMfH.css"}],"routeData":{"route":"/features/ai-cfo","isIndex":false,"type":"page","pattern":"^\\/features\\/ai-cfo\\/?$","segments":[[{"content":"features","dynamic":false,"spread":false}],[{"content":"ai-cfo","dynamic":false,"spread":false}]],"params":[],"component":"src/pages/features/ai-cfo.astro","pathname":"/features/ai-cfo","prerender":false,"fallbackRoutes":[],"distURL":[],"origin":"project","_meta":{"trailingSlash":"ignore"}}},{"file":"","links":[],"scripts":[],"styles":[{"type":"external","src":"_astro/Layout.BaobIMfH.css"}],"routeData":{"route":"/features/bizforma","isIndex":false,"type":"page","pattern":"^\\/features\\/bizforma\\/?$","segments":[[{"content":"features","dynamic":false,"spread":false}],[{"content":"bizforma","dynamic":false,"spread":false}]],"params":[],"component":"src/pages/features/bizforma.astro","pathname":"/features/bizforma","prerender":false,"fallbackRoutes":[],"distURL":[],"origin":"project","_meta":{"trailingSlash":"ignore"}}},{"file":"","links":[],"scripts":[],"styles":[{"type":"external","src":"_astro/Layout.BaobIMfH.css"}],"routeData":{"route":"/features/bookkeeping","isIndex":false,"type":"page","pattern":"^\\/features\\/bookkeeping\\/?$","segments":[[{"content":"features","dynamic":false,"spread":false}],[{"content":"bookkeeping","dynamic":false,"spread":false}]],"params":[],"component":"src/pages/features/bookkeeping.astro","pathname":"/features/bookkeeping","prerender":false,"fallbackRoutes":[],"distURL":[],"origin":"project","_meta":{"trailingSlash":"ignore"}}},{"file":"","links":[],"scripts":[],"styles":[{"type":"external","src":"_astro/Layout.BaobIMfH.css"}],"routeData":{"route":"/features/forecasting","isIndex":false,"type":"page","pattern":"^\\/features\\/forecasting\\/?$","segments":[[{"content":"features","dynamic":false,"spread":false}],[{"content":"forecasting","dynamic":false,"spread":false}]],"params":[],"component":"src/pages/features/forecasting.astro","pathname":"/features/forecasting","prerender":false,"fallbackRoutes":[],"distURL":[],"origin":"project","_meta":{"trailingSlash":"ignore"}}},{"file":"","links":[],"scripts":[],"styles":[{"type":"external","src":"_astro/Layout.BaobIMfH.css"}],"routeData":{"route":"/features/payroll","isIndex":false,"type":"page","pattern":"^\\/features\\/payroll\\/?$","segments":[[{"content":"features","dynamic":false,"spread":false}],[{"content":"payroll","dynamic":false,"spread":false}]],"params":[],"component":"src/pages/features/payroll.astro","pathname":"/features/payroll","prerender":false,"fallbackRoutes":[],"distURL":[],"origin":"project","_meta":{"trailingSlash":"ignore"}}},{"file":"","links":[],"scripts":[],"styles":[{"type":"external","src":"_astro/Layout.BaobIMfH.css"}],"routeData":{"route":"/features/reporting","isIndex":false,"type":"page","pattern":"^\\/features\\/reporting\\/?$","segments":[[{"content":"features","dynamic":false,"spread":false}],[{"content":"reporting","dynamic":false,"spread":false}]],"params":[],"component":"src/pages/features/reporting.astro","pathname":"/features/reporting","prerender":false,"fallbackRoutes":[],"distURL":[],"origin":"project","_meta":{"trailingSlash":"ignore"}}},{"file":"","links":[],"scripts":[],"styles":[{"type":"external","src":"_astro/Layout.BaobIMfH.css"},{"type":"inline","content":".module-page[data-astro-cid-pt5ruj3o]{padding-block:5rem}.lead[data-astro-cid-pt5ruj3o]{max-width:65ch;color:var(--ink-soft);font-size:1.1rem}.module-grid[data-astro-cid-pt5ruj3o]{grid-template-columns:repeat(3,1fr);gap:1rem;margin:2rem 0;display:grid}article[data-astro-cid-pt5ruj3o]{border:1px solid var(--line);border-radius:var(--radius);background:var(--panel);padding:1.5rem}article[data-astro-cid-pt5ruj3o] h2[data-astro-cid-pt5ruj3o]{font-size:1.2rem}article[data-astro-cid-pt5ruj3o] p[data-astro-cid-pt5ruj3o]{color:var(--ink-soft)}@media (width<=760px){.module-grid[data-astro-cid-pt5ruj3o]{grid-template-columns:1fr}}\n"}],"routeData":{"route":"/insights","isIndex":true,"type":"page","pattern":"^\\/insights\\/?$","segments":[[{"content":"insights","dynamic":false,"spread":false}]],"params":[],"component":"src/pages/insights/index.astro","pathname":"/insights","prerender":false,"fallbackRoutes":[],"distURL":[],"origin":"project","_meta":{"trailingSlash":"ignore"}}},{"file":"","links":[],"scripts":[],"styles":[{"type":"inline","content":".page[data-astro-cid-cuutxnju]{padding-block:5rem}.lead[data-astro-cid-cuutxnju]{max-width:65ch;color:var(--ink-soft);font-size:1.1rem}.grid[data-astro-cid-cuutxnju]{grid-template-columns:repeat(2,1fr);gap:1rem;margin-top:2rem;display:grid}article[data-astro-cid-cuutxnju]{border:1px solid var(--line);border-radius:var(--radius);background:var(--panel);padding:1.5rem}.status[data-astro-cid-cuutxnju]{color:var(--moss);letter-spacing:.08em;text-transform:uppercase;font-size:.72rem;font-weight:800}article[data-astro-cid-cuutxnju] h2[data-astro-cid-cuutxnju]{font-size:1.25rem}article[data-astro-cid-cuutxnju] p[data-astro-cid-cuutxnju]:not(.status){color:var(--ink-soft)}@media (width<=700px){.grid[data-astro-cid-cuutxnju]{grid-template-columns:1fr}}\n"},{"type":"external","src":"_astro/Layout.BaobIMfH.css"}],"routeData":{"route":"/integrations","isIndex":false,"type":"page","pattern":"^\\/integrations\\/?$","segments":[[{"content":"integrations","dynamic":false,"spread":false}]],"params":[],"component":"src/pages/integrations.astro","pathname":"/integrations","prerender":false,"fallbackRoutes":[],"distURL":[],"origin":"project","_meta":{"trailingSlash":"ignore"}}},{"file":"","links":[],"scripts":[],"styles":[],"routeData":{"route":"/kb/DEPLOYMENT","isIndex":false,"type":"page","pattern":"^\\/kb\\/DEPLOYMENT\\/?$","segments":[[{"content":"kb","dynamic":false,"spread":false}],[{"content":"DEPLOYMENT","dynamic":false,"spread":false}]],"params":[],"component":"src/pages/kb/DEPLOYMENT.md","pathname":"/kb/DEPLOYMENT","prerender":false,"fallbackRoutes":[],"distURL":[],"origin":"project","_meta":{"trailingSlash":"ignore"}}},{"file":"","links":[],"scripts":[],"styles":[{"type":"external","src":"_astro/Layout.BaobIMfH.css"}],"routeData":{"route":"/kb","isIndex":true,"type":"page","pattern":"^\\/kb\\/?$","segments":[[{"content":"kb","dynamic":false,"spread":false}]],"params":[],"component":"src/pages/kb/index.astro","pathname":"/kb","prerender":false,"fallbackRoutes":[],"distURL":[],"origin":"project","_meta":{"trailingSlash":"ignore"}}},{"file":"","links":[],"scripts":[],"styles":[{"type":"external","src":"_astro/Layout.BaobIMfH.css"}],"routeData":{"route":"/legal/acceptable-use","isIndex":false,"type":"page","pattern":"^\\/legal\\/acceptable-use\\/?$","segments":[[{"content":"legal","dynamic":false,"spread":false}],[{"content":"acceptable-use","dynamic":false,"spread":false}]],"params":[],"component":"src/pages/legal/acceptable-use.astro","pathname":"/legal/acceptable-use","prerender":false,"fallbackRoutes":[],"distURL":[],"origin":"project","_meta":{"trailingSlash":"ignore"}}},{"file":"","links":[],"scripts":[],"styles":[{"type":"external","src":"_astro/Layout.BaobIMfH.css"}],"routeData":{"route":"/legal/cookies","isIndex":false,"type":"page","pattern":"^\\/legal\\/cookies\\/?$","segments":[[{"content":"legal","dynamic":false,"spread":false}],[{"content":"cookies","dynamic":false,"spread":false}]],"params":[],"component":"src/pages/legal/cookies.astro","pathname":"/legal/cookies","prerender":false,"fallbackRoutes":[],"distURL":[],"origin":"project","_meta":{"trailingSlash":"ignore"}}},{"file":"","links":[],"scripts":[],"styles":[],"routeData":{"route":"/legal/data-processing","isIndex":false,"type":"page","pattern":"^\\/legal\\/data-processing\\/?$","segments":[[{"content":"legal","dynamic":false,"spread":false}],[{"content":"data-processing","dynamic":false,"spread":false}]],"params":[],"component":"src/pages/legal/data-processing.astro","pathname":"/legal/data-processing","prerender":false,"fallbackRoutes":[],"distURL":[],"origin":"project","_meta":{"trailingSlash":"ignore"}}},{"file":"","links":[],"scripts":[],"styles":[{"type":"external","src":"_astro/Layout.BaobIMfH.css"}],"routeData":{"route":"/legal/privacy","isIndex":false,"type":"page","pattern":"^\\/legal\\/privacy\\/?$","segments":[[{"content":"legal","dynamic":false,"spread":false}],[{"content":"privacy","dynamic":false,"spread":false}]],"params":[],"component":"src/pages/legal/privacy.astro","pathname":"/legal/privacy","prerender":false,"fallbackRoutes":[],"distURL":[],"origin":"project","_meta":{"trailingSlash":"ignore"}}},{"file":"","links":[],"scripts":[],"styles":[{"type":"external","src":"_astro/Layout.BaobIMfH.css"}],"routeData":{"route":"/legal/security","isIndex":false,"type":"page","pattern":"^\\/legal\\/security\\/?$","segments":[[{"content":"legal","dynamic":false,"spread":false}],[{"content":"security","dynamic":false,"spread":false}]],"params":[],"component":"src/pages/legal/security.astro","pathname":"/legal/security","prerender":false,"fallbackRoutes":[],"distURL":[],"origin":"project","_meta":{"trailingSlash":"ignore"}}},{"file":"","links":[],"scripts":[],"styles":[{"type":"external","src":"_astro/Layout.BaobIMfH.css"}],"routeData":{"route":"/legal/terms","isIndex":false,"type":"page","pattern":"^\\/legal\\/terms\\/?$","segments":[[{"content":"legal","dynamic":false,"spread":false}],[{"content":"terms","dynamic":false,"spread":false}]],"params":[],"component":"src/pages/legal/terms.astro","pathname":"/legal/terms","prerender":false,"fallbackRoutes":[],"distURL":[],"origin":"project","_meta":{"trailingSlash":"ignore"}}},{"file":"","links":[],"scripts":[],"styles":[{"type":"external","src":"_astro/Layout.BaobIMfH.css"}],"routeData":{"route":"/login","isIndex":false,"type":"page","pattern":"^\\/login\\/?$","segments":[[{"content":"login","dynamic":false,"spread":false}]],"params":[],"component":"src/pages/login.astro","pathname":"/login","prerender":false,"fallbackRoutes":[],"distURL":[],"origin":"project","_meta":{"trailingSlash":"ignore"}}},{"file":"","links":[],"scripts":[],"styles":[{"type":"external","src":"_astro/Layout.BaobIMfH.css"},{"type":"inline","content":".page-hero[data-astro-cid-c7d3gc2c]{padding:64px 0 40px}.section-lead[data-astro-cid-c7d3gc2c]{max-width:68ch;font-size:1.08rem}.module-list[data-astro-cid-c7d3gc2c]{flex-direction:column;display:flex}.module-row[data-astro-cid-c7d3gc2c]{border-top:1px solid var(--line);grid-template-columns:80px 1fr;gap:24px;padding:40px 0;scroll-margin-top:100px;display:grid}.module-row[data-astro-cid-c7d3gc2c]:first-child{border-top:none}.module-index[data-astro-cid-c7d3gc2c]{color:var(--moss);padding-top:6px;font-size:.9rem}.module-head[data-astro-cid-c7d3gc2c]{flex-wrap:wrap;align-items:baseline;gap:16px;display:flex}.module-head[data-astro-cid-c7d3gc2c] h2[data-astro-cid-c7d3gc2c]{margin:0}.tier-tag[data-astro-cid-c7d3gc2c]{color:var(--ink);background:var(--amber-soft);border:1px solid var(--amber);text-transform:capitalize;border-radius:3px;padding:3px 9px;font-size:.72rem}.module-tagline[data-astro-cid-c7d3gc2c]{font-family:var(--font-mono);color:var(--moss);margin-top:8px;font-size:.95rem}.cta-inner[data-astro-cid-c7d3gc2c]{flex-wrap:wrap;justify-content:space-between;align-items:center;gap:24px;display:flex}@media (width<=640px){.module-row[data-astro-cid-c7d3gc2c]{grid-template-columns:1fr}.module-index[data-astro-cid-c7d3gc2c]{padding-top:0}}\n"}],"routeData":{"route":"/modules","isIndex":false,"type":"page","pattern":"^\\/modules\\/?$","segments":[[{"content":"modules","dynamic":false,"spread":false}]],"params":[],"component":"src/pages/modules.astro","pathname":"/modules","prerender":false,"fallbackRoutes":[],"distURL":[],"origin":"project","_meta":{"trailingSlash":"ignore"}}},{"file":"","links":[],"scripts":[],"styles":[{"type":"external","src":"_astro/Layout.BaobIMfH.css"},{"type":"inline","content":".module-page[data-astro-cid-rmaoqoqs]{padding-block:5rem}.lead[data-astro-cid-rmaoqoqs]{max-width:65ch;color:var(--ink-soft);font-size:1.1rem}.module-grid[data-astro-cid-rmaoqoqs]{grid-template-columns:repeat(3,1fr);gap:1rem;margin:2rem 0;display:grid}article[data-astro-cid-rmaoqoqs]{border:1px solid var(--line);border-radius:var(--radius);background:var(--panel);padding:1.5rem}article[data-astro-cid-rmaoqoqs] h2[data-astro-cid-rmaoqoqs]{font-size:1.2rem}article[data-astro-cid-rmaoqoqs] p[data-astro-cid-rmaoqoqs]{color:var(--ink-soft)}@media (width<=760px){.module-grid[data-astro-cid-rmaoqoqs]{grid-template-columns:1fr}}\n"}],"routeData":{"route":"/payroll","isIndex":true,"type":"page","pattern":"^\\/payroll\\/?$","segments":[[{"content":"payroll","dynamic":false,"spread":false}]],"params":[],"component":"src/pages/payroll/index.astro","pathname":"/payroll","prerender":false,"fallbackRoutes":[],"distURL":[],"origin":"project","_meta":{"trailingSlash":"ignore"}}},{"file":"","links":[],"scripts":[],"styles":[{"type":"external","src":"_astro/Layout.BaobIMfH.css"},{"type":"inline","content":".module-page[data-astro-cid-3zg4o5oy]{padding-block:5rem}.lead[data-astro-cid-3zg4o5oy]{max-width:65ch;color:var(--ink-soft);font-size:1.1rem}.module-grid[data-astro-cid-3zg4o5oy]{grid-template-columns:repeat(3,1fr);gap:1rem;margin:2rem 0;display:grid}article[data-astro-cid-3zg4o5oy]{border:1px solid var(--line);border-radius:var(--radius);background:var(--panel);padding:1.5rem}article[data-astro-cid-3zg4o5oy] h2[data-astro-cid-3zg4o5oy]{font-size:1.2rem}article[data-astro-cid-3zg4o5oy] p[data-astro-cid-3zg4o5oy]{color:var(--ink-soft)}@media (width<=760px){.module-grid[data-astro-cid-3zg4o5oy]{grid-template-columns:1fr}}\n"}],"routeData":{"route":"/pbx","isIndex":true,"type":"page","pattern":"^\\/pbx\\/?$","segments":[[{"content":"pbx","dynamic":false,"spread":false}]],"params":[],"component":"src/pages/pbx/index.astro","pathname":"/pbx","prerender":false,"fallbackRoutes":[],"distURL":[],"origin":"project","_meta":{"trailingSlash":"ignore"}}},{"file":"","links":[],"scripts":[],"styles":[{"type":"external","src":"_astro/Layout.BaobIMfH.css"},{"type":"inline","content":".hero[data-astro-cid-u3mqw4ek]{text-align:center;padding:5.5rem 0 3rem}.container[data-astro-cid-u3mqw4ek]{width:min(100% - 2rem,75rem);margin:0 auto}.eyebrow[data-astro-cid-u3mqw4ek]{color:var(--color-primary,#8b5e3c);letter-spacing:.08em;text-transform:uppercase;margin:0 0 .75rem;font-size:.825rem;font-weight:700}h1[data-astro-cid-u3mqw4ek],h2[data-astro-cid-u3mqw4ek]{color:var(--color-ink,#2b2118)}h1[data-astro-cid-u3mqw4ek]{max-width:44rem;margin:0 auto;font-size:clamp(2.25rem,5vw,4rem);line-height:1.08}.hero-copy[data-astro-cid-u3mqw4ek]{max-width:42rem;color:var(--color-muted,#675d55);margin:1.25rem auto 0;font-size:1.125rem;line-height:1.65}.pricing-section[data-astro-cid-u3mqw4ek]{padding:2rem 0 5rem}.pricing-grid[data-astro-cid-u3mqw4ek]{grid-template-columns:repeat(3,minmax(0,1fr));align-items:stretch;gap:1.5rem;display:grid}.pricing-card[data-astro-cid-u3mqw4ek]{border:1px solid var(--color-border,#dfd6ce);background:var(--color-surface,#fffdf9);border-radius:1rem;flex-direction:column;padding:2rem;display:flex;position:relative;box-shadow:0 .5rem 1.5rem #2b21180d}.pricing-card--featured[data-astro-cid-u3mqw4ek]{border:2px solid var(--color-primary,#8b5e3c);transform:translateY(-.5rem);box-shadow:0 1rem 2.5rem #8b5e3c2e}.pricing-badge[data-astro-cid-u3mqw4ek]{background:var(--color-primary,#8b5e3c);color:#fff;letter-spacing:.04em;text-transform:uppercase;white-space:nowrap;border-radius:999px;margin:0;padding:.35rem .75rem;font-size:.75rem;font-weight:700;position:absolute;top:-.875rem;left:50%;transform:translate(-50%)}.pricing-card__header[data-astro-cid-u3mqw4ek] h2[data-astro-cid-u3mqw4ek]{margin:0;font-size:1.5rem}.pricing-card__description[data-astro-cid-u3mqw4ek]{min-height:3.4rem;color:var(--color-muted,#675d55);margin:.875rem 0 1.5rem;line-height:1.5}.pricing-card__price[data-astro-cid-u3mqw4ek]{align-items:baseline;gap:.375rem;margin:0 0 1.75rem;display:flex}.price[data-astro-cid-u3mqw4ek]{color:var(--color-ink,#2b2118);font-size:3rem;font-weight:800;line-height:1}.interval[data-astro-cid-u3mqw4ek]{color:var(--color-muted,#675d55);font-size:1rem}.pricing-card__cta[data-astro-cid-u3mqw4ek]{border:1px solid var(--color-primary,#8b5e3c);min-height:3rem;color:var(--color-primary,#8b5e3c);background:0 0;border-radius:.625rem;justify-content:center;align-items:center;font-weight:700;text-decoration:none;transition:background-color .16s,color .16s,transform .16s;display:inline-flex}.pricing-card__cta[data-astro-cid-u3mqw4ek]:hover,.pricing-card__cta[data-astro-cid-u3mqw4ek]:focus-visible{background:var(--color-primary,#8b5e3c);color:#fff;transform:translateY(-1px)}.pricing-card__cta[data-astro-cid-u3mqw4ek]:focus-visible{outline-offset:3px;outline:3px solid #8b5e3c66}.pricing-card__cta--featured[data-astro-cid-u3mqw4ek]{background:var(--color-primary,#8b5e3c);color:#fff}.pricing-card__cta--featured[data-astro-cid-u3mqw4ek]:hover,.pricing-card__cta--featured[data-astro-cid-u3mqw4ek]:focus-visible{background:var(--color-primary-dark,#704426)}.pricing-card__features[data-astro-cid-u3mqw4ek]{gap:.875rem;margin:1.75rem 0 0;padding:0;list-style:none;display:grid}.pricing-card__features[data-astro-cid-u3mqw4ek] li[data-astro-cid-u3mqw4ek]{color:var(--color-muted,#675d55);gap:.625rem;line-height:1.45;display:flex}.pricing-card__features[data-astro-cid-u3mqw4ek] span[data-astro-cid-u3mqw4ek]{color:var(--color-primary,#8b5e3c);font-weight:800}.pricing-note[data-astro-cid-u3mqw4ek]{color:var(--color-muted,#675d55);text-align:center;margin:2rem 0 0}.pricing-note[data-astro-cid-u3mqw4ek] a[data-astro-cid-u3mqw4ek]{color:var(--color-primary,#8b5e3c);font-weight:700}@media (width<=52rem){.pricing-grid[data-astro-cid-u3mqw4ek]{grid-template-columns:1fr;max-width:32rem;margin:0 auto}.pricing-card--featured[data-astro-cid-u3mqw4ek]{transform:none}.pricing-card__description[data-astro-cid-u3mqw4ek]{min-height:auto}}\n"}],"routeData":{"route":"/pricing","isIndex":false,"type":"page","pattern":"^\\/pricing\\/?$","segments":[[{"content":"pricing","dynamic":false,"spread":false}]],"params":[],"component":"src/pages/pricing.astro","pathname":"/pricing","prerender":false,"fallbackRoutes":[],"distURL":[],"origin":"project","_meta":{"trailingSlash":"ignore"}}},{"file":"","links":[],"scripts":[],"styles":[],"routeData":{"route":"/register","isIndex":false,"type":"page","pattern":"^\\/register\\/?$","segments":[[{"content":"register","dynamic":false,"spread":false}]],"params":[],"component":"src/pages/register.astro","pathname":"/register","prerender":false,"fallbackRoutes":[],"distURL":[],"origin":"project","_meta":{"trailingSlash":"ignore"}}},{"file":"","links":[],"scripts":[],"styles":[{"type":"external","src":"_astro/Layout.BaobIMfH.css"},{"type":"inline","content":".module-page[data-astro-cid-2yroouop]{padding-block:5rem}.lead[data-astro-cid-2yroouop]{max-width:65ch;color:var(--ink-soft);font-size:1.1rem}.module-grid[data-astro-cid-2yroouop]{grid-template-columns:repeat(3,1fr);gap:1rem;margin:2rem 0;display:grid}article[data-astro-cid-2yroouop]{border:1px solid var(--line);border-radius:var(--radius);background:var(--panel);padding:1.5rem}article[data-astro-cid-2yroouop] h2[data-astro-cid-2yroouop]{font-size:1.2rem}article[data-astro-cid-2yroouop] p[data-astro-cid-2yroouop]{color:var(--ink-soft)}@media (width<=760px){.module-grid[data-astro-cid-2yroouop]{grid-template-columns:1fr}}\n"}],"routeData":{"route":"/reports","isIndex":true,"type":"page","pattern":"^\\/reports\\/?$","segments":[[{"content":"reports","dynamic":false,"spread":false}]],"params":[],"component":"src/pages/reports/index.astro","pathname":"/reports","prerender":false,"fallbackRoutes":[],"distURL":[],"origin":"project","_meta":{"trailingSlash":"ignore"}}},{"file":"","links":[],"scripts":[],"styles":[{"type":"inline","content":".guide[data-astro-cid-whxlroqd]{max-width:52rem;padding-block:5rem}.lead[data-astro-cid-whxlroqd]{color:var(--ink-soft);font-size:1.15rem}.guide[data-astro-cid-whxlroqd] h2[data-astro-cid-whxlroqd]{margin-top:2.5rem;font-size:1.65rem}\n"},{"type":"external","src":"_astro/Layout.BaobIMfH.css"}],"routeData":{"route":"/resources/automated-financial-reporting","isIndex":false,"type":"page","pattern":"^\\/resources\\/automated-financial-reporting\\/?$","segments":[[{"content":"resources","dynamic":false,"spread":false}],[{"content":"automated-financial-reporting","dynamic":false,"spread":false}]],"params":[],"component":"src/pages/resources/automated-financial-reporting.astro","pathname":"/resources/automated-financial-reporting","prerender":false,"fallbackRoutes":[],"distURL":[],"origin":"project","_meta":{"trailingSlash":"ignore"}}},{"file":"","links":[],"scripts":[],"styles":[{"type":"inline","content":".guide[data-astro-cid-kfeq6nos]{max-width:52rem;padding-block:5rem}.lead[data-astro-cid-kfeq6nos]{color:var(--ink-soft);font-size:1.15rem}.guide[data-astro-cid-kfeq6nos] h2[data-astro-cid-kfeq6nos]{margin-top:2.5rem;font-size:1.65rem}\n"},{"type":"external","src":"_astro/Layout.BaobIMfH.css"}],"routeData":{"route":"/resources/cash-flow-forecasting","isIndex":false,"type":"page","pattern":"^\\/resources\\/cash-flow-forecasting\\/?$","segments":[[{"content":"resources","dynamic":false,"spread":false}],[{"content":"cash-flow-forecasting","dynamic":false,"spread":false}]],"params":[],"component":"src/pages/resources/cash-flow-forecasting.astro","pathname":"/resources/cash-flow-forecasting","prerender":false,"fallbackRoutes":[],"distURL":[],"origin":"project","_meta":{"trailingSlash":"ignore"}}},{"file":"","links":[],"scripts":[],"styles":[{"type":"inline","content":".guide[data-astro-cid-u2wopuzn]{max-width:52rem;padding-block:5rem}.lead[data-astro-cid-u2wopuzn]{color:var(--ink-soft);font-size:1.15rem}.guide[data-astro-cid-u2wopuzn] h2[data-astro-cid-u2wopuzn]{margin-top:2.5rem;font-size:1.65rem}\n"},{"type":"external","src":"_astro/Layout.BaobIMfH.css"}],"routeData":{"route":"/resources/fractional-cfo-tools","isIndex":false,"type":"page","pattern":"^\\/resources\\/fractional-cfo-tools\\/?$","segments":[[{"content":"resources","dynamic":false,"spread":false}],[{"content":"fractional-cfo-tools","dynamic":false,"spread":false}]],"params":[],"component":"src/pages/resources/fractional-cfo-tools.astro","pathname":"/resources/fractional-cfo-tools","prerender":false,"fallbackRoutes":[],"distURL":[],"origin":"project","_meta":{"trailingSlash":"ignore"}}},{"file":"","links":[],"scripts":[],"styles":[{"type":"inline","content":".guide[data-astro-cid-xangprl2]{max-width:52rem;padding-block:5rem}.lead[data-astro-cid-xangprl2]{color:var(--ink-soft);font-size:1.15rem}.guide[data-astro-cid-xangprl2] h2[data-astro-cid-xangprl2]{margin-top:2.5rem;font-size:1.65rem}\n"},{"type":"external","src":"_astro/Layout.BaobIMfH.css"}],"routeData":{"route":"/resources/small-business-financial-dashboard","isIndex":false,"type":"page","pattern":"^\\/resources\\/small-business-financial-dashboard\\/?$","segments":[[{"content":"resources","dynamic":false,"spread":false}],[{"content":"small-business-financial-dashboard","dynamic":false,"spread":false}]],"params":[],"component":"src/pages/resources/small-business-financial-dashboard.astro","pathname":"/resources/small-business-financial-dashboard","prerender":false,"fallbackRoutes":[],"distURL":[],"origin":"project","_meta":{"trailingSlash":"ignore"}}},{"file":"","links":[],"scripts":[],"styles":[{"type":"inline","content":".page[data-astro-cid-4aracdkc]{padding-block:5rem}.lead[data-astro-cid-4aracdkc]{max-width:65ch;color:var(--ink-soft);font-size:1.1rem}.grid[data-astro-cid-4aracdkc]{grid-template-columns:repeat(2,1fr);gap:1rem;margin-top:2rem;display:grid}article[data-astro-cid-4aracdkc]{border:1px solid var(--line);border-radius:var(--radius);padding:1.5rem}article[data-astro-cid-4aracdkc] h2[data-astro-cid-4aracdkc]{font-size:1.25rem}article[data-astro-cid-4aracdkc] h2[data-astro-cid-4aracdkc] a[data-astro-cid-4aracdkc],.read[data-astro-cid-4aracdkc]{color:var(--ink);text-decoration:none}article[data-astro-cid-4aracdkc] p[data-astro-cid-4aracdkc]{color:var(--ink-soft)}.read[data-astro-cid-4aracdkc]{color:var(--moss);font-weight:800}@media (width<=700px){.grid[data-astro-cid-4aracdkc]{grid-template-columns:1fr}}\n"},{"type":"external","src":"_astro/Layout.BaobIMfH.css"}],"routeData":{"route":"/resources","isIndex":true,"type":"page","pattern":"^\\/resources\\/?$","segments":[[{"content":"resources","dynamic":false,"spread":false}]],"params":[],"component":"src/pages/resources/index.astro","pathname":"/resources","prerender":false,"fallbackRoutes":[],"distURL":[],"origin":"project","_meta":{"trailingSlash":"ignore"}}},{"file":"","links":[],"scripts":[],"styles":[{"type":"inline","content":".page[data-astro-cid-6262dcpq]{padding-block:5rem}.lead[data-astro-cid-6262dcpq]{max-width:65ch;color:var(--ink-soft);font-size:1.1rem}.grid[data-astro-cid-6262dcpq]{grid-template-columns:repeat(2,1fr);gap:1rem;margin-top:2rem;display:grid}article[data-astro-cid-6262dcpq]{border:1px solid var(--line);border-radius:var(--radius);background:var(--panel);padding:1.5rem}article[data-astro-cid-6262dcpq] h2[data-astro-cid-6262dcpq]{font-size:1.25rem}article[data-astro-cid-6262dcpq] p[data-astro-cid-6262dcpq]{color:var(--ink-soft)}@media (width<=700px){.grid[data-astro-cid-6262dcpq]{grid-template-columns:1fr}}\n"},{"type":"external","src":"_astro/Layout.BaobIMfH.css"}],"routeData":{"route":"/security","isIndex":false,"type":"page","pattern":"^\\/security\\/?$","segments":[[{"content":"security","dynamic":false,"spread":false}]],"params":[],"component":"src/pages/security.astro","pathname":"/security","prerender":false,"fallbackRoutes":[],"distURL":[],"origin":"project","_meta":{"trailingSlash":"ignore"}}},{"file":"","links":[],"scripts":[],"styles":[{"type":"external","src":"_astro/Layout.BaobIMfH.css"}],"routeData":{"route":"/signup","isIndex":false,"type":"page","pattern":"^\\/signup\\/?$","segments":[[{"content":"signup","dynamic":false,"spread":false}]],"params":[],"component":"src/pages/signup.astro","pathname":"/signup","prerender":false,"fallbackRoutes":[],"distURL":[],"origin":"project","_meta":{"trailingSlash":"ignore"}}},{"file":"","links":[],"scripts":[],"styles":[{"type":"external","src":"_astro/Layout.BaobIMfH.css"},{"type":"inline","content":".hero[data-astro-cid-lcdefpme]{background:var(--paper);padding-top:72px;padding-bottom:96px}.hero-grid[data-astro-cid-lcdefpme]{grid-template-columns:1.05fr .95fr;align-items:center;gap:56px;display:grid}.hero-sub[data-astro-cid-lcdefpme]{font-size:1.12rem}.hero-actions[data-astro-cid-lcdefpme]{flex-wrap:wrap;gap:14px;margin:28px 0 18px;display:flex}.hero-fine[data-astro-cid-lcdefpme]{color:var(--moss);font-size:.8rem}.grad-text[data-astro-cid-lcdefpme]{background:linear-gradient(90deg, var(--amber), var(--moss));color:#0000;-webkit-background-clip:text;background-clip:text}.pain-section[data-astro-cid-lcdefpme]{background:var(--paper)}.section-lead[data-astro-cid-lcdefpme]{max-width:68ch;font-size:1.08rem}.stat-bar[data-astro-cid-lcdefpme]{background:var(--panel)}.stat-grid[data-astro-cid-lcdefpme]{grid-template-columns:repeat(3,1fr);gap:32px;display:grid}.stat[data-astro-cid-lcdefpme]{flex-direction:column;gap:6px;display:flex}.stat-num[data-astro-cid-lcdefpme]{color:var(--amber);font-size:2rem;font-weight:600}.stat-label[data-astro-cid-lcdefpme]{color:var(--ink-soft);max-width:30ch;font-size:.88rem}.feature-grid[data-astro-cid-lcdefpme]{grid-template-columns:repeat(3,1fr);gap:24px;margin-top:32px;display:grid}.feature-card[data-astro-cid-lcdefpme]{background:var(--panel);border:1px solid var(--line);border-radius:var(--radius);padding:28px;transition:border-color .2s,transform .2s}.feature-card[data-astro-cid-lcdefpme]:hover{border-color:var(--amber);transform:translateY(-2px)}.feature-num[data-astro-cid-lcdefpme]{font-size:1.6rem;font-weight:700}.feature-card[data-astro-cid-lcdefpme] h3[data-astro-cid-lcdefpme]{margin:12px 0 8px;font-size:1.15rem}.feature-card[data-astro-cid-lcdefpme] p[data-astro-cid-lcdefpme]{margin:0;font-size:.92rem}.cta-inner[data-astro-cid-lcdefpme]{flex-wrap:wrap;justify-content:space-between;align-items:center;gap:24px;display:flex}.cta-inner[data-astro-cid-lcdefpme] p[data-astro-cid-lcdefpme]{max-width:44ch}@media (width<=860px){.hero-grid[data-astro-cid-lcdefpme]{grid-template-columns:1fr}.stat-grid[data-astro-cid-lcdefpme]{grid-template-columns:1fr;gap:20px}.feature-grid[data-astro-cid-lcdefpme]{grid-template-columns:1fr}}\n"}],"routeData":{"route":"/","isIndex":true,"type":"page","pattern":"^\\/$","segments":[],"params":[],"component":"src/pages/index.astro","pathname":"/","prerender":false,"fallbackRoutes":[],"distURL":[],"origin":"project","_meta":{"trailingSlash":"ignore"}}}],"serverLike":true,"middlewareMode":"classic","site":"https://insighthunter.app","base":"/","trailingSlash":"ignore","compressHTML":"jsx","componentMetadata":[["/Users/jamesmichaelhunterturner/Projects/insighthunter/apps/insighthunter-marketing/src/pages/404.astro",{"propagation":"none","containsHead":true}],["/Users/jamesmichaelhunterturner/Projects/insighthunter/apps/insighthunter-marketing/src/pages/about.astro",{"propagation":"none","containsHead":true}],["/Users/jamesmichaelhunterturner/Projects/insighthunter/apps/insighthunter-marketing/src/pages/blog/index.astro",{"propagation":"none","containsHead":true}],["/Users/jamesmichaelhunterturner/Projects/insighthunter/apps/insighthunter-marketing/src/pages/contact.astro",{"propagation":"none","containsHead":true}],["/Users/jamesmichaelhunterturner/Projects/insighthunter/apps/insighthunter-marketing/src/pages/docs/index.astro",{"propagation":"none","containsHead":true}],["/Users/jamesmichaelhunterturner/Projects/insighthunter/apps/insighthunter-marketing/src/pages/features/ai-cfo.astro",{"propagation":"none","containsHead":true}],["/Users/jamesmichaelhunterturner/Projects/insighthunter/apps/insighthunter-marketing/src/pages/features/bizforma.astro",{"propagation":"none","containsHead":true}],["/Users/jamesmichaelhunterturner/Projects/insighthunter/apps/insighthunter-marketing/src/pages/features/bookkeeping.astro",{"propagation":"none","containsHead":true}],["/Users/jamesmichaelhunterturner/Projects/insighthunter/apps/insighthunter-marketing/src/pages/features/forecasting.astro",{"propagation":"none","containsHead":true}],["/Users/jamesmichaelhunterturner/Projects/insighthunter/apps/insighthunter-marketing/src/pages/features/payroll.astro",{"propagation":"none","containsHead":true}],["/Users/jamesmichaelhunterturner/Projects/insighthunter/apps/insighthunter-marketing/src/pages/features/reporting.astro",{"propagation":"none","containsHead":true}],["/Users/jamesmichaelhunterturner/Projects/insighthunter/apps/insighthunter-marketing/src/pages/kb/index.astro",{"propagation":"none","containsHead":true}],["/Users/jamesmichaelhunterturner/Projects/insighthunter/apps/insighthunter-marketing/src/pages/legal/acceptable-use.astro",{"propagation":"none","containsHead":true}],["/Users/jamesmichaelhunterturner/Projects/insighthunter/apps/insighthunter-marketing/src/pages/legal/cookies.astro",{"propagation":"none","containsHead":true}],["/Users/jamesmichaelhunterturner/Projects/insighthunter/apps/insighthunter-marketing/src/pages/legal/privacy.astro",{"propagation":"none","containsHead":true}],["/Users/jamesmichaelhunterturner/Projects/insighthunter/apps/insighthunter-marketing/src/pages/legal/security.astro",{"propagation":"none","containsHead":true}],["/Users/jamesmichaelhunterturner/Projects/insighthunter/apps/insighthunter-marketing/src/pages/legal/terms.astro",{"propagation":"none","containsHead":true}],["/Users/jamesmichaelhunterturner/Projects/insighthunter/apps/insighthunter-marketing/src/pages/500.astro",{"propagation":"none","containsHead":true}],["/Users/jamesmichaelhunterturner/Projects/insighthunter/apps/insighthunter-marketing/src/pages/bizforma/index.astro",{"propagation":"none","containsHead":true}],["/Users/jamesmichaelhunterturner/Projects/insighthunter/apps/insighthunter-marketing/src/pages/bookkeeping/index.astro",{"propagation":"none","containsHead":true}],["/Users/jamesmichaelhunterturner/Projects/insighthunter/apps/insighthunter-marketing/src/pages/insights/index.astro",{"propagation":"none","containsHead":true}],["/Users/jamesmichaelhunterturner/Projects/insighthunter/apps/insighthunter-marketing/src/pages/integrations.astro",{"propagation":"none","containsHead":true}],["/Users/jamesmichaelhunterturner/Projects/insighthunter/apps/insighthunter-marketing/src/pages/payroll/index.astro",{"propagation":"none","containsHead":true}],["/Users/jamesmichaelhunterturner/Projects/insighthunter/apps/insighthunter-marketing/src/pages/pbx/index.astro",{"propagation":"none","containsHead":true}],["/Users/jamesmichaelhunterturner/Projects/insighthunter/apps/insighthunter-marketing/src/pages/pricing.astro",{"propagation":"none","containsHead":true}],["/Users/jamesmichaelhunterturner/Projects/insighthunter/apps/insighthunter-marketing/src/pages/reports/index.astro",{"propagation":"none","containsHead":true}],["/Users/jamesmichaelhunterturner/Projects/insighthunter/apps/insighthunter-marketing/src/pages/resources/automated-financial-reporting.astro",{"propagation":"none","containsHead":true}],["/Users/jamesmichaelhunterturner/Projects/insighthunter/apps/insighthunter-marketing/src/pages/resources/cash-flow-forecasting.astro",{"propagation":"none","containsHead":true}],["/Users/jamesmichaelhunterturner/Projects/insighthunter/apps/insighthunter-marketing/src/pages/resources/fractional-cfo-tools.astro",{"propagation":"none","containsHead":true}],["/Users/jamesmichaelhunterturner/Projects/insighthunter/apps/insighthunter-marketing/src/pages/resources/index.astro",{"propagation":"none","containsHead":true}],["/Users/jamesmichaelhunterturner/Projects/insighthunter/apps/insighthunter-marketing/src/pages/resources/small-business-financial-dashboard.astro",{"propagation":"none","containsHead":true}],["/Users/jamesmichaelhunterturner/Projects/insighthunter/apps/insighthunter-marketing/src/pages/security.astro",{"propagation":"none","containsHead":true}],["/Users/jamesmichaelhunterturner/Projects/insighthunter/apps/insighthunter-marketing/src/pages/index.astro",{"propagation":"none","containsHead":true}],["/Users/jamesmichaelhunterturner/Projects/insighthunter/apps/insighthunter-marketing/src/pages/login.astro",{"propagation":"none","containsHead":true}],["/Users/jamesmichaelhunterturner/Projects/insighthunter/apps/insighthunter-marketing/src/pages/modules.astro",{"propagation":"none","containsHead":true}],["/Users/jamesmichaelhunterturner/Projects/insighthunter/apps/insighthunter-marketing/src/pages/signup.astro",{"propagation":"none","containsHead":true}]],"renderers":[],"clientDirectives":[["idle","(()=>{var l=(n,t)=>{let i=async()=>{await(await n())()},e=typeof t.value==\"object\"?t.value:void 0,s={timeout:e==null?void 0:e.timeout};\"requestIdleCallback\"in window?window.requestIdleCallback(i,s):setTimeout(i,s.timeout||200)};(self.Astro||(self.Astro={})).idle=l;window.dispatchEvent(new Event(\"astro:idle\"));})();"],["load","(()=>{var e=async t=>{await(await t())()};(self.Astro||(self.Astro={})).load=e;window.dispatchEvent(new Event(\"astro:load\"));})();"],["media","(()=>{var n=(a,t)=>{let i=async()=>{await(await a())()};if(t.value){let e=matchMedia(t.value);e.matches?i():e.addEventListener(\"change\",i,{once:!0})}};(self.Astro||(self.Astro={})).media=n;window.dispatchEvent(new Event(\"astro:media\"));})();"],["only","(()=>{var e=async t=>{await(await t())()};(self.Astro||(self.Astro={})).only=e;window.dispatchEvent(new Event(\"astro:only\"));})();"],["visible","(()=>{var a=(s,i,o)=>{let r=async()=>{await(await s())()},t=typeof i.value==\"object\"?i.value:void 0,c={rootMargin:t==null?void 0:t.rootMargin},n=new IntersectionObserver(e=>{for(let l of e)if(l.isIntersecting){n.disconnect(),r();break}},c);for(let e of o.children)n.observe(e)};(self.Astro||(self.Astro={})).visible=a;window.dispatchEvent(new Event(\"astro:visible\"));})();"]],"entryModules":{"virtual:cloudflare/worker-entry":"entry.mjs","\u0000noop-middleware":"virtual_astro_middleware.mjs","\u0000virtual:astro:server-island-manifest":"chunks/_virtual_astro_server-island-manifest_q0HM18kM.mjs","\u0000virtual:astro:session-driver":"chunks/_virtual_astro_session-driver_P_d2O7QX.mjs","\u0000virtual:astro:actions/noop-entrypoint":"chunks/noop-entrypoint_BYLrzUxc.mjs","/Users/jamesmichaelhunterturner/Projects/insighthunter/node_modules/.pnpm/astro@7.2.2_@astrojs+markdown-remark@7.2.2_@emnapi+core@1.11.1_@emnapi+runtime@1.11.3_@_6bfadd3e3e54c3011e8b7da76cf02da3/node_modules/astro/dist/assets/services/noop.js":"chunks/noop_Yl8Jj9kS.mjs","/Users/jamesmichaelhunterturner/Projects/insighthunter/node_modules/.pnpm/@astrojs+cloudflare@14.2.3_@types+node@25.9.4_astro@7.2.2_@astrojs+markdown-remark@7.2._a03aab5eba31d05e6cae5f11ca597233/node_modules/@astrojs/cloudflare/dist/utils/static-image-collection.js":"chunks/static-image-collection_D1s0uW44.mjs","\u0000virtual:astro:page:src/pages/404@_@astro":"chunks/404_Bl-UTOpf.mjs","\u0000virtual:astro:page:src/pages/500@_@astro":"chunks/500_DZNBAkgb.mjs","\u0000virtual:astro:page:src/pages/kb/DEPLOYMENT@_@md":"chunks/DEPLOYMENT_CxkG98bO.mjs","\u0000astro:data-layer-content":"chunks/_astro_data-layer-content_DHUvv2oq.mjs","\u0000virtual:astro:page:src/pages/about@_@astro":"chunks/about_CcoQ3C5i.mjs","\u0000virtual:astro:page:src/pages/legal/acceptable-use@_@astro":"chunks/acceptable-use_CUYx_KW9.mjs","\u0000virtual:astro:page:src/pages/features/ai-cfo@_@astro":"chunks/ai-cfo_CgqaqQKr.mjs","\u0000virtual:astro:page:src/pages/resources/automated-financial-reporting@_@astro":"chunks/automated-financial-reporting_-xtuaWT6.mjs","\u0000virtual:astro:page:src/pages/features/bizforma@_@astro":"chunks/bizforma_IRJMHiv0.mjs","\u0000virtual:astro:page:src/pages/features/bookkeeping@_@astro":"chunks/bookkeeping_C0to9b5o.mjs","\u0000virtual:astro:page:src/pages/resources/cash-flow-forecasting@_@astro":"chunks/cash-flow-forecasting_D3wCfStF.mjs","\u0000virtual:astro:page:src/pages/api/contact@_@ts":"chunks/contact_BLyPzKaZ.mjs","\u0000virtual:astro:page:src/pages/contact@_@astro":"chunks/contact_BkltKKCY.mjs","/Users/jamesmichaelhunterturner/Projects/insighthunter/apps/insighthunter-marketing/.astro/content-assets.mjs":"chunks/content-assets_DUKddbio.mjs","\u0000virtual:astro:page:src/pages/legal/cookies@_@astro":"chunks/cookies_B1VD0V7-.mjs","\u0000virtual:astro:page:src/pages/legal/data-processing@_@astro":"chunks/data-processing_C22LyY3U.mjs","\u0000virtual:astro:page:src/pages/features/forecasting@_@astro":"chunks/forecasting_CAAE-8H0.mjs","\u0000virtual:astro:page:src/pages/resources/fractional-cfo-tools@_@astro":"chunks/fractional-cfo-tools_CjqDXrl7.mjs","\u0000virtual:astro:page:src/pages/api/health@_@ts":"chunks/health_DPN6O5KW.mjs","\u0000virtual:astro:page:../../node_modules/.pnpm/@astrojs+cloudflare@14.2.3_@types+node@25.9.4_astro@7.2.2_@astrojs+markdown-remark@7.2._a03aab5eba31d05e6cae5f11ca597233/node_modules/@astrojs/cloudflare/dist/entrypoints/image-passthrough-endpoint@_@js":"chunks/image-passthrough-endpoint_DQdBpHhk.mjs","\u0000virtual:astro:page:src/pages/resources/index@_@astro":"chunks/index_4k5A7APj.mjs","\u0000virtual:astro:page:src/pages/pbx/index@_@astro":"chunks/index_BBbBWLCs2.mjs","\u0000virtual:astro:page:src/pages/dashboard/index@_@astro":"chunks/index_BDyMjnjV.mjs","\u0000virtual:astro:page:src/pages/blog/index@_@astro":"chunks/index_BL_NF6lB.mjs","\u0000virtual:astro:page:src/pages/index@_@astro":"chunks/index_BgAiOhBJ.mjs","\u0000virtual:astro:page:src/pages/bizforma/index@_@astro":"chunks/index_C8QeXvmH.mjs","\u0000virtual:astro:page:src/pages/kb/index@_@astro":"chunks/index_CDUXZMrE.mjs","\u0000virtual:astro:page:src/pages/payroll/index@_@astro":"chunks/index_CpyOtCJM.mjs","\u0000virtual:astro:page:src/pages/insights/index@_@astro":"chunks/index_DCuXNHUl.mjs","\u0000virtual:astro:page:src/pages/bookkeeping/index@_@astro":"chunks/index_DwSD597T.mjs","\u0000virtual:astro:page:src/pages/docs/index@_@astro":"chunks/index_c95EDJ_x.mjs","\u0000virtual:astro:page:src/pages/reports/index@_@astro":"chunks/index_xM2uUCt92.mjs","\u0000virtual:astro:page:src/pages/integrations@_@astro":"chunks/integrations_BKyf_jt0.mjs","\u0000virtual:astro:page:src/pages/login@_@astro":"chunks/login_BZqW-oUC.mjs","\u0000virtual:astro:page:src/pages/modules@_@astro":"chunks/modules_COa2uw_E.mjs","\u0000virtual:astro:page:src/pages/features/payroll@_@astro":"chunks/payroll_BlEQ31ix.mjs","\u0000virtual:astro:page:src/pages/pricing@_@astro":"chunks/pricing_C0H4PeTg.mjs","\u0000virtual:astro:page:src/pages/api/pricing@_@ts":"chunks/pricing_ZiT-G6LH.mjs","\u0000virtual:astro:page:src/pages/legal/privacy@_@astro":"chunks/privacy_DAYel6rB.mjs","\u0000virtual:astro:page:src/pages/register@_@astro":"chunks/register_B6rrIicn.mjs","\u0000virtual:astro:page:src/pages/features/reporting@_@astro":"chunks/reporting_BRLXXqRp.mjs","\u0000virtual:astro:page:src/pages/legal/security@_@astro":"chunks/security_BasixRs8.mjs","\u0000virtual:astro:page:src/pages/security@_@astro":"chunks/security_Ca9_yo28.mjs","\u0000virtual:astro:page:src/pages/signup@_@astro":"chunks/signup_1IPjbbM_.mjs","\u0000virtual:astro:page:src/pages/resources/small-business-financial-dashboard@_@astro":"chunks/small-business-financial-dashboard_C3zhr4vy.mjs","\u0000virtual:astro:page:src/pages/api/checkout/start@_@ts":"chunks/start_8uxuHdO4.mjs","\u0000virtual:astro:page:src/pages/legal/terms@_@astro":"chunks/terms_DHEZVTf9.mjs","\u0000virtual:astro:page:src/pages/api/waitlist@_@ts":"chunks/waitlist_B4Xer-Tx.mjs","virtual:astro:noop":"_astro/_virtual_astro_noop.CYK_omFk.js","astro:scripts/before-hydration.js":""},"inlinedScripts":[],"assets":["/favicon.svg","/manifest.webmanifest","/robots.txt","/sw.js","/fonts/README.md","/images/bookkeeping-preview.webp","/images/hero-command-center.webp","/images/integrations-preview.webp","/images/logo-mark.svg","/images/logo-wordmark.svg","/images/reporting-preview.webp","/og/homepage.png","/_astro/Layout.BaobIMfH.css"],"buildFormat":"directory","checkOrigin":true,"actionBodySizeLimit":1048576,"serverIslandBodySizeLimit":1048576,"allowedDomains":[],"key":"rcLFH2YFqyUtoZFvULq8Jw6D5dppQEZxtAOTEfBWnZY=","sessionConfig":{"driver":"unstorage/drivers/cloudflare-kv-binding","options":{"binding":"SESSION"}},"image":{},"devToolbar":{"enabled":false,"debugInfoOutput":""},"logLevel":"info","shouldInjectCspMetaTags":false});
var manifestRoutes = _manifest.routes;
var manifest = Object.assign(_manifest, {
	renderers,
	actions: () => import("./chunks/noop-entrypoint_BYLrzUxc.mjs"),
	middleware: () => import("./virtual_astro_middleware.mjs"),
	sessionDriver: () => import("./chunks/_virtual_astro_session-driver_P_d2O7QX.mjs"),
	serverIslandMappings: () => import("./chunks/_virtual_astro_server-island-manifest_q0HM18kM.mjs"),
	routes: manifestRoutes,
	pageMap
});
//#endregion
//#region ../../node_modules/.pnpm/astro@7.2.2_@astrojs+markdown-remark@7.2.2_@emnapi+core@1.11.1_@emnapi+runtime@1.11.3_@_6bfadd3e3e54c3011e8b7da76cf02da3/node_modules/astro/dist/core/app/entrypoints/virtual/prod.js
var createApp$1 = ({ streaming } = {}) => {
	const app = new App(manifest, streaming);
	app.setFetchHandler(_virtual_astro_fetchable_default);
	return app;
};
//#endregion
//#region ../../node_modules/.pnpm/astro@7.2.2_@astrojs+markdown-remark@7.2.2_@emnapi+core@1.11.1_@emnapi+runtime@1.11.3_@_6bfadd3e3e54c3011e8b7da76cf02da3/node_modules/astro/dist/core/app/entrypoints/virtual/index.js
var createApp = createApp$1;
//#endregion
//#region ../../node_modules/.pnpm/@astrojs+internal-helpers@0.10.4/node_modules/@astrojs/internal-helpers/dist/request.js
function getFirstForwardedValue(multiValueHeader) {
	return multiValueHeader?.toString()?.split(",").map((e) => e.trim())?.[0];
}
var IP_RE = /^[0-9a-fA-F.:]{1,45}$/;
function isValidIpAddress(value) {
	return IP_RE.test(value);
}
function getValidatedIpFromHeader(headerValue) {
	const raw = getFirstForwardedValue(headerValue);
	if (raw && isValidIpAddress(raw)) return raw;
}
//#endregion
//#region ../../node_modules/.pnpm/@astrojs+cloudflare@14.2.3_@types+node@25.9.4_astro@7.2.2_@astrojs+markdown-remark@7.2._a03aab5eba31d05e6cae5f11ca597233/node_modules/@astrojs/cloudflare/dist/utils/cf-helpers.js
function matchStaticAsset(manifest, requestUrl, env) {
	const { pathname } = new URL(requestUrl);
	if (manifest.assets.has(pathname)) return env.ASSETS.fetch(requestUrl.replace(/\.html$/, ""));
}
async function fallbackToAssets(requestUrl, env) {
	const asset = await env.ASSETS.fetch(requestUrl.replace(/index.html$/, "").replace(/\.html$/, ""));
	if (asset.status !== 404) return asset;
}
function createErrorPageFetch(env) {
	return async (url) => {
		return env.ASSETS.fetch(url.replace(/\.html$/, ""));
	};
}
function createLocals(ctx) {
	const locals = { cfContext: ctx };
	Object.defineProperty(locals, "runtime", {
		enumerable: false,
		value: {
			get env() {
				throw new Error(`Astro.locals.runtime.env has been removed in Astro v6. Use 'import { env } from "cloudflare:workers"' instead.`);
			},
			get cf() {
				throw new Error(`Astro.locals.runtime.cf has been removed in Astro v6. Use 'Astro.request.cf' instead.`);
			},
			get caches() {
				throw new Error(`Astro.locals.runtime.caches has been removed in Astro v6. Use the global 'caches' object instead.`);
			},
			get ctx() {
				throw new Error(`Astro.locals.runtime.ctx has been removed in Astro v6. Use 'Astro.locals.cfContext' instead.`);
			}
		}
	});
	return locals;
}
function getClientAddress(request) {
	return getValidatedIpFromHeader(request.headers.get("cf-connecting-ip"));
}
//#endregion
//#region ../../node_modules/.pnpm/@astrojs+cloudflare@14.2.3_@types+node@25.9.4_astro@7.2.2_@astrojs+markdown-remark@7.2._a03aab5eba31d05e6cae5f11ca597233/node_modules/@astrojs/cloudflare/dist/utils/cf.js
function injectSessionBinding(manifest, env) {
	if (env["SESSION"]) {
		const sessionConfigOptions = manifest.sessionConfig?.options ?? {};
		Object.assign(sessionConfigOptions, { binding: env[sessionKVBindingName] });
	}
}
var app = createApp();
async function handle(request, env, context) {
	injectSessionBinding(app.manifest, env);
	const staticAsset = matchStaticAsset(app.manifest, request.url, env);
	if (staticAsset) return staticAsset;
	let routeData = void 0;
	if (app.isDev()) {
		const result = await app.devMatch(app.getPathnameFromRequest(request));
		if (result) routeData = result.routeData;
	} else routeData = app.match(request);
	if (!routeData) {
		const asset = await fallbackToAssets(request.url, env);
		if (asset) return asset;
	}
	const locals = createLocals(context);
	const waitUntil = context.waitUntil.bind(context);
	let response = await app.render(request, {
		routeData,
		locals,
		waitUntil,
		prerenderedErrorPageFetch: createErrorPageFetch(env),
		clientAddress: getClientAddress(request)
	});
	const setCookieHeaders = app.setCookieHeaders ? [...app.setCookieHeaders(response)] : [];
	if (setCookieHeaders.length > 0 || false) {
		const applyHeaders = (res) => {
			for (const setCookieHeader of setCookieHeaders) res.headers.append("Set-Cookie", setCookieHeader);
		};
		try {
			applyHeaders(response);
		} catch {
			response = new Response(response.body, response);
			applyHeaders(response);
		}
	}
	return response;
}
//#endregion
//#region \0virtual:cloudflare/worker-entry
var worker_entry_default = { fetch: handle };
//#endregion
export { worker_entry_default as default };
