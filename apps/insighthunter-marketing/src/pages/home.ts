import { html } from "hono/html";
import type { Env } from "../env.js";
import { signupUrl } from "../lib/links.js";

export function homeBody(env: Pick<Env, "AUTH_ORIGIN">) {
  return html`
<section class="hero">
  <p class="lede" style="color:var(--brand);font-weight:700;text-transform:uppercase;letter-spacing:0.08em;font-size:0.85rem;">SaaS Market Intelligence Platform</p>
  <h1>Hunt Down Hidden Market Opportunities with Automated SaaS Intelligence.</h1>
  <p class="lede">Insight Hunter replaces manual research with 24/7 autonomous data mining &mdash; automated data mining software that scans markets, competitors, and demand signals around the clock so your team can act on predictive market trends tool insights the moment they surface.</p>
  <div class="hero-ctas">
    <a class="btn btn-primary" style="padding:0.9rem 1.8rem;font-size:1rem;" href="#pricing">Explore Subscription Plans</a>
    <a class="btn btn-outline" style="padding:0.9rem 1.8rem;font-size:1rem;" href="/features#demo">Watch 2-Min Demo</a>
  </div>
  <p style="margin-top:2rem;color:var(--muted);font-size:0.9rem;">Trusted by 4,000+ data teams hunting market opportunities every day.</p>
</section>

<section aria-labelledby="capabilities-heading">
  <h2 id="capabilities-heading">Core Capabilities</h2>
  <p class="lede">A business insight generator built for teams who need a competitor intelligence dashboard, not another spreadsheet.</p>
  <div class="grid-3">
    <div class="card">
      <h3>Autonomous Trend Hunting</h3>
      <p>Real-time algorithmic market scanning uncovers emerging demand before it shows up in your competitors' roadmaps.</p>
    </div>
    <div class="card">
      <h3>Competitor Anomalies</h3>
      <p>Immediate alerts the moment a competitor changes pricing, positioning, or messaging strategy.</p>
    </div>
    <div class="card">
      <h3>Predictive Demand Scopes</h3>
      <p>Forward-looking consumer intent mapping so you can plan launches around demand that hasn't peaked yet.</p>
    </div>
  </div>
</section>

<section id="proof" aria-labelledby="proof-heading">
  <h2 id="proof-heading">Trusted By Teams Who Ship</h2>
  <blockquote class="card" style="font-style:italic;">
    &ldquo;Insight Hunter helped our product team uncover a hidden search trend, resulting in a 34% increase in organic revenue within 30 days.&rdquo;
    <footer style="margin-top:1rem;color:var(--muted);font-style:normal;">&mdash; Head of Growth, mid-market SaaS company</footer>
  </blockquote>
</section>

<section id="pricing" aria-labelledby="home-pricing-heading">
  <h2 id="home-pricing-heading">Simple, Transparent Pricing</h2>
  <p class="lede">Pick the tier that matches your team, then add data modules as you grow. See full details on the <a href="/pricing">pricing page</a>.</p>
  <div class="hero-ctas">
    <a class="btn btn-primary" href="${signupUrl(env, "startup")}" rel="nofollow">Start Free Trial</a>
    <a class="btn btn-outline" href="/pricing">Compare Plans</a>
  </div>
</section>
`;
}
