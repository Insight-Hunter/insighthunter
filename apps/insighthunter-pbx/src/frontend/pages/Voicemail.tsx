export function VoicemailPage(): string {
  return `
    <div class="ih-page-content">
      <section class="ih-grid ih-grid-2">
        <article class="ih-card">
          <div class="ih-card-heading"><h3>Mailbox coverage</h3><span class="ih-badge success">12 configured</span></div>
          <ul class="ih-list">
            <li>Main company mailbox — transcript to general office and task queue.</li>
            <li>Billing mailbox — transcript to billing inbox, 45-day retention.</li>
            <li>Support East mailbox — after-hours callback task creation enabled.</li>
            <li>Executive line mailbox — no transcript, restricted access only.</li>
          </ul>
        </article>

        <article class="ih-card">
          <div class="ih-card-heading"><h3>Recent voicemails</h3><span class="ih-badge info">3 unread</span></div>
          <div class="ih-message-stack">
            <div class="ih-message inbound"><span class="ih-message-meta">Billing mailbox · 2 min ago</span><p>Caller requested payment plan call-back tomorrow morning.</p></div>
            <div class="ih-message inbound"><span class="ih-message-meta">Support East · 11 min ago</span><p>Customer reports service outage and asked for emergency dispatch.</p></div>
          </div>
        </article>
      </section>
    </div>
  `;
}
