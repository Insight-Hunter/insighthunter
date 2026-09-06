import { Hono } from "hono";
import { html } from "hono/html";
import type { Env } from "./env.js";
import { CLIENT_SCRIPT } from "./lib/client-script.js";
import { renderPage } from "./lib/layout.js";
import { recordLead } from "./lib/leads.js";
import { clientKeyFrom, isRateLimited } from "./lib/rate-limit.js";
import { requestLog, securityHeaders } from "./lib/security.js";
import { addOnsProductJsonLd, softwareApplicationJsonLd } from "./lib/seo.js";
import { validateContactForm } from "./lib/validate.js";
import { aboutBody } from "./pages/about.js";
import { addonsBody } from "./pages/addons.js";
import { contactBody } from "./pages/contact.js";
import { featuresBody } from "./pages/features.js";
import { homeBody } from "./pages/home.js";
import { privacyBody, termsBody } from "./pages/legal.js";
import { pricingBody } from "./pages/pricing.js";
import {
  predictiveAnalyticsDirectoryBody,
  resourcesIndexBody,
  saasDataMiningGuideBody,
} from "./pages/resources.js";
import { securityBody } from "./pages/security.js";

const app = new Hono<{ Bindings: Env }>();

app.use("*", requestLog());
app.use("*", securityHeaders());

app.get("/", (c) =>
  c.html(
    renderPage({
      env: c.env,
      seo: {
        title: "Insight Hunter — SaaS Market Intelligence Platform",
        description:
          "Automated data mining software and predictive market trends tool for teams who need a competitor intelligence dashboard, not a spreadsheet.",
        path: "/",
      },
      jsonLd: [softwareApplicationJsonLd(c.env.CANONICAL_ORIGIN)],
      body: homeBody(c.env),
    }),
  ),
);

app.get("/features", (c) =>
  c.html(
    renderPage({
      env: c.env,
      seo: {
        title: "Features — Insight Hunter",
        description:
          "Autonomous trend hunting, competitor anomaly alerts, and predictive demand scopes.",
        path: "/features",
      },
      body: featuresBody(),
    }),
  ),
);

app.get("/pricing", (c) =>
  c.html(
    renderPage({
      env: c.env,
      seo: {
        title: "Pricing — Insight Hunter",
        description: "Scout, Hunter, and Apex plans for automated SaaS market intelligence.",
        path: "/pricing",
      },
      jsonLd: [softwareApplicationJsonLd(c.env.CANONICAL_ORIGIN)],
      body: pricingBody(c.env),
    }),
  ),
);

app.get("/addons", (c) =>
  c.html(
    renderPage({
      env: c.env,
      seo: {
        title: "Add-on Marketplace — Insight Hunter",
        description:
          "Buy market data add-ons: historical data vault, advanced API pipeline, and niche industry data packs.",
        path: "/addons",
      },
      jsonLd: [addOnsProductJsonLd(c.env.CANONICAL_ORIGIN)],
      body: addonsBody(),
    }),
  ),
);

app.get("/about", (c) =>
  c.html(
    renderPage({
      env: c.env,
      seo: {
        title: "About — Insight Hunter",
        description: "The team behind Insight Hunter.",
        path: "/about",
      },
      body: aboutBody(),
    }),
  ),
);

app.get("/security", (c) =>
  c.html(
    renderPage({
      env: c.env,
      seo: {
        title: "Security — Insight Hunter",
        description:
          "How the Insight Hunter public site stays isolated from tenant data and credentials.",
        path: "/security",
      },
      body: securityBody(),
    }),
  ),
);

app.get("/resources", (c) =>
  c.html(
    renderPage({
      env: c.env,
      seo: {
        title: "Resource Library — Insight Hunter",
        description: "Guides on SaaS data mining and predictive analytics.",
        path: "/resources",
      },
      body: resourcesIndexBody(),
    }),
  ),
);

app.get("/resources/saas-data-mining-guide", (c) =>
  c.html(
    renderPage({
      env: c.env,
      seo: {
        title: "SaaS Data Mining Guide — Insight Hunter",
        description: "How automated data mining software finds market opportunities.",
        path: "/resources/saas-data-mining-guide",
      },
      body: saasDataMiningGuideBody(),
    }),
  ),
);

app.get("/resources/predictive-analytics-directory", (c) =>
  c.html(
    renderPage({
      env: c.env,
      seo: {
        title: "Predictive Analytics Directory — Insight Hunter",
        description: "A directory for evaluating predictive market trends tools and data add-ons.",
        path: "/resources/predictive-analytics-directory",
      },
      body: predictiveAnalyticsDirectoryBody(),
    }),
  ),
);

