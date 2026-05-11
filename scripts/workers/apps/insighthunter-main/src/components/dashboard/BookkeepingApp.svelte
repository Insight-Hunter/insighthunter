<script lang="ts">
  import { onMount } from 'svelte';
  import Spinner from '../shared/Spinner.svelte';
  import EmptyState from '../shared/EmptyState.svelte';
  import { apiGet, apiPost, apiPatch } from '../../lib/api.js';

  let activeTab = $state<'transactions'|'accounts'|'reports'>('transactions');
  let transactions = $state<Record<string,unknown>[]>([]);
  let accounts = $state<Record<string,unknown>[]>([]);
  let loading = $state(true);
  let showNewTxn = $state(false);

  onMount(async () => { await loadData(); loading = false; });

  async function loadData() {
    const [txns, accts] = await Promise.all([
      apiGet<{ items: Record<string,unknown>[] }>('/bookkeeping/transactions').then(r => r.items).catch(() => []),
      apiGet<Record<string,unknown>[]>('/bookkeeping/accounts').catch(() => []),
    ]);
    transactions = txns;
    accounts = accts;
  }

  const fmt = (n: number) => new Intl.NumberFormat('en-US', { style:'currency', currency:'USD' }).format(n);
  const statusColor: Record<string,string> = { DRAFT:'gray', POSTED:'green', VOID:'red' };
</script>

<div>
  <div class="tabs">
    <button class="tab {activeTab==='transactions'?'active':''}" onclick={() => activeTab='transactions'}>Transactions</button>
    <button class="tab {activeTab==='accounts'?'active':''}" onclick={() => activeTab='accounts'}>Chart of Accounts</button>
    <button class="tab {activeTab==='reports'?'active':''}" onclick={() => activeTab='reports'}>Reports</button>
  </div>

  {#if loading}
    <div style="display:flex;justify-content:center;padding:var(--space-16)"><Spinner size={32}/></div>
  {:else if activeTab === 'transactions'}
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:var(--space-4)">
      <h3 style="font-size:0.875rem;font-weight:600;color:var(--color-text-muted)">
        {transactions.length} transactions
      </h3>
      <button class="btn btn--primary btn--sm" onclick={() => showNewTxn=true}>+ New transaction</button>
    </div>
    {#if transactions.length === 0}
      <EmptyState icon="📒" title="No transactions yet" description="Create your first transaction to get started." />
    {:else}
      <div class="card" style="padding:0;overflow:hidden">
        <table class="table">
          <thead><tr><th>Date</th><th>Description</th><th>Reference</th><th>Status</th></tr></thead>
          <tbody>
            {#each transactions as t}
            <tr>
              <td style="color:var(--color-text-muted);font-size:0.8125rem">{String(t.date)}</td>
              <td>{String(t.description)}</td>
              <td style="color:var(--color-text-muted);font-size:0.8125rem">{String(t.reference ?? '—')}</td>
              <td><span class="badge badge--{statusColor[String(t.status)] ?? 'gray'}">{String(t.status)}</span></td>
            </tr>
            {/each}
          </tbody>
        </table>
      </div>
    {/if}
  {:else if activeTab === 'accounts'}
    <div class="card" style="padding:0;overflow:hidden">
      <table class="table">
        <thead><tr><th>Code</th><th>Name</th><th>Type</th><th>Subtype</th></tr></thead>
        <tbody>
          {#each accounts as a}
          <tr>
            <td style="font-family:var(--font-mono);font-size:0.8125rem">{String(a.code ?? '')}</td>
            <td>{String(a.name)}</td>
            <td><span class="badge badge--sand" style="font-size:0.7rem">{String(a.type)}</span></td>
            <td style="color:var(--color-text-muted);font-size:0.8125rem">{String(a.subtype ?? '—')}</td>
          </tr>
          {/each}
        </tbody>
      </table>
    </div>
  {:else}
    <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:var(--space-4)">
      {#each [['P&L', '/bookkeeping/reports/pl'], ['Balance Sheet', '/bookkeeping/reports/balance-sheet'], ['Trial Balance', '/bookkeeping/reports/trial-balance']] as [label, path]}
        <a href="/dashboard/reports" class="card" style="text-decoration:none;display:block;text-align:center;">
          <div style="font-size:2rem;margin-bottom:var(--space-3)">📊</div>
          <div style="font-weight:600">{label}</div>
          <div style="font-size:0.8rem;color:var(--color-text-muted);margin-top:var(--space-1)">View report →</div>
        </a>
      {/each}
    </div>
  {/if}
</div>
