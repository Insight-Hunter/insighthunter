import { html } from "hono/html";
import type { Env } from "../env.js";
import { loginUrl, signupUrl } from "./links.js";
import type { SeoMeta } from "./seo.js";

const NAV_ITEMS = [
  { href: "/features", label: "Features" },
  { href: "/pricing", label: "Pricing" },
  { href: "/addons", label: "Add-ons" },
  { href: "/about", label: "About" },
  { href: "/contact", label: "Contact" },
] as const;

const FOOTER_COLUMNS = [
  {
    title: "Product",
    links: [
      { href: "/features", label: "Features" },
      { href: "/pricing", label: "Pricing" },
      { href: "/addons", label: "Add-on Marketplace" },
      { href: "/security", label: "Security" },
    ],
  },
  {
    title: "Company",
    links: [
      { href: "/about", label: "About" },
      { href: "/contact", label: "Contact Sales" },
    ],
  },
  {
    title: "Resources",
    links: [
      { href: "/resources", label: "Resource Library" },
      { href: "/resources/saas-data-mining-guide", label: "SaaS Data Mining Guide" },
      {
        href: "/resources/predictive-analytics-directory",
        label: "Predictive Analytics Directory",
      },
    ],
  },
  {
    title: "Legal",
    links: [
      { href: "/legal/privacy", label: "Privacy Policy" },
      { href: "/legal/terms", label: "Terms of Service" },
    ],
  },
] as const;

export function renderPage(options: {
  env: Pick<Env, "AUTH_ORIGIN" | "APP_ORIGIN" | "CANONICAL_ORIGIN">;
  seo: SeoMeta;
  body: ReturnType<typeof html>;
  jsonLd?: string[];
}) {
  const { env, seo, body, jsonLd = [] } = options;
  const canonical = new URL(seo.path, env.CANONICAL_ORIGIN).toString();
  const login = loginUrl(env);
  const signup = signupUrl(env, "startup");

  return html`<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>${seo.title}</title>
<meta name="description" content="${seo.description}" />
<link rel="canonical" href="${canonical}" />
<meta name="robots" content="index, follow" />
<meta property="og:type" content="website" />
<meta property="og:title" content="${seo.title}" />
<meta property="og:description" content="${seo.description}" />
<meta property="og:url" content="${canonical}" />
<meta name="twitter:card" content="summary_large_image" />
${jsonLd.map((script) => html`<script type="application/ld+json">${script}</script>`)}
${styles}
<script src="/assets/site.js" defer></script>
</head>
<body>
<a class="skip-link" href="#main">Skip to content</a>
<header>
  <nav aria-label="Primary">
    <a class="logo" href="/" aria-label="Insight Hunter home">🔎 Insight Hunter</a>
    <button class="nav-toggle" id="nav-toggle" type="button" aria-expanded="false" aria-controls="nav-links">Menu</button>
    <ul class="nav-links" id="nav-links">
      ${NAV_ITEMS.map((item) => html`<li><a href="${item.href}">${item.label}</a></li>`)}
    </ul>
    <div class="nav-actions">
      <a href="${login}" class="btn btn-outline" rel="nofollow">Login to Command Center</a>
      <a href="${signup}" class="btn btn-primary" rel="nofollow">Start Free Trial</a>
    </div>
  </nav>
</header>
<main id="main">
${body}
</main>
<footer>
  <div class="footer-grid">
    ${FOOTER_COLUMNS.map(
      (column) => html`<div class="footer-col">
        <h2>${column.title}</h2>
        <ul>
          ${column.links.map((link) => html`<li><a href="${link.href}">${link.label}</a></li>`)}
        </ul>
      </div>`,
    )}
  </div>
  <p class="footer-legal">© ${new Date().getUTCFullYear()} Insight Hunter. All rights reserved.</p>
</footer>
</body>
</html>`;
}

