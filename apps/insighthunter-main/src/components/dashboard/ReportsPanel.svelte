<script lang="ts">
  import { onMount } from 'svelte';
  import Spinner from '../shared/Spinner.svelte';
  import { apiGet } from '../../lib/api.js';

  let report = $state<Record<string, unknown> | null>(null);
  let loading = $state(false);
  let reportType = $state<'pl'|'balance-sheet'|'trial-balance'>('pl');
  let from = $state(new Date(new Date().getFullYear(),0,1).toISOString().slice(0,10));
  let to   = $state(new Date().toISOString().slice(0,10));

  const fmt = (n: number) => new Intl.NumberFormat('en-US', { style:'currency', currency:'USD' }).format(n ?? 0);

  async function loadReport() {
    loading = true;
    try {
      if (reportType === 'pl') {
        report = await apiGet(`/bookkeeping/reports/pl?from=${from}&to=${to}`);
      } else if (reportType === 'balance-sheet') {
        report = await apiGet(`/bookkeeping/reports/balance-sheet?as_of=${to}`);
      } else {
        report = await apiGet(`/bookkeeping/reports/trial-balance?as_of=${to}`);
      }
    } catch { report = null; }
    finally { loading = false; }
  }

  onMount(() => loadReport());
</script>

<div>
  <div style="display:flex;gap:var(--space-4);flex-wrap:wrap;align-items:flex-end;margin-bottom:var(--space-6)">
    <div class="form-group" style="flex:none">
      <label>Report type</label>
      <select class="select" bind:value={reportType} style="width:180px">
        <option value="pl">Profit & Loss</option>
        <option value="balance-sheet">Balance Sheet</option>
        <option value="trial-balance">Trial Balance</option>
      </select>
    </div>
    {#if reportType === 'pl'}
      <div class="form-group"><label>From</label><input type="date" class="input" bind:value={from} style="width:160px"/></div>
      <div class="form-group"><label>To</label><input type="date" class="input" bind:value={to} style="width:160px"/></div>
    {:else}
      <div class="form-group"><label>As of</label><input type="date" class="input" bind:value={to} style="width:160px"/></div>
    {/if}
    <button class="btn btn--primary" onclick={loadReport}>Run report</button>
  </div>

  {#if loading}
    <div style="display:flex;justify-content:center;padding:var(--space-16)"><Spinner size={32}/></div>
  {:else if report}
    {#if reportType === 'pl'}
      <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:var(--space-4);margin-bottom:var(--space-6)">
        <div class="card" style="text-align:center">
          <div style="font-size:0.75rem;color:var(--color-text-muted);text-transform:uppercase;letter-spacing:.05em">Revenue</div>
          <div style="font-family:var(--font-display);font-size:1.75rem;color:var(--color-success)">{fmt(report.revenue as number)}</div>
        </div>
        <div class="card" style="text-align:center">
          <div style="font-size:0.75rem;color:var(--color-text-muted);text-transform:uppercase;letter-spacing:.05em">Expenses</div>
          <div style="font-family:var(--font-display);font-size:1.75rem;color:var(--color-danger)">{fmt(report.expenses as number)}</div>
        </div>
        <div class="card" style="text-align:center">
          <div style="font-size:0.75rem;color:var(--color-text-muted);text-transform:uppercase;letter-spacing:.05em">Net Income</div>
          <div style="font-family:var(--font-display);font-size:1.75rem;color:var(--color-primary)">{fmt(report.net_income as number)}</div>
        </div>
      </div>
    {/if}
    <div class="card" style="padding:0;overflow:hidden">
      <table class="table">
        <thead><tr><th>Code</th><th>Account</th><th>Type</th>
          {#if reportType === 'trial-balance'}<th style="text-align:right">Debit</th><th style="text-align:right">Credit</th>
          {:else}<th style="text-align:right">Balance</th>{/if}
        </tr></thead>
        <tbody>
          {#each (report.accounts as Record<string,unknown>[]) ?? [] as row}
          <tr>
            <td style="font-family:var(--font-mono);font-size:0.8125rem">{String(row.code ?? '')}</td>
            <td>{String(row.name)}</td>
            <td><span class="badge badge--sand" style="font-size:0.7rem">{String(row.type)}</span></td>
            {#if reportType === 'trial-balance'}
              <td style="text-align:right;font-family:var(--font-mono)">{fmt(row.total_debit as number)}</td>
              <td style="text-align:right;font-family:var(--font-mono)">{fmt(row.total_credit as number)}</td>
            {:else}
              <td style="text-align:right;font-family:var(--font-mono)">{fmt((row.net ?? row.balance) as number)}</td>
            {/if}
          </tr>
          {/each}
        </tbody>
      </table>
    </div>
  {:else}
    <div class="card" style="text-align:center;padding:var(--space-12);color:var(--color-text-muted)">
      Run a report to see data here.
    </div>
  {/if}
</div>
