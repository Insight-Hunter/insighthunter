<!-- apps/insighthunter-lite/src/components/islands/DashboardMetrics.svelte -->
<script lang="ts">
  export let report: {
    current_cash: number; monthly_burn: number; runway_months: number;
    total_income: number; total_expenses: number; ai_summary: string;
    filename: string; row_count: number; created_at: string;
    data: { byCategory: Record<string, number>; forecast: any[] };
  };

  const fmt = (n: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n);

  const date = new Date(report.created_at).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric'
  });

  const net = report.total_income - report.total_expenses;
</script>

<div class="dashboard">
  <div class="sub-header">
    <span>Last upload: <strong>{report.filename}</strong> · {report.row_count} transactions · {date}</span>
    <a href="/upload" class="btn-upload">+ Upload New CSV</a>
  </div>

  <!-- Same 3-KPI layout as original Dashboard component -->
  <div class="metrics">
    <div class="metric-card">
      <div class="label">Current Cash</div>
      <div class="value" class:pos={report.current_cash >= 0} class:neg={report.current_cash < 0}>
        {fmt(report.current_cash)}
      </div>
    </div>
    <div class="metric-card">
      <div class="label">Monthly Burn</div>
      <div class="value neg">{fmt(Math.abs(report.monthly_burn))}</div>
    </div>
    <div class="metric-card">
      <div class="label">Runway</div>
      <div class="value"
        class:pos={report.runway_months > 6}
        class:warn={report.runway_months > 0 && report.runway_months <= 6}
        class:neg={report.runway_months === 0}
      >
        {report.runway_months > 0 ? `${report.runway_months.toFixed(1)} months` : 'N/A'}
      </div>
    </div>
    <div class="metric-card">
      <div class="label">Net P&L</div>
      <div class="value" class:pos={net >= 0} class:neg={net < 0}>{fmt(net)}</div>
    </div>
  </div>

  {#if report.ai_summary}
    <div class="ai-card">
      <h3>🤖 CFO Insights</h3>
      <pre>{report.ai_summary}</pre>
    </div>
  {/if}

  <div class="card">
    <h3>3-Month Forecast</h3>
    <table>
      <thead><tr><th>Period</th><th>Income</th><th>Expenses</th><th>Net</th></tr></thead>
      <tbody>
        {#each report.data.forecast as row}
          <tr>
            <td>{row.month}</td>
            <td class="pos">{fmt(row.income)}</td>
            <td class="neg">{fmt(row.expenses)}</td>
            <td class:pos={row.net >= 0} class:neg={row.net < 0}>{fmt(row.net)}</td>
          </tr>
        {/each}
      </tbody>
    </table>
  </div>
</div>

<style>
  .sub-header  { display:flex; justify-content:space-between; align-items:center; margin-bottom:1.5rem; font-size:.875rem; color:#6b7280; }
  .btn-upload  { background:#007aff; color:#fff; padding:.5rem 1rem; border-radius:8px; text-decoration:none; font-size:.875rem; font-weight:500; }
  .metrics     { display:grid; grid-template-columns:repeat(auto-fit,minmax(160px,1fr)); gap:1rem; margin-bottom:1.5rem; }
  .metric-card { background:#f7f7f7; padding:1.5rem; border-radius:8px; text-align:center; }
  .label       { font-size:1rem; font-weight:500; margin-bottom:.5rem; }
  .value       { font-size:2rem; font-weight:700; }
  .pos         { color:#059669; }
  .neg         { color:#dc2626; }
  .warn        { color:#d97706; }
  .ai-card     { background:#fffbeb; border:1px solid #fcd34d; border-radius:10px; padding:1.25rem; margin-bottom:1.5rem; }
  .ai-card h3  { margin:0 0 .75rem; font-size:1rem; }
  .ai-card pre { white-space:pre-wrap; font-family:inherit; font-size:.9rem; margin:0; }
  .card        { background:#fff; border-radius:8px; padding:1.5rem; box-shadow:0 1px 3px rgba(0,0,0,.1); }
  .card h3     { font-size:1.1rem; font-weight:600; margin:0 0 1rem; }
  table        { width:100%; border-collapse:collapse; }
  th,td        { padding:.65rem .75rem; text-align:right; border-bottom:1px solid #dcdfe3; font-size:.875rem; }
  th           { background:#f7f7f7; font-weight:600; color:#374151; }
  th:first-child, td:first-child { text-align:left; }
</style>