export function ReportsPage(): string {
  return `
    <div class="ih-page-content">
      <section class="ih-grid ih-grid-3">
        <article class="ih-card ih-stat"><span class="ih-label">SMS deliverability</span><strong>98.9%</strong><p>STOP rate 0.4%, carrier blocks trending down.</p></article>
        <article class="ih-card ih-stat"><span class="ih-label">AI containment</span><strong>38%</strong><p>Calls resolved without human transfer.</p></article>
        <article class="ih-card ih-stat"><span class="ih-label">PBX gross profit</span><strong>$4,812</strong><p>Month to date after Twilio and AI variable costs.</p></article>
      </section>

      <section class="ih-card">
        <div class="ih-card-heading"><h3>What to chart next</h3><span class="ih-badge info">Frontend ready</span></div>
        <ul class="ih-list">
          <li>Queue wait trend by department and business hour block.</li>
          <li>Call volume versus staffing coverage by extension pool.</li>
          <li>Vendor cost versus billable usage by meter type.</li>
          <li>AI receptionist containment, escalation reason, and callback outcome.</li>
        </ul>
      </section>
    </div>
  `;
}
