export function SettingsPage(): string {
  return `
    <div class="ih-page-content">
      <section class="ih-grid ih-grid-2">
        <article class="ih-card">
          <div class="ih-card-heading"><h3>Compliance settings</h3><span class="ih-badge warning">Review quarterly</span></div>
          <ul class="ih-list">
            <li>Recording notice enabled on all inbound billing and support queues.</li>
            <li>STOP / HELP / START keyword handling active on all messaging numbers.</li>
            <li>Voicemail retention: 45 days; executive mailbox exempt from transcription.</li>
            <li>Quiet hours automation enabled 8 PM to 8 AM local time.</li>
          </ul>
        </article>

        <article class="ih-card">
          <div class="ih-card-heading"><h3>System integrations</h3><span class="ih-badge success">Connected</span></div>
          <ul class="ih-list">
            <li>Twilio account and messaging service connected.</li>
            <li>Insight Hunter auth worker connected for tenant-scoped sessions.</li>
            <li>Billing export enabled for monthly invoice line items.</li>
            <li>Analytics pipeline active for SLA, usage, and margin metrics.</li>
          </ul>
        </article>
      </section>
    </div>
  `;
}
