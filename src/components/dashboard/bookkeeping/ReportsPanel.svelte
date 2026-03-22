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
