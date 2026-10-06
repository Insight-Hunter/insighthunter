export function AutomationsPage(): string {
  return `
    <div class="ih-page-content">
      <section class="ih-card">
        <div class="ih-card-heading"><h3>Automation library</h3><span class="ih-badge success">9 active rules</span></div>
        <table class="ih-table">
          <thead><tr><th>Rule</th><th>Trigger</th><th>Action</th><th>Status</th></tr></thead>
          <tbody>
            <tr><td>Missed-call text back</td><td>Call missed during open hours</td><td>Send branded SMS + callback link</td><td>Active</td></tr>
            <tr><td>Overdue invoice reminder</td><td>Finance event from billing module</td><td>Text + assign billing follow-up</td><td>Active</td></tr>
            <tr><td>After-hours intake</td><td>Voicemail received</td><td>Create task + next-day SMS</td><td>Active</td></tr>
          </tbody>
        </table>
      </section>
    </div>
  `;
}
