export function TeamPage(): string {
  return `
    <div class="ih-page-content">
      <section class="ih-card">
        <div class="ih-card-heading"><h3>Extensions and staffing</h3><span class="ih-badge info">18 active users</span></div>
        <table class="ih-table">
          <thead><tr><th>User</th><th>Department</th><th>Extension</th><th>Direct DID</th><th>Status</th></tr></thead>
          <tbody>
            <tr><td>Dana Patel</td><td>Billing</td><td>221</td><td>+1 (470) 555-0171</td><td>Available</td></tr>
            <tr><td>Chris Long</td><td>Sales</td><td>110</td><td>+1 (470) 555-0181</td><td>On call</td></tr>
            <tr><td>Rosa Green</td><td>Support East</td><td>341</td><td>—</td><td>Available</td></tr>
          </tbody>
        </table>
      </section>
    </div>
  `;
}
