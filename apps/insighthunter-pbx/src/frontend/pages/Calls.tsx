export function CallsPage(): string {
  return `
    <div class="ih-page-content">
      <section class="ih-grid ih-grid-3">
        <article class="ih-card ih-stat"><span class="ih-label">Active calls</span><strong>11</strong><p>3 in support, 2 in billing, 6 on direct extensions.</p></article>
        <article class="ih-card ih-stat"><span class="ih-label">Average wait</span><strong>01:42</strong><p>Target is under 90 seconds during business hours.</p></article>
        <article class="ih-card ih-stat tone-success"><span class="ih-label">Answer rate</span><strong>94.2%</strong><p>Warm transfers are improving first-contact resolution.</p></article>
      </section>

      <section class="ih-card">
        <div class="ih-card-heading">
          <h3>Recent calls</h3>
          <span class="ih-badge info">CDR view</span>
        </div>
        <table class="ih-table">
          <thead>
            <tr><th>Caller</th><th>Route</th><th>Outcome</th><th>Duration</th><th>AI</th><th>Recording</th></tr>
          </thead>
          <tbody>
            <tr><td>+1 404 555 0188</td><td>Main DID → AI → Billing</td><td>Answered by Dana P.</td><td>07:12</td><td>Escalated</td><td>Stored</td></tr>
            <tr><td>+1 678 555 0155</td><td>Sales queue</td><td>Voicemail left</td><td>00:49</td><td>Skipped</td><td>Stored</td></tr>
            <tr><td>+1 770 555 0129</td><td>Support East</td><td>Missed → SMS auto follow-up</td><td>00:21</td><td>Contained</td><td>None</td></tr>
          </tbody>
        </table>
      </section>
    </div>
  `;
}