app.get("/legal/privacy", (c) =>
  c.html(
    renderPage({
      env: c.env,
      seo: {
        title: "Privacy Policy — Insight Hunter",
        description: "Insight Hunter marketing site privacy policy.",
        path: "/legal/privacy",
      },
      body: privacyBody(),
    }),
  ),
);

app.get("/legal/terms", (c) =>
  c.html(
    renderPage({
      env: c.env,
      seo: {
        title: "Terms of Service — Insight Hunter",
        description: "Insight Hunter marketing site terms of service.",
        path: "/legal/terms",
      },
      body: termsBody(),
    }),
  ),
);

app.get("/contact", (c) =>
  c.html(
    renderPage({
      env: c.env,
      seo: {
        title: "Contact Sales — Insight Hunter",
        description: "Get in touch with the Insight Hunter team.",
        path: "/contact",
      },
      body: contactBody({}),
    }),
  ),
);

app.post("/contact", async (c) => {
  const form = await c.req.formData();
  const result = validateContactForm(form);

  // Bots that trip the honeypot are rejected immediately without touching
  // the rate limiter (so they can't burn through a shared client's, e.g.
  // NAT/office network, legitimate submission budget) and are shown the same
  // success response as a real submission so detection logic isn't signaled
  // back to the automated script.
  if (result.bot) {
    return c.html(
      renderPage({
        env: c.env,
        seo: {
          title: "Contact Sales — Insight Hunter",
          description: "Get in touch with the Insight Hunter team.",
          path: "/contact",
        },
        body: contactBody({ success: true }),
      }),
    );
  }

  const clientKey = clientKeyFrom(c.req.raw);
  if (await isRateLimited(c.env, clientKey)) {
    c.status(429);
    return c.html(
      renderPage({
        env: c.env,
        seo: {
          title: "Contact Sales — Insight Hunter",
          description: "Get in touch with the Insight Hunter team.",
          path: "/contact",
        },
        body: contactBody({ rateLimited: true }),
      }),
    );
  }

  if (!result.ok) {
    c.status(422);
    return c.html(
      renderPage({
        env: c.env,
        seo: {
          title: "Contact Sales — Insight Hunter",
          description: "Get in touch with the Insight Hunter team.",
          path: "/contact",
        },
        body: contactBody({ errors: result.errors, value: result.value }),
      }),
    );
  }

  // Persisted to LEADS (see lib/leads.ts) so the success message below is
  // accurate — the submission is held for sales follow-up rather than
  // discarded. Request logging still only records
  // method/path/status/duration (see lib/security.ts), never form contents.
  await recordLead(c.env, result.value);

  return c.html(
    renderPage({
      env: c.env,
      seo: {
        title: "Contact Sales — Insight Hunter",
        description: "Get in touch with the Insight Hunter team.",
        path: "/contact",
      },
      body: contactBody({ success: true }),
    }),
  );
});

app.get("/assets/site.js", (c) => {
  c.header("Content-Type", "text/javascript; charset=utf-8");
  c.header("Cache-Control", "public, max-age=3600");
  return c.body(CLIENT_SCRIPT);
});

app.get("/robots.txt", (c) => {
  c.header("Content-Type", "text/plain; charset=utf-8");
  return c.body(
    `User-agent: *\nAllow: /\nSitemap: ${new URL("/sitemap.xml", c.env.CANONICAL_ORIGIN).toString()}\n`,
  );
});

const STATIC_ROUTES = [
  "/",
  "/features",
  "/pricing",
  "/addons",
  "/about",
  "/security",
  "/contact",
  "/resources",
  "/resources/saas-data-mining-guide",
  "/resources/predictive-analytics-directory",
  "/legal/privacy",
  "/legal/terms",
];

app.get("/sitemap.xml", (c) => {
  const urls = STATIC_ROUTES.map(
    (path) => html`<url><loc>${new URL(path, c.env.CANONICAL_ORIGIN).toString()}</loc></url>`,
  );
  c.header("Content-Type", "application/xml; charset=utf-8");
  return c.body(
    `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls.join("")}</urlset>`,
  );
});

app.get("/health", (c) => c.json({ status: "ok", app: "marketing", ts: Date.now() }));

app.notFound((c) => {
  c.status(404);
  return c.html(
    renderPage({
      env: c.env,
      seo: {
        title: "Page Not Found — Insight Hunter",
        description: "This page could not be found.",
        path: "/404",
      },
      body: html`<section><h1>Page Not Found</h1><p class="lede">The page you're looking for doesn't exist. <a href="/">Return home</a>.</p></section>`,
    }),
  );
});

export default app;
