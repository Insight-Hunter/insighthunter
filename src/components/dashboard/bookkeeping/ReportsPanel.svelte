<script lang="ts">
  import { onMount } from 'svelte';

  export let token: string;
  const API = '/api/bookkeeping';

  type ReportType = 'pl' | 'balance-sheet' | 'trial-balance';
  let activeReport: ReportType = 'pl';

  const now = new Date();
  let fromDate = `${now.getFullYear()}-01-01`;
  let toDate   = now.toISOString().slice(0, 10);
  let asOfDate = toDate;

  let loading = false;
  let data: Record<string, unknown> | null = null;
  let error = '';

  async function load() {
    loading = true; error = ''; data = null;
    try {
      let url = '';
      if (activeReport === 'pl')
        url = `${API}/reports/pl?from=${fromDate}&to=${toDate}`;
      else if (activeReport === 'balance-sheet')
        url = `${API}/reports/balance-sheet?as_of=${asOfDate}`;
      else
        url = `${API}/reports/trial-balance?as_of=${asOfDate}`;

      const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) throw new Error(`Error ${res.status}`);
      data = await res.json();
    } catch (e) {
      error = e instanceof Error ? e.message : 'Failed to load report';
    } finally {
      loading = false;
    }
  }

  onMount(load);

  function fmt(n: number) {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n ?? 0);
  }

  function switchReport(r: ReportType) { activeReport = r; load(); }

  interface PLData {
    period: { from: string; to: string };
    revenue: LineItem[]; expenses: LineItem[];
    totalRevenue: number; totalExpenses: number; netIncome: number;
  }
  interface BSData {
    as_of: string;
    assets: LineItem[]; liabilities: LineItem[]; equity: LineItem[];
    totalAssets: number; totalLiabilities: number; totalEquity: number; balanced: boolean;
  }
  interface TBData {
    as_of: string;
    rows: TBRow[];
  }
  interface LineItem { code: string | null; name: string; amount: number; }
  interface TBRow   { code: string | null; name: string; type: string; total_debit: number; total_credit: number; balance: number; }

  function exportCSV() {
    if (!data) return;
    let csv = '';
    if (activeReport === 'trial-balance') {
      const tb = data as unknown as TBData;
      csv = 'Code,Name,Type,Debit,Credit,Balance\n';
      csv += (tb.rows ?? []).map((r) =>
        `${r.code ?? ''},${r.name},${r.type},${r.total_debit},${r.total_credit},${r.balance}`
      ).join('\n');
    } else if (activeReport === 'pl') {
      const pl = data as unknown as PLData;
      csv = 'Section,Code,Name,Amount\n';
      (pl.revenue ?? []).forEach((r) => { csv += `Revenue,${r.code ?? ''},${r.name},${r.amount}\n`; });
      (pl.expenses ?? []).forEach((r) => { csv += `Expense,${r.code ?? ''},${r.name},${r.amount}\n`; });
    }
    const blob = new Blob([csv], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `${activeReport}-${toDate}.csv`;
    a.click();
  }
</script>

<div class="reports-panel">
  <!-- Report type selector -->
  <div class="report-tabs">
    {#each [['pl','P&L'], ['balance-sheet','Balance Sheet'], ['trial-balance','Trial Balance']] as [id, label]}
      <button class="rtab" class:active={activeReport === id}
              on:click={() => switchReport(id as ReportType)}>
        {label}
      </button>
    {/each}
  </div>

  <!-- Date controls -->
  <div class="date-controls">
    {#if activeReport === 'pl'}
      <label>From <input type="date" bind:value={fromDate} /></label>
      <label>To <input type="date" bind:value={toDate} /></label>
    {:else}
      <label>As of <input type="date" bind:value={asOfDate} /></label>
    {/if}
    <button class="btn-run" on:click={load}>Run Report</button>
    {#if data}
      <button class="btn-export" on:click={exportCSV}>⬇ CSV</button>
    {/if}
  </div>

  {#if loading}
    <div class="state-msg">Generating report…</div>
  {:else if error}
    <div class="state-msg error">{error}</div>
  {:else if data}

    <!-- P&L -->
    {#if activeReport === 'pl'}
      {@const pl = data as unknown as PLData}
      <div class="
    <!-- P&L Report -->
    {#if activeReport === 'pl'}
      {@const pl = data as unknown as PLData}
      <div class="report-section">
        <h3 class="section-title">Revenue</h3>
        {#each pl.revenue as row}
          <div class="report-row">
            <span class="acct-name">{row.code ? `${row.code} · ` : ''}{row.name}</span>
            <span class="amount positive">{fmt(row.amount)}</span>
          </div>
        {/each}
        <div class="report-row subtotal">
          <span>Total Revenue</span>
          <span class="amount positive">{fmt(pl.totalRevenue)}</span>
        </div>

        <h3 class="section-title mt">Expenses</h3>
        {#each pl.expenses as row}
          <div class="report-row">
            <span class="acct-name">{row.code ? `${row.code} · ` : ''}{row.name}</span>
            <span class="amount negative">{fmt(Math.abs(row.amount))}</span>
          </div>
        {/each}
        <div class="report-row subtotal">
          <span>Total Expenses</span>
          <span class="amount negative">{fmt(pl.totalExpenses)}</span>
        </div>

        <div class="report-row total" class:positive={pl.netIncome >= 0} class:negative={pl.netIncome < 0}>
          <span>Net Income</span>
          <span class="amount">{fmt(pl.netIncome)}</span>
        </div>
      </div>

    <!-- Balance Sheet -->
    {:else if activeReport === 'balance-sheet'}
      {@const bs = data as unknown as BSData}
      {#each [['Assets', bs.assets, bs.totalAssets, false], ['Liabilities', bs.liabilities, bs.totalLiabilities, true], ['Equity', bs.equity, bs.totalEquity, true]] as [label, rows, total, negate]}
        <div class="report-section">
          <h3 class="section-title">{label}</h3>
          {#each rows as row}
            <div class="report-row">
              <span class="acct-name">{row.code ? `${row.code} · ` : ''}{row.name}</span>
              <span class="amount">{fmt(negate ? Math.abs(row.balance) : row.balance)}</span>
            </div>
          {/each}
          <div class="report-row subtotal">
            <span>Total {label}</span>
            <span class="amount">{fmt(total)}</span>
          </div>
        </div>
      {/each}
      <div class="report-row total" class:balanced={bs.balanced}>
        <span>Balanced</span>
        <span>{bs.balanced ? '✓ Yes' : '✗ Out of balance'}</span>
      </div>

    <!-- Trial Balance -->
    {:else}
      {@const tb = data as unknown as TBData}
      <table class="tb-table">
        <thead>
          <tr>
            <th>Code</th><th>Account</th><th>Type</th>
            <th class="num">Debit</th><th class="num">Credit</th><th class="num">Balance</th>
          </tr>
        </thead>
        <tbody>
          {#each tb.rows as row}
            <tr>
              <td class="mono">{row.code ?? '—'}</td>
              <td>{row.name}</td>
              <td><span class="type-chip type-{row.type.toLowerCase()}">{row.type}</span></td>
              <td class="num">{row.total_debit > 0 ? fmt(row.total_debit) : '—'}</td>
              <td class="num">{row.total_credit > 0 ? fmt(row.total_credit) : '—'}</td>
              <td class="num" class:pos={row.balance > 0} class:neg={row.balance < 0}>
                {fmt(row.balance)}
              </td>
            </tr>
          {/each}
        </tbody>
        <tfoot>
          <tr class="tb-total">
            <td colspan="3">Totals</td>
            <td class="num">{fmt((tb.rows ?? []).reduce((s,r) => s + r.total_debit, 0))}</td>
            <td class="num">{fmt((tb.rows ?? []).reduce((s,r) => s + r.total_credit, 0))}</td>
            <td></td>
          </tr>
        </tfoot>
      </table>
    {/if}

  {/if} <!-- end {#if data} -->
</div>

<style>
  .reports-panel { display: flex; flex-direction: column; gap: var(--space-4); }

  .report-tabs { display: flex; gap: var(--space-1); border-bottom: 2px solid var(--color-taupe-200); }
  .rtab {
    padding: var(--space-2) var(--space-4); border: none; background: none; cursor: pointer;
    font-size: var(--text-sm); color: var(--color-taupe-500);
    border-bottom: 2px solid transparent; margin-bottom: -2px;
  }
  .rtab.active { color: var(--color-sand-700); border-bottom-color: var(--color-sand-600); font-weight: 600; }

  .date-controls {
    display: flex; flex-wrap: wrap; align-items: center; gap: var(--space-3);
    padding: var(--space-3) 0;
  }
  .date-controls label { display: flex; align-items: center; gap: var(--space-2); font-size: var(--text-sm); color: var(--color-taupe-600); }
  .date-controls input[type="date"] { padding: var(--space-1) var(--space-2); border: 1px solid var(--color-taupe-200); border-radius: var(--radius-md); font-size: var(--text-sm); }

  .btn-run { padding: var(--space-2) var(--space-4); background: var(--color-sand-600); color: white; border: none; border-radius: var(--radius-md); font-size: var(--text-sm); font-weight: 600; cursor: pointer; }
  .btn-export { padding: var(--space-2) var(--space-4); background: white; border: 1px solid var(--color-taupe-200); border-radius: var(--radius-md); font-size: var(--text-sm); cursor: pointer; }

  .report-section { background: white; border: 1px solid var(--color-taupe-200); border-radius: var(--radius-lg); overflow: hidden; margin-bottom: var(--space-3); }
  .section-title { margin: 0; padding: var(--space-3) var(--space-4); background: var(--color-taupe-50); font-size: var(--text-xs); font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; color: var(--color-taupe-500); border-bottom: 1px solid var(--color-taupe-200); }
  .section-title.mt { border-top: 2px solid var(--color-taupe-200); }

  .report-row { display: flex; justify-content: space-between; padding: var(--space-2) var(--space-4); font-size: var(--text-sm); border-bottom: 1px solid var(--color-taupe-100); }
  .report-row:last-child { border-bottom: none; }
  .report-row.subtotal { font-weight: 600; background: var(--color-taupe-50); }
  .report-row.total { font-weight: 700; font-size: var(--text-base); padding: var(--space-3) var(--space-4); background: var(--color-sand-50); border-top: 2px solid var(--color-taupe-200); }

  .amount { font-variant-numeric: tabular-nums; }
  .amount.positive, .report-row.total.positive .amount { color: #065f46; }
  .amount.negative, .report-row.total.negative .amount { color: #b91c1c; }
  .acct-name { color: var(--color-taupe-700); }

  .tb-table { width: 100%; border-collapse: collapse; font-size: var(--text-sm); }
  .tb-table th { text-align: left; padding: var(--space-2) var(--space-3); border-bottom: 2px solid var(--color-taupe-200); font-size: 11px; text-transform: uppercase; color: var(--color-taupe-500); }
  .tb-table td { padding: var(--space-2) var(--space-3); border-bottom: 1px solid var(--color-taupe-100); }
  .tb-table tfoot td { padding: var(--space-3); font-weight: 700; border-top: 2px solid var(--color-taupe-200); background: var(--color-taupe-50); }
  .num { text-align: right; font-variant-numeric: tabular-nums; }
  .mono { font-family: monospace; color: var(--color-taupe-400); }
  .pos { color: #065f46; } .neg { color: #b91c1c; }

  .type-chip { display: inline-block; padding: 1px 7px; border-radius: 999px; font-size: 10px; font-weight: 700; }
  .type-asset     { background: #dbeafe; color: #1d4ed8; }
  .type-liability { background: #fce7f3; color: #9d174d; }
  .type-equity    { background: #ede9fe; color: #5b21b6; }
  .type-revenue   { background: #d1fae5; color: #065f46; }
  .type-expense   { background: #fee2e2; color: #b91c1c; }

  .state-msg { padding: var(--space-12); text-align: center; color: var(--color-taupe-400); }
  .state-msg.error { color: #b91c1c; }
</style>