const styles = html`<style>
  :root { color-scheme: dark; --brand: #22d3ee; --brand-dark: #0891b2; --bg: #0b1120; --card: #131c31; --text: #e6edf5; --muted: #93a2b8; --accent: #f59e0b; --border: #24304a; }
  *, *::before, *::after { box-sizing: border-box; }
  body { margin: 0; font-family: system-ui, -apple-system, "Segoe UI", sans-serif; background: var(--bg); color: var(--text); line-height: 1.6; }
  a { color: inherit; }
  .skip-link { position: absolute; left: -999px; top: 0; background: var(--brand); color: #04222a; padding: 0.75rem 1rem; z-index: 1000; }
  .skip-link:focus { left: 0.5rem; top: 0.5rem; }
  header { position: sticky; top: 0; z-index: 100; background: rgba(11, 17, 32, 0.95); backdrop-filter: blur(6px); border-bottom: 1px solid var(--border); }
  nav { display: flex; align-items: center; justify-content: space-between; gap: 1rem; max-width: 1200px; margin: 0 auto; padding: 0.9rem 1.5rem; flex-wrap: wrap; }
  .logo { font-weight: 800; font-size: 1.2rem; text-decoration: none; color: var(--text); }
  .nav-toggle { display: none; background: transparent; color: var(--text); border: 1px solid var(--border); border-radius: 8px; padding: 0.4rem 0.8rem; }
  .nav-links { display: flex; gap: 1.5rem; list-style: none; margin: 0; padding: 0; }
  .nav-links a { text-decoration: none; color: var(--muted); font-size: 0.95rem; }
  .nav-links a:hover, .nav-links a:focus-visible { color: var(--text); }
  .nav-actions { display: flex; gap: 0.75rem; }
  .btn { display: inline-block; padding: 0.55rem 1.2rem; border-radius: 8px; font-weight: 700; font-size: 0.9rem; text-decoration: none; border: 2px solid transparent; }
  .btn-primary { background: var(--brand); color: #04222a; }
  .btn-primary:hover, .btn-primary:focus-visible { background: var(--brand-dark); }
  .btn-outline { border-color: var(--brand); color: var(--brand); }
  .btn-outline:hover, .btn-outline:focus-visible { background: var(--brand); color: #04222a; }
  a:focus-visible, button:focus-visible { outline: 3px solid var(--accent); outline-offset: 2px; }
  main { max-width: 1200px; margin: 0 auto; padding: 0 1.5rem; }
  section { padding: 3.5rem 0; border-bottom: 1px solid var(--border); }
  section:last-of-type { border-bottom: none; }
  h1 { font-size: clamp(2rem, 4.5vw, 3.2rem); line-height: 1.1; margin: 0 0 1rem; }
  h2 { font-size: clamp(1.5rem, 3vw, 2rem); margin: 0 0 0.5rem; }
  h3 { font-size: 1.15rem; margin: 0 0 0.5rem; }
  p { color: var(--muted); margin: 0 0 1rem; }
  .lede { font-size: 1.15rem; max-width: 46rem; }
  .grid-3 { display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 1.5rem; }
  .card { background: var(--card); border: 1px solid var(--border); border-radius: 14px; padding: 1.75rem; }
  .hero-ctas { display: flex; gap: 1rem; flex-wrap: wrap; margin-top: 1.5rem; }
  .pricing-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(270px, 1fr)); gap: 1.5rem; }
  .price-card { position: relative; background: var(--card); border: 1px solid var(--border); border-radius: 16px; padding: 2rem; display: flex; flex-direction: column; }
  .price-card.featured { border-color: var(--brand); }
  .badge-ribbon { position: absolute; top: -0.75rem; left: 1.5rem; background: var(--brand); color: #04222a; font-size: 0.75rem; font-weight: 800; padding: 0.25rem 0.75rem; border-radius: 999px; text-transform: uppercase; letter-spacing: 0.04em; }
  .price { font-size: 2.4rem; font-weight: 900; margin: 0.5rem 0; }
  .price span { font-size: 1rem; color: var(--muted); font-weight: 500; }
  .price-features { list-style: none; margin: 1rem 0 1.5rem; padding: 0; flex: 1; }
  .price-features li { padding: 0.4rem 0; border-bottom: 1px solid var(--border); font-size: 0.92rem; }
  form { display: grid; gap: 1rem; max-width: 36rem; }
  label { display: grid; gap: 0.35rem; font-weight: 600; font-size: 0.9rem; }
  input, textarea { font: inherit; padding: 0.7rem; border-radius: 8px; border: 1px solid var(--border); background: #0f1729; color: var(--text); }
  textarea { min-height: 8rem; }
  .field-error { color: var(--accent); font-size: 0.85rem; }
  .honeypot { position: absolute; left: -9999px; width: 1px; height: 1px; overflow: hidden; }
  .alert { border-radius: 10px; padding: 1rem 1.25rem; margin-bottom: 1.5rem; }
  .alert-success { background: #0f2e21; border: 1px solid #1c7a4f; color: #7ee8b2; }
  .alert-error { background: #331414; border: 1px solid #7a2b2b; color: #f3a3a3; }
  footer { border-top: 1px solid var(--border); padding: 3rem 1.5rem 2rem; }
  .footer-grid { max-width: 1200px; margin: 0 auto; display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: 1.5rem; }
  .footer-col h2 { font-size: 0.85rem; text-transform: uppercase; letter-spacing: 0.05em; color: var(--muted); }
  .footer-col ul { list-style: none; margin: 0; padding: 0; display: grid; gap: 0.5rem; }
  .footer-col a { text-decoration: none; color: var(--text); font-size: 0.9rem; }
  .footer-col a:hover { color: var(--brand); }
  .footer-legal { max-width: 1200px; margin: 2rem auto 0; color: var(--muted); font-size: 0.8rem; text-align: center; }
  @media (max-width: 720px) {
    .nav-toggle { display: inline-block; }
    .nav-links { display: none; flex-direction: column; width: 100%; background: var(--bg); padding: 1rem 0; }
    .nav-links.open { display: flex; }
    .nav-actions { width: 100%; justify-content: stretch; }
    .nav-actions .btn { flex: 1; text-align: center; }
    .pricing-grid { grid-template-columns: 1fr; }
  }
</style>`;
