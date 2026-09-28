import { html } from "hono/html";
import type { Env } from "../env.js";
import { signupUrl } from "../lib/links.js";

export function homeBody(env: Pick<Env, "AUTH_ORIGIN">) {
  return html`
<section class="hero hero-split">
  <div class="hero-copy">
    <p class="eyebrow">Cloudflare Edge intelligence, always on.</p>
    <h1>Hunt down business insights in finance and customer movements with automated SaaS intelligence, served with Cloudflare Edge computing.</h1>
    <p class="lede">Insight Hunter turns raw transactions into real-time answers &mdash; margin, runway, and cash position, updated the moment they happen, not the moment your bookkeeper gets around to it.</p>
    <div class="hero-ctas">
      <a class="btn btn-primary" href="${signupUrl(env, "startup")}" rel="nofollow">Start free &mdash; no card required</a>
      <a class="btn btn-outline" href="/features">Explore the platform</a>
    </div>
    <p class="hero-note mono">Built for small-business finance workflows. Your team stays in control.</p>
  </div>
  <div class="hero-visual" aria-label="Illustrative financial dashboard visualization">
    <div class="hero-chart" aria-hidden="true">
      <svg viewBox="0 0 640 420" role="img" aria-label="Illustrative upward financial trend line">
        <defs><linearGradient id="hero-line" x1="0" x2="1"><stop offset="0%" stop-color="#00F0C8"/><stop offset="100%" stop-color="#5FA8FF"/></linearGradient></defs>
        <g class="chart-grid"><path d="M32 90H608M32 170H608M32 250H608M32 330H608"/></g>
        <path class="chart-line" d="M42 316 C110 300 120 253 190 266 S265 206 320 219 S395 151 450 171 S530 108 598 74"/>
        <circle cx="598" cy="74" r="6" fill="#00F0C8"/>
      </svg>
      <p class="visual-caption mono">SAMPLE VIEW &middot; ILLUSTRATIVE DATA</p>
    </div>
    <div class="metric-card metric-mrr"><span>MRR</span><strong>$48,210</strong><small>Illustrative</small></div>
    <div class="metric-card metric-runway"><span>RUNWAY</span><strong>14 mo</strong><small>Illustrative</small></div>
    <div class="metric-card metric-cash"><span>CASH TODAY</span><strong>$212,400</strong><small>Illustrative</small></div>
  </div>
</section>

<section id="services" aria-labelledby="capabilities-heading">
  <div class="section-heading">
    <p class="eyebrow">From transactions to next steps</p>
    <h2 id="capabilities-heading">One operating picture. The tools to act on it.</h2>
    <p class="lede">Bring finance workflows and everyday business services into a clearer rhythm&mdash;without suggesting software replaces your professional advisors.</p>
  </div>
  <div class="capability-layout">
    <article class="capability-card capability-featured">
      <span class="capability-index mono">01 / FINANCE</span>
      <h3>Bookkeeping that keeps moving</h3>
      <p>Continuous ledger sync and organized transactions keep your view current, without waiting on an overnight batch.</p>
      <a href="/features">Explore the finance workflow <span aria-hidden="true">&rarr;</span></a>
    </article>
    <article class="capability-card">
      <span class="capability-index mono">02 / REPORTING</span>
      <h3>Reports made for decisions</h3>
      <p>Build a useful view of P&amp;L, cash flow, and forecasts with recurring reporting workflows.</p>
      <a href="/features">See reporting features <span aria-hidden="true">&rarr;</span></a>
    </article>
    <article class="capability-card">
      <span class="capability-index mono">03 / OPERATIONS</span>
      <h3>Support around the work</h3>
      <p>Connect payroll, business formation and compliance support, and PBX phone, voicemail, SMS, and automessages.</p>
      <a href="/addons">Browse modules and add-ons <span aria-hidden="true">&rarr;</span></a>
    </article>
  </div>
</section>

<section class="edge-section" aria-labelledby="edge-heading">
  <div><p class="eyebrow">Always-on infrastructure</p><h2 id="edge-heading">Fast by design. Clear about what the edge does.</h2></div>
  <p class="lede">Cloudflare Workers run the web experience on distributed infrastructure. Insight Hunter turns your authorized business data into operating context; the edge is the delivery layer, not a substitute for financial advice.</p>
</section>

<section class="proof-section" aria-labelledby="proof-heading" data-carousel>
  <div><p class="eyebrow">A clearer close, a steadier plan</p><h2 id="proof-heading">Designed around the moments that matter.</h2><p class="proof-disclaimer">Illustrative workflows, not customer testimonials or performance guarantees.</p></div>
  <div class="proof-stage" aria-live="polite">
    <blockquote class="proof-item is-active" data-proof-item><p>&ldquo;See the cash-flow gap while there is still time to plan for it.&rdquo;</p><footer>Cash-flow planning scenario</footer></blockquote>
    <blockquote class="proof-item" data-proof-item hidden><p>&ldquo;Close the books with fewer disconnected reports to reconcile.&rdquo;</p><footer>Month-end bookkeeping scenario</footer></blockquote>
    <blockquote class="proof-item" data-proof-item hidden><p>&ldquo;Bring margin, runway, and customer movement into one conversation.&rdquo;</p><footer>Owner reporting scenario</footer></blockquote>
    <div class="proof-controls"><button type="button" data-proof-prev aria-label="Previous scenario">&larr;</button><span data-proof-count>01 / 03</span><button type="button" data-proof-next aria-label="Next scenario">&rarr;</button></div>
  </div>
</section>

<section class="closing-cta" aria-labelledby="closing-heading"><div><p class="eyebrow">Start with the essentials</p><h2 id="closing-heading">Make the next financial decision with a clearer view.</h2></div><a class="btn btn-primary" href="${signupUrl(env, "startup")}" rel="nofollow">Start free &mdash; no card required</a></section>
`;
}
