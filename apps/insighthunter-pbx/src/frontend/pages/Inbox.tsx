export function InboxPage(): string {
  return `
    <div class="ih-page-content">
      <section class="ih-grid ih-grid-sidebar">
        <article class="ih-card">
          <div class="ih-card-heading">
            <h3>Shared inbox</h3>
            <span class="ih-badge info">SMS + MMS</span>
          </div>
          <div class="ih-thread-list">
            <button class="ih-thread is-active">
              <strong>Marley Construction</strong>
              <span>Payment reminder replied: “Call me after 2.”</span>
              <small>Assigned to Billing · 2m ago</small>
            </button>
            <button class="ih-thread">
              <strong>First Choice Dental</strong>
              <span>Inbound photo attachment received.</span>
              <small>Support queue · 6m ago</small>
            </button>
            <button class="ih-thread">
              <strong>Maria Thompson</strong>
              <span>STOP received on review request campaign.</span>
              <small>Compliance review · 14m ago</small>
            </button>
          </div>
        </article>

        <article class="ih-card">
          <div class="ih-card-heading">
            <h3>Conversation detail</h3>
            <span class="ih-badge success">Open</span>
          </div>
          <div class="ih-message-stack">
            <div class="ih-message inbound">
              <span class="ih-message-meta">Customer · 1:11 PM</span>
              <p>I saw the invoice text. Can your team call after 2 PM?</p>
            </div>
            <div class="ih-message outbound">
              <span class="ih-message-meta">Automation · 1:12 PM</span>
              <p>Absolutely. I have flagged this for the billing desk and added your preferred callback time.</p>
            </div>
            <div class="ih-message note">
              <span class="ih-message-meta">Internal note</span>
              <p>Send to East billing team, high-value commercial account, balance over 45 days.</p>
            </div>
          </div>
          <div class="ih-composer">
            <textarea placeholder="Reply, insert template, or add internal note..."></textarea>
            <div class="ih-hero-actions">
              <button class="ih-button ghost">Insert template</button>
              <button class="ih-button primary">Send message</button>
            </div>
          </div>
        </article>
      </section>
    </div>
  `;
}
