function statCard(label: string, value: string, note: string, tone: "default" | "success" | "warning" = "default"): string {
  return `
    <article class="ih-card ih-stat ${tone !== "default" ? `tone-${tone}` : ""}">
      <span class="ih-label">${label}</span>
      <strong>${value}</strong>
      <p>${note}</p>
    </article>
  `;
}

export function HomePage(): string {
  const stats = [
    statCard("Open conversations", "148", "22 awaiting reply, 8 escalated to billing."),
    statCard("Today's answered calls", "92%", "268 answered, 21 missed-call texts sent.", "success"),
    statCard("Queue pressure", "2 queues", "Support East and Billing exceed target hold times.", "warning"),
    statCard("Projected PBX gross margin", "61.4%", "After Twilio usage and transcription cost."),
  ].join("");

  return `
    <div class="ih-page-content">
      <section class="ih-hero-card">
        <div>
          <span class="ih-badge info">Live control plane</span>
          <h3>Run calls, messaging, routing, AI intake, and usage billing from one module.</h3>
          <p>
            This frontend is structured for Insight Hunter operators and tenants to manage voice, SMS/MMS,
            automations, receptionist logic, and finance-aware communications workflows.
          </p>
        </div>
        <div class="ih-hero-actions">
          <button class="ih-button primary">Launch AI receptionist editor</button>
          <button class="ih-button secondary">View Twilio event stream</button>
        </div>
      </section>

      <section class="ih-grid ih-grid-4">${stats}</section>

      <section class="ih-grid ih-grid-2">
        <article class="ih-card">
          <div class="ih-card-heading">
            <h4>Live operational alerts</h4>
            <span class="ih-badge warning">Needs review</span>
          </div>
          <ul class="ih-list">
            <li>Billing queue overflow branch used 14 times in the last hour.</li>
            <li>Twilio transcription retry pending for 3 voicemails.</li>
            <li>One DID is still unassigned after provisioning.</li>
            <li>After-hours routing policy missing holiday override for Dec. 24.</li>
          </ul>
        </article>

        <article class="ih-card">
          <div class="ih-card-heading">
            <h4>Tenant setup completion</h4>
            <span class="ih-badge success">89% done</span>
          </div>
          <div class="ih-progress-block">
            <div><span>Numbers provisioned</span><strong>12 / 12</strong></div>
            <div><span>Queues staffed</span><strong>6 / 7</strong></div>
            <div><span>Voicemail greetings</span><strong>10 / 12</strong></div>
            <div><span>AI intent packs</span><strong>7 / 9</strong></div>
          </div>
        </article>
      </section>
    </div>
  `;
}
