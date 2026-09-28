import { html } from "hono/html";
import type { Env } from "../env.js";
import { loginUrl, signupUrl } from "./links.js";
import type { SeoMeta } from "./seo.js";

const NAV_ITEMS = [
  { href: "/features#bookkeeping", label: "Bookkeeping" },
  { href: "/features#payroll", label: "Payroll" },
  { href: "/features#reports", label: "Reports" },
  { href: "/features#insights", label: "Insights" },
  { href: "/features#bizforma", label: "BizForma" },
  { href: "/features#pbx", label: "PBX" },
  { href: "/pricing", label: "Pricing" },
] as const;

const FOOTER_COLUMNS = [
  {
    title: "Product",
    links: [
      { href: "/features", label: "All modules" },
      { href: "/pricing", label: "Pricing" },
      { href: "/addons", label: "Add-on marketplace" },
      { href: "/security", label: "Security and isolation" },
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
      { href: "/resources", label: "Bookkeeping and cash-flow guides" },
      { href: "/resources/saas-data-mining-guide", label: "Financial data guide" },
    ],
  },
  {
    title: "Legal",
    links: [
      { href: "/legal/privacy", label: "Privacy Policy" },
      { href: "/legal/terms", label: "Terms of Service" },
      { href: "/legal/privacy#cookies", label: "Cookies" },
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
<meta name="theme-color" content="#0B0F14" />
<meta property="og:type" content="website" />
<meta property="og:title" content="${seo.title}" />
<meta property="og:description" content="${seo.description}" />
<meta property="og:url" content="${canonical}" />
<meta name="twitter:card" content="summary_large_image" />
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=Public+Sans:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500;600&display=swap" />
${jsonLd.map((script) => html`<script type="application/ld+json">${script}</script>`)}
${styles}
<script src="/assets/site.js" defer></script>
</head>
<body>
<a class="skip-link" href="#main">Skip to content</a>
<header>
  <nav aria-label="Primary">
    <a class="logo" href="/" aria-label="Insight Hunter home"><span class="logo-mark" aria-hidden="true">IH</span><span>Insight Hunter</span></a>
    <button class="nav-toggle" id="nav-toggle" type="button" aria-expanded="false" aria-controls="nav-links" aria-label="Toggle navigation">Menu</button>
    <ul class="nav-links" id="nav-links">
      ${NAV_ITEMS.map((item) => html`<li><a href="${item.href}">${item.label}</a></li>`)}
    </ul>
    <div class="nav-actions">
      <a href="${login}" class="login-link" rel="nofollow">Log in</a>
      <a href="${signup}" class="btn btn-primary nav-cta" rel="nofollow">Start free</a>
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
  <div class="footer-bottom"><span>© ${new Date().getUTCFullYear()} Insight Hunter. All rights reserved.</span><a href="${login}" rel="nofollow" class="command-login">Command Center login <span aria-hidden="true">&rarr;</span></a></div>
</footer>
</body>
</html>`;
}

const styles = html`<style>
  :root { color-scheme: dark; --paper: #0B0F14; --panel: #161D28; --ink: #E9EDF3; --ink-soft: #A9B4C4; --amber: #00F0C8; --moss: #5FA8FF; --clay: #FF6B6B; --radius: 6px; --line: rgba(233,237,243,.11); --font-display: 'Instrument Serif', Georgia, serif; --font-body: 'Public Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; --font-mono: 'IBM Plex Mono', ui-monospace, monospace; }
  *, *::before, *::after { box-sizing: border-box; }
  html { scroll-behavior: smooth; scroll-padding-top: 6rem; }
  body { margin: 0; background: var(--paper); color: var(--ink); font-family: var(--font-body); line-height: 1.65; }
  a { color: inherit; text-underline-offset: .2em; }
  .mono, .eyebrow, .btn, .nav-links, .login-link { font-family: var(--font-mono); }
  .skip-link { position: absolute; left: -999px; top: 0; z-index: 1000; background: var(--amber); color: var(--paper); padding: .75rem 1rem; }
  .skip-link:focus { left: .5rem; top: .5rem; }
  header { position: sticky; top: 0; z-index: 100; border-bottom: 1px solid var(--line); background: rgba(11,15,20,.92); backdrop-filter: blur(16px); }
  nav { max-width: 1440px; min-height: 76px; margin: 0 auto; padding: .8rem clamp(1rem,3vw,3rem); display: flex; align-items: center; justify-content: space-between; gap: 1.5rem; }
  .logo { display: inline-flex; align-items: center; gap: .7rem; color: var(--ink); font-weight: 700; text-decoration: none; white-space: nowrap; }
  .logo-mark { display: grid; place-items: center; width: 2rem; height: 2rem; border: 1px solid var(--amber); color: var(--amber); font: 600 .7rem var(--font-mono); }
  .nav-toggle { display: none; }
  .nav-links { display: flex; align-items: center; gap: clamp(.6rem,1.4vw,1.3rem); list-style: none; margin: 0; padding: 0; }
  .nav-links a, .login-link { color: var(--ink-soft); font-size: .68rem; text-decoration: none; white-space: nowrap; }
  .nav-links a:hover, .login-link:hover { color: var(--amber); }
  .nav-actions { display: flex; align-items: center; gap: 1rem; }
  .btn { display: inline-flex; align-items: center; justify-content: center; min-height: 2.9rem; padding: .65rem 1rem; border: 1px solid transparent; border-radius: var(--radius); font-size: .72rem; font-weight: 600; text-decoration: none; transition: transform .18s ease, background .18s ease; }
  .btn:hover { transform: translateY(-2px); }
  .btn-primary { background: var(--amber); color: var(--paper); }
  .btn-primary:hover { background: #6FFFE0; }
  .btn-outline { border-color: rgba(233,237,243,.28); color: var(--ink); }
  .btn-outline:hover { border-color: var(--moss); color: var(--moss); }
  a:focus-visible, button:focus-visible, input:focus-visible { outline: 2px solid var(--amber); outline-offset: 3px; }
  main { max-width: 1440px; margin: 0 auto; padding: 0 clamp(1rem,3vw,3rem); }
  section { padding: clamp(3.5rem,8vw,7rem) 0; border-bottom: 1px solid var(--line); }
  section:last-of-type { border-bottom: 0; }
  h1, h2, h3 { color: var(--ink); }
  h1, h2 { font-family: var(--font-display); font-weight: 400; letter-spacing: -.025em; }
  h1 { max-width: 15ch; font-size: clamp(2.7rem,6vw,5.6rem); line-height: .98; margin: 0 0 1.5rem; }
  h2 { font-size: clamp(2rem,4vw,3.4rem); line-height: 1.03; margin: 0 0 1rem; }
  h3 { font-size: 1.1rem; line-height: 1.35; margin: .75rem 0; }
  p { color: var(--ink-soft); margin: 0 0 1rem; }
  .eyebrow { color: var(--amber); font-size: .65rem; font-weight: 500; letter-spacing: .16em; text-transform: uppercase; }
  .lede { max-width: 57ch; font-size: clamp(1rem,1.5vw,1.18rem); }
  .hero { border-bottom: 0; }
  .hero-split { min-height: min(760px, calc(100vh - 76px)); display: grid; grid-template-columns: minmax(0,1fr) minmax(360px,.9fr); align-items: center; gap: clamp(2rem,6vw,6rem); padding-top: clamp(4rem,8vw,7rem); padding-bottom: clamp(4rem,8vw,7rem); }
  .hero-copy h1 { max-width: 13ch; font-size: clamp(2.6rem,5.1vw,5rem); }
  .hero-copy .lede { max-width: 55ch; }
  .hero-ctas { display: flex; flex-wrap: wrap; gap: .8rem; margin: 1.8rem 0 1.2rem; }
  .hero-note { color: var(--ink-soft); font-size: .62rem; letter-spacing: .06em; }
  .hero-visual { position: relative; min-height: 420px; display: grid; place-items: center; isolation: isolate; }
  .hero-visual::before { position: absolute; z-index: -1; width: 80%; height: 80%; border-radius: 50%; background: radial-gradient(circle,rgba(0,240,200,.12),rgba(95,168,255,.08) 45%,transparent 72%); content: ''; filter: blur(12px); }
  .hero-chart { width: 100%; padding: 1rem; border: 1px solid var(--line); background: linear-gradient(145deg,rgba(22,29,40,.96),rgba(12,18,26,.78)); box-shadow: 0 30px 90px rgba(0,0,0,.38); }
  .hero-chart svg { display: block; width: 100%; overflow: visible; }
  .chart-grid path { fill: none; stroke: rgba(233,237,243,.1); stroke-width: 1; }
  .chart-line { fill: none; stroke: url(#hero-line); stroke-width: 4; stroke-linecap: round; stroke-dasharray: 900; stroke-dashoffset: 900; animation: draw-line 1.7s ease-out forwards; }
  .visual-caption { margin: .25rem 0 0; color: var(--ink-soft); font-size: .56rem; letter-spacing: .12em; text-align: right; }
  .metric-card { position: absolute; display: grid; gap: .1rem; min-width: 120px; padding: .75rem .9rem; border: 1px solid rgba(233,237,243,.16); background: rgba(22,29,40,.88); backdrop-filter: blur(12px); box-shadow: 0 12px 30px rgba(0,0,0,.32); }
  .metric-card span, .metric-card small { color: var(--ink-soft); font: .52rem var(--font-mono); letter-spacing: .08em; }
  .metric-card strong { color: var(--ink); font: 500 1rem var(--font-mono); }
  .metric-card small { font-size: .48rem; text-transform: uppercase; }
  .metric-mrr { top: 9%; left: -2%; }
  .metric-runway { right: -4%; bottom: 19%; }
  .metric-cash { top: 45%; left: 7%; }
  @keyframes draw-line { to { stroke-dashoffset: 0; } }
  .section-heading { max-width: 54rem; margin-bottom: 2.5rem; }
  .capability-layout { display: grid; grid-template-columns: 1.15fr .85fr; gap: 1rem; }
  .capability-card { position: relative; min-height: 240px; padding: clamp(1.4rem,3vw,2.3rem); border: 1px solid var(--line); background: var(--panel); }
  .capability-card:nth-child(3n) { background: linear-gradient(135deg,rgba(95,168,255,.1),transparent 65%),var(--panel); }
  .capability-featured { grid-row: span 2; min-height: 500px; display: flex; flex-direction: column; justify-content: flex-end; background: radial-gradient(ellipse at 75% 15%,rgba(0,240,200,.13),transparent 48%),var(--panel); }
  .capability-index { color: var(--moss); font-size: .6rem; letter-spacing: .1em; }
  .capability-card h3 { max-width: 18ch; font: 400 clamp(1.6rem,2.6vw,2.3rem)/1.1 var(--font-display); }
  .capability-card p { max-width: 48ch; font-size: .9rem; }
  .capability-card a { display: inline-flex; gap: .5rem; margin-top: .7rem; color: var(--amber); font: .64rem var(--font-mono); text-decoration: none; }
  .feature-layout { grid-template-columns: repeat(2,minmax(0,1fr)); margin-top: 2rem; }
  .feature-layout .capability-card, .feature-layout .capability-featured { grid-row: auto; min-height: 230px; }
  .feature-layout .capability-advisory { grid-column: 1/-1; min-height: 180px; border-color: rgba(0,240,200,.38); }
  .edge-section { display: grid; grid-template-columns: .85fr 1fr; gap: 4rem; align-items: end; }
  .edge-section .lede { margin-bottom: 0; }
  .proof-section { display: grid; grid-template-columns: .8fr 1fr; gap: clamp(2rem,8vw,8rem); align-items: center; }
  .proof-disclaimer { max-width: 38ch; font-size: .76rem; }
  .proof-stage { padding: clamp(1.5rem,4vw,3rem); border-left: 1px solid var(--amber); background: linear-gradient(110deg,rgba(0,240,200,.06),transparent 80%); }
  .proof-item { margin: 0; }
  .proof-item p { color: var(--ink); font: 400 clamp(1.5rem,3vw,2.5rem)/1.1 var(--font-display); }
  .proof-item footer { padding: 0; border: 0; color: var(--moss); font: .58rem var(--font-mono); text-transform: uppercase; letter-spacing: .1em; }
  .proof-controls { display: flex; align-items: center; gap: .85rem; margin-top: 2rem; color: var(--ink-soft); font: .6rem var(--font-mono); }
  .proof-controls button { width: 2rem; height: 2rem; border: 1px solid var(--line); background: transparent; color: var(--ink); cursor: pointer; }
  .closing-cta { display: flex; align-items: center; justify-content: space-between; gap: 2rem; border-bottom: 0; }
  .closing-cta h2 { max-width: 18ch; }
  .grid-3 { display: grid; grid-template-columns: repeat(auto-fit,minmax(240px,1fr)); gap: 1rem; }
  .card { padding: 1.5rem; border: 1px solid var(--line); background: var(--panel); }
  .pricing-grid { display: grid; grid-template-columns: repeat(3,minmax(0,1fr)); gap: 1rem; align-items: stretch; margin-top: 2rem; }
  .price-card { position: relative; display: flex; flex-direction: column; padding: clamp(1.5rem,3vw,2.25rem); border: 1px solid var(--line); background: var(--panel); }
  .price-card.featured { border-color: var(--amber); background: linear-gradient(160deg,rgba(0,240,200,.08),transparent 48%),var(--panel); }
  .badge-ribbon { position: absolute; top: 0; right: 0; padding: .45rem .75rem; background: var(--amber); color: var(--paper); font: .55rem var(--font-mono); letter-spacing: .07em; text-transform: uppercase; }
  .price-card h3 { font: 400 2rem var(--font-display); }
  .price { margin: .5rem 0; color: var(--ink); font: 400 clamp(2.4rem,4vw,3.5rem)/1 var(--font-display); }
  .price span { color: var(--ink-soft); font: .68rem var(--font-mono); }
  .price-note { min-height: 1.2rem; color: var(--moss); font: .55rem var(--font-mono); }
  .price-features { flex: 1; margin: 1rem 0 1.5rem; padding: 0; list-style: none; }
  .price-features li { padding: .7rem 0; border-bottom: 1px solid var(--line); color: var(--ink-soft); font-size: .82rem; }
  .billing-control { display: flex; align-items: center; justify-content: center; gap: .35rem; margin: 1.5rem auto 0; padding: .3rem; border: 1px solid var(--line); }
  .billing-control button { border: 0; padding: .55rem .8rem; background: transparent; color: var(--ink-soft); font: .62rem var(--font-mono); cursor: pointer; }
  .billing-control button[aria-pressed="true"] { background: var(--panel); color: var(--amber); }
  .billing-savings { color: var(--amber); font: .55rem var(--font-mono); }
  .pricing-note { margin-top: 1.5rem; text-align: center; }
  .pricing-note a { color: var(--amber); }
  .addon-list { display: grid; grid-template-columns: repeat(2,minmax(0,1fr)); gap: 1rem; }
  .addon-card { display: grid; grid-template-columns: auto 1fr; gap: 1rem; align-items: start; padding: 1.35rem; border: 1px solid var(--line); background: var(--panel); cursor: pointer; }
  .addon-card input { accent-color: var(--amber); }
  .addon-card h3 { margin-top: 0; }
  .addon-price { color: var(--ink); font: .75rem var(--font-mono); }
  .addon-summary { display: flex; flex-wrap: wrap; gap: 1rem 2rem; align-items: center; margin-top: 1.5rem; padding: 1.25rem 0; border-top: 1px solid var(--line); }
  .addon-summary strong { color: var(--amber); font: 1.2rem var(--font-mono); }
  .addon-disclaimer { font-size: .72rem; }
  form { display: grid; gap: 1rem; max-width: 36rem; }
  label { display: grid; gap: .35rem; font-weight: 600; font-size: .9rem; }
  input, textarea { font: inherit; padding: .7rem; border: 1px solid var(--line); border-radius: var(--radius); background: #0f1720; color: var(--ink); }
  textarea { min-height: 8rem; }
  .field-error { color: var(--clay); font-size: .85rem; }
  .honeypot { position: absolute; left: -9999px; width: 1px; height: 1px; overflow: hidden; }
  .alert { padding: 1rem 1.25rem; margin-bottom: 1.5rem; border-radius: var(--radius); }
  .alert-success { border: 1px solid #1c7a4f; background: #0f2e21; color: #7ee8b2; }
  .alert-error { border: 1px solid #7a2b2b; background: #331414; color: #f3a3a3; }
  footer { padding: 3.5rem clamp(1rem,3vw,3rem) 1.4rem; border-top: 1px solid var(--line); background: #090d11; }
  .footer-grid { max-width: 1440px; margin: 0 auto; display: grid; grid-template-columns: repeat(4,minmax(0,1fr)); gap: 2rem; }
  .footer-col h2 { margin-bottom: .9rem; color: var(--ink-soft); font: .58rem var(--font-mono); letter-spacing: .12em; text-transform: uppercase; }
  .footer-col ul { display: grid; gap: .6rem; margin: 0; padding: 0; list-style: none; }
  .footer-col a { color: var(--ink-soft); font-size: .78rem; text-decoration: none; }
  .footer-col a:hover { color: var(--amber); }
  .footer-bottom { max-width: 1440px; display: flex; justify-content: space-between; gap: 1rem; margin: 2.5rem auto 0; padding-top: 1.1rem; border-top: 1px solid var(--line); color: var(--ink-soft); font: .58rem var(--font-mono); }
  .command-login { color: var(--amber); text-decoration: none; }
  @media (max-width: 1120px) { .nav-links { gap: .65rem; } .nav-links a { font-size: .56rem; } .nav-actions { gap: .6rem; } .nav-cta { padding-inline: .7rem; } }
  @media (max-width: 900px) { nav { flex-wrap: wrap; } .nav-toggle { display: inline-flex; order: 3; border: 1px solid var(--line); padding: .5rem .7rem; background: transparent; color: var(--ink); font: .6rem var(--font-mono); } .nav-links { display: none; order: 4; flex: 1 0 100%; flex-wrap: wrap; padding: .6rem 0; } .nav-links.open { display: flex; } .nav-links a { font-size: .63rem; } .nav-actions { margin-left: auto; } .hero-split { grid-template-columns: 1fr; } .hero-visual { width: min(100%,620px); margin: 0 auto; } .capability-layout { grid-template-columns: 1fr 1fr; } .capability-featured { grid-row: auto; min-height: 300px; } .proof-section { grid-template-columns: 1fr; gap: 1rem; } }
  @media (max-width: 650px) { .hero-visual { min-height: 300px; } .metric-card { min-width: 90px; padding: .55rem; } .metric-card strong { font-size: .78rem; } .metric-mrr { left: -1%; } .metric-cash { left: 0; top: 54%; } .metric-runway { right: -1%; bottom: 9%; } .capability-layout,.feature-layout,.pricing-grid,.addon-list { grid-template-columns: 1fr; } .feature-layout .capability-advisory { grid-column: auto; } .capability-featured { min-height: 250px; } .edge-section { grid-template-columns: 1fr; gap: 1rem; } .closing-cta { align-items: flex-start; flex-direction: column; } .footer-grid { grid-template-columns: repeat(2,minmax(0,1fr)); gap: 1.5rem 1rem; } .footer-bottom { flex-direction: column; } }
  @media (prefers-reduced-motion: reduce) { *,*::before,*::after { scroll-behavior: auto !important; animation-duration: .01ms !important; animation-iteration-count: 1 !important; transition-duration: .01ms !important; } }
</style>`;
