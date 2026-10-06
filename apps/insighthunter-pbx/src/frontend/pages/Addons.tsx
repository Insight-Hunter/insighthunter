export function AddonsPage(): string {
  return `
    <div class="ih-page-content">
      <section class="ih-grid ih-grid-3">
        <article class="ih-card"><div class="ih-card-heading"><h3>Virtual mailbox</h3><span class="ih-badge info">Partner</span></div><p>Business address, mail scans, forwarding, and ops review workflow.</p></article>
        <article class="ih-card"><div class="ih-card-heading"><h3>Package forwarding</h3><span class="ih-badge warning">Manual ops</span></div><p>Tenant-request workflow with billable handling and shipping pass-through.</p></article>
        <article class="ih-card"><div class="ih-card-heading"><h3>Freight referrals</h3><span class="ih-badge info">Future</span></div><p>Lead handoff into partner carriers or broker network with fee tracking.</p></article>
      </section>
    </div>
  `;
}
