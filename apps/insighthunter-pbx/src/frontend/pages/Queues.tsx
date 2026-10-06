export function QueuesPage(): string {
  return `
    <div class="ih-page-content">
      <section class="ih-grid ih-grid-2">
        <article class="ih-card">
          <div class="ih-card-heading"><h3>Department queues</h3><span class="ih-badge info">6 active</span></div>
          <table class="ih-table compact">
            <thead><tr><th>Queue</th><th>Strategy</th><th>Staffed</th><th>Wait</th></tr></thead>
            <tbody>
              <tr><td>Billing</td><td>Round robin</td><td>4 / 5</td><td>02:18</td></tr>
              <tr><td>Support East</td><td>Least idle</td><td>6 / 6</td><td>01:51</td></tr>
              <tr><td>Sales</td><td>Skills</td><td>3 / 4</td><td>00:42</td></tr>
            </tbody>
          </table>
        </article>

        <article class="ih-card">
          <div class="ih-card-heading"><h3>Escalation rules</h3><span class="ih-badge warning">2 active</span></div>
          <ul class="ih-list">
            <li>Billing over 150 seconds → overflow to backup team, then voicemail.</li>
            <li>Support East over 180 seconds → callback capture + SMS acknowledgement.</li>
            <li>Sales missed during open hours → missed-call text + CRM lead task.</li>
          </ul>
        </article>
      </section>
    </div>
  `;
}
