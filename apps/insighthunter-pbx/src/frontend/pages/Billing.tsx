export function BillingPage(): string {
  return `
    <div class="ih-page-content">
      <section class="ih-grid ih-grid-3">
        <article class="ih-card ih-stat"><span class="ih-label">Plan MRR</span><strong>$399</strong><p>PBX Pro with AI receptionist and automation bundle.</p></article>
        <article class="ih-card ih-stat"><span class="ih-label">Usage overage</span><strong>$182.44</strong><p>Voice, SMS, MMS, and transcription over included bucket.</p></article>
        <article class="ih-card ih-stat tone-success"><span class="ih-label">Vendor cost</span><strong>$227.91</strong><p>Twilio + transcription + storage for current month.</p></article>
      </section>

      <section class="ih-card">
        <div class="ih-card-heading"><h3>Rating controls</h3><span class="ih-badge warning">Finance-aware</span></div>
        <ul class="ih-list">
          <li>Inbound voice minute markup: 18%.</li>
          <li>Outbound SMS segment markup: 22% with plan discount.</li>
          <li>AI receptionist minute billed only after included allowance is exhausted.</li>
          <li>Number rental passes through vendor cost plus fixed platform fee.</li>
        </ul>
      </section>
    </div>
  `;
}
