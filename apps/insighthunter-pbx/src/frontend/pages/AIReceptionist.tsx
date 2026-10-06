export function AIReceptionistPage(): string {
  return `
    <div class="ih-page-content">
      <section class="ih-grid ih-grid-2">
        <article class="ih-card">
          <div class="ih-card-heading"><h3>Receptionist policy</h3><span class="ih-badge success">Published</span></div>
          <ul class="ih-list">
            <li>Allowed intents: sales, support, billing, appointment, urgent issue, operator.</li>
            <li>Max call turns: 8, max AI duration: 240 seconds.</li>
            <li>Low confidence path: route to operator queue or voicemail.</li>
            <li>After-hours path: collect intake, offer voicemail, send SMS confirmation.</li>
          </ul>
        </article>

        <article class="ih-card">
          <div class="ih-card-heading"><h3>Live session design</h3><span class="ih-badge info">Guardrailed</span></div>
          <div class="ih-flow-board compact">
            <div class="ih-flow-node"><strong>Greeting</strong><span>Brand intro + recording notice</span></div>
            <div class="ih-flow-node"><strong>Fast path</strong><span>Extension, VIP, urgent keyword</span></div>
            <div class="ih-flow-node accent"><strong>Structured intake</strong><span>Name, reason, urgency, callback, consent</span></div>
            <div class="ih-flow-node"><strong>Route</strong><span>Queue, extension, voicemail, SMS follow-up</span></div>
          </div>
        </article>
      </section>
    </div>
  `;
}
