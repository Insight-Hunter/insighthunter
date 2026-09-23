import { html } from "hono/html";

export function featuresBody() {
  return html`
<section>
  <h1>Features Built for Market Intelligence</h1>
  <p class="lede">Everything you need to replace manual competitive research with an automated data mining software pipeline.</p>
</section>

<section aria-labelledby="feature-list-heading">
  <h2 id="feature-list-heading">What's Inside Insight Hunter</h2>
  <div class="grid-3">
    <div class="card">
      <h3>Autonomous Trend Hunting</h3>
      <p>Always-on scanning of public market signals, surfaced as ranked opportunities in your dashboard.</p>
    </div>
    <div class="card">
      <h3>Competitor Anomalies</h3>
      <p>Alerts the moment a tracked competitor changes pricing, positioning, or go-to-market strategy.</p>
    </div>
    <div class="card">
      <h3>Predictive Demand Scopes</h3>
      <p>Forward-looking demand mapping so roadmap and marketing decisions are based on where the market is heading.</p>
    </div>
    <div class="card">
      <h3>Historical Data Vault</h3>
      <p>Five-plus years of archived trend history available as an add-on for deep longitudinal analysis.</p>
    </div>
    <div class="card">
      <h3>Advanced API Pipeline</h3>
      <p>Direct webhook access so custom CRMs and internal tools can react to signals in real time.</p>
    </div>
    <div class="card">
      <h3>Niche Industry Data Packs</h3>
      <p>Curated micro-market datasets for teams that need depth beyond the core feed.</p>
    </div>
  </div>
</section>

<section id="demo" aria-labelledby="demo-heading">
  <h2 id="demo-heading">See It In Action</h2>
  <p class="lede">Request a walkthrough of the platform with our team, or jump straight into a free trial.</p>
  <div class="hero-ctas">
    <a class="btn btn-primary" href="/pricing">Explore Subscription Plans</a>
    <a class="btn btn-outline" href="/contact">Talk to Sales</a>
  </div>
</section>
`;
}
