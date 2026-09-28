import { html } from "hono/html";

export function resourcesIndexBody() {
  return html`
<section>
  <h1>Resource Library</h1>
  <p class="lede">Practical guides on bookkeeping, cash-flow planning, financial reporting, and small-business operations.</p>
</section>
<section aria-labelledby="resources-list-heading">
  <h2 id="resources-list-heading">Guides</h2>
  <div class="grid-3">
    <div class="card">
      <h3><a href="/resources/saas-data-mining-guide">A practical guide to financial data</a></h3>
      <p>Turn bookkeeping activity into useful context for cash, margin, and operating decisions.</p>
    </div>
    <div class="card">
      <h3><a href="/resources/predictive-analytics-directory">Cash-flow forecasting basics</a></h3>
      <p>Understand the inputs and assumptions behind a practical cash-flow forecast.</p>
    </div>
  </div>
</section>
`;
}

export function saasDataMiningGuideBody() {
  return html`
<section>
  <h1>Make financial data useful for the next decision</h1>
  <p class="lede">A practical introduction to connecting organized bookkeeping with reporting and small-business operating decisions.</p>
</section>
<section aria-labelledby="why-heading">
  <h2 id="why-heading">Start with reliable bookkeeping</h2>
  <p>Useful financial insight starts with consistent records. Keep transactions categorized, reconcile accounts on a regular cadence, and make sure the reporting period and assumptions are clear before comparing performance.</p>
</section>
<section aria-labelledby="signals-heading">
  <h2 id="signals-heading">Questions worth tracking</h2>
  <ul>
    <li>How much cash is available today and what is already committed?</li>
    <li>Which revenue and expense movements explain margin changes?</li>
    <li>How do upcoming obligations compare with expected cash receipts?</li>
    <li>Which forecast assumptions changed since the last review?</li>
  </ul>
</section>
<section aria-labelledby="next-heading">
  <h2 id="next-heading">Next Step</h2>
  <p><a href="/pricing">Explore Insight Hunter plans</a> for bookkeeping, reporting, and cash-flow visibility.</p>
</section>
`;
}

export function predictiveAnalyticsDirectoryBody() {
  return html`
<section>
  <h1>Cash-flow forecasting basics</h1>
  <p class="lede">A reference for building a useful forecast, checking assumptions, and keeping expected inflows and outflows visible.</p>
</section>
<section aria-labelledby="capabilities-heading">
  <h2 id="capabilities-heading">A practical forecast checklist</h2>
  <ul>
    <li>Start with a clear forecast horizon and opening cash balance</li>
    <li>Separate expected receipts from confirmed receipts</li>
    <li>Include recurring obligations and known one-time costs</li>
    <li>Review actuals against assumptions and update the forecast</li>
  </ul>
</section>
<section aria-labelledby="addons-heading">
  <h2 id="addons-heading">Keep the assumptions visible</h2>
  <p>A forecast is a planning tool, not a guarantee. Insight Hunter helps teams review current records alongside forward-looking estimates. <a href="/addons">Explore optional business modules</a>.</p>
</section>
`;
}
