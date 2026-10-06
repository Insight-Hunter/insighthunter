export function CallFlowsPage(): string {
  return `
    <div class="ih-page-content">
      <section class="ih-card">
        <div class="ih-card-heading">
          <h3>Call flow designer</h3>
          <span class="ih-badge warning">Draft + published versions</span>
        </div>
        <div class="ih-flow-board">
          <div class="ih-flow-node"><strong>Inbound DID</strong><span>Main number +1 (470) 555-0110</span></div>
          <div class="ih-flow-node"><strong>Schedule check</strong><span>Business hours, holiday override, emergency flag</span></div>
          <div class="ih-flow-node accent"><strong>AI receptionist</strong><span>Intent capture, caller name, reason, urgency</span></div>
          <div class="ih-flow-node"><strong>Queue transfer</strong><span>Billing / Sales / Support / Operator</span></div>
          <div class="ih-flow-node"><strong>Fallback</strong><span>Voicemail + callback request + SMS follow-up</span></div>
        </div>
      </section>
    </div>
  `;
}
