import { html } from "hono/html";

export function resourcesIndexBody() {
  return html`
<section>
  <h1>Resource Library</h1>
  <p class="lede">Guides and directories on SaaS market intelligence, automated data mining, and predictive analytics.</p>
</section>
<section aria-labelledby="resources-list-heading">
  <h2 id="resources-list-heading">Guides</h2>
  <div class="grid-3">
    <div class="card">
      <h3><a href="/resources/saas-data-mining-guide">SaaS Data Mining Guide</a></h3>
      <p>How automated data mining software finds market opportunities before your competitors do.</p>
    </div>
    <div class="card">
      <h3><a href="/resources/predictive-analytics-directory">Predictive Analytics Directory</a></h3>
      <p>A reference for evaluating predictive market trends tools and the signals they track.</p>
    </div>
  </div>
</section>
`;
}

export function saasDataMiningGuideBody() {
  return html`
<section>
  <h1>SaaS Data Mining Guide</h1>
  <p class="lede">A practical primer on automated data mining software for SaaS teams evaluating a market intelligence platform.</p>
</section>
<section aria-labelledby="why-heading">
  <h2 id="why-heading">Why Automate Data Mining</h2>
  <p>Manual competitive research does not scale past a handful of tracked competitors or markets. Automated data mining software continuously scans public signals &mdash; pricing pages, changelogs, review sites, and search trends &mdash; and turns them into ranked, actionable alerts instead of a weekly spreadsheet update.</p>
</section>
<section aria-labelledby="signals-heading">
  <h2 id="signals-heading">Signals Worth Tracking</h2>
  <ul>
    <li>Pricing and packaging changes</li>
    <li>New feature announcements and changelog activity</li>
    <li>Search demand shifts for category keywords</li>
    <li>Review sentiment and win/loss language</li>
  </ul>
</section>
<section aria-labelledby="next-heading">
  <h2 id="next-heading">Next Step</h2>
  <p><a href="/pricing">See how Insight Hunter automates this</a> across your tracked markets.</p>
</section>
`;
}

export function predictiveAnalyticsDirectoryBody() {
  return html`
<section>
  <h1>Predictive Analytics Directory</h1>
  <p class="lede">A reference for evaluating a predictive market trends tool, including the buy market data add-ons worth considering.</p>
</section>
<section aria-labelledby="capabilities-heading">
  <h2 id="capabilities-heading">Capabilities to Evaluate</h2>
  <ul>
    <li>Forward-looking demand mapping, not just historical dashboards</li>
    <li>Alerting on anomalies, not only scheduled reports</li>
    <li>API access for feeding signals into internal tools</li>
    <li>Depth add-ons for niche or vertical-specific markets</li>
  </ul>
</section>
<section aria-labelledby="addons-heading">
  <h2 id="addons-heading">Buy Market Data Add-ons</h2>
  <p>Insight Hunter's <a href="/addons">add-on marketplace</a> covers historical data vaults, API pipelines, and niche industry data packs so you only pay for the depth you need.</p>
</section>
`;
}
