import { html } from "hono/html";

export function featuresBody() {
  return html`
<section>
  <p class="eyebrow">A connected finance workflow</p>
  <h1>Financial operations, organized around the decisions you make.</h1>
  <p class="lede">Insight Hunter brings bookkeeping, recurring reports, cash-flow context, and service modules into one practical operating picture.</p>
</section>

<section aria-labelledby="feature-list-heading">
  <h2 id="feature-list-heading">The connected capabilities</h2>
  <div class="capability-layout feature-layout">
    <article id="bookkeeping" class="capability-card capability-featured"><span class="capability-index mono">01 / BOOKKEEPING</span><h3>Continuous ledger sync</h3><p>Keep transaction activity moving into an organized ledger without waiting for an overnight batch job.</p></article>
    <article id="reports" class="capability-card"><span class="capability-index mono">02 / REPORTS</span><h3>Financial reporting</h3><p>Prepare recurring P&amp;L, cash-flow, and forecast views for owners and advisors.</p></article>
    <article id="insights" class="capability-card"><span class="capability-index mono">03 / INSIGHTS</span><h3>Operating context</h3><p>Connect movement in margin, cash, and customer activity to questions worth investigating.</p></article>
    <article id="payroll" class="capability-card"><span class="capability-index mono">04 / PAYROLL</span><h3>Payroll workflows</h3><p>Choose a tier that fits your operations, with a platform designed to support partner and white-label delivery.</p></article>
    <article id="bizforma" class="capability-card"><span class="capability-index mono">05 / BIZFORMA</span><h3>Formation and compliance</h3><p>Organize business-formation steps and ongoing compliance support in one guided workflow.</p></article>
    <article id="pbx" class="capability-card"><span class="capability-index mono">06 / PBX</span><h3>Business communications</h3><p>Bring phone, voicemail, SMS, and automessages into a dedicated communications hub.</p></article>
    <article class="capability-card capability-advisory"><span class="capability-index mono">07 / OPTIONAL ADVISORY</span><h3>AI CFO assistance</h3><p>Automated advisory insights can help frame questions and scenarios. They support&mdash;not replace&mdash;qualified professional judgment.</p></article>
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
