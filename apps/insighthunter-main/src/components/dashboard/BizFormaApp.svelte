<script lang="ts">
  import { onMount } from 'svelte';
  import Spinner from '../shared/Spinner.svelte';
  import EmptyState from '../shared/EmptyState.svelte';
  import { apiGet, apiPost } from '../../lib/api.js';

  let cases = $state<Record<string,unknown>[]>([]);
  let compliance = $state<Record<string,unknown>[]>([]);
  let loading = $state(true);
  let activeTab = $state<'cases'|'compliance'>('cases');

  const statusBadge: Record<string,string> = {
    QUESTIONNAIRE:'yellow', ENTITY_SELECTED:'blue', EIN_PENDING:'yellow',
    EIN_COMPLETE:'blue', STATE_PENDING:'yellow', STATE_COMPLETE:'blue',
    TAX_SETUP:'blue', COMPLETE:'green'
  };

  onMount(async () => {
    [cases, compliance] = await Promise.all([
      apiGet<Record<string,unknown>[]>('/bizforma/cases').catch(() => []),
      apiGet<Record<string,unknown>[]>('/bizforma/compliance').catch(() => []),
    ]);
    loading = false;
  });

  async function newCase() {
    const biz = prompt('Business name?');
    if (!biz) return;
    const c = await apiPost<Record<string,unknown>>('/bizforma/cases', { business_name: biz });
    cases = [c, ...cases];
  }
</script>

<div>
  <div class="tabs">
    <button class="tab {activeTab==='cases'?'active':''}" onclick={() => activeTab='cases'}>Formation Cases</button>
    <button class="tab {activeTab==='compliance'?'active':''}" onclick={() => activeTab='compliance'}>Compliance Calendar</button>
  </div>

  {#if loading}
    <div style="display:flex;justify-content:center;padding:var(--space-16)"><Spinner size={32}/></div>
  {:else if activeTab === 'cases'}
    <div style="display:flex;justify-content:flex-end;margin-bottom:var(--space-4)">
      <button class="btn btn--primary" onclick={newCase}>+ New Formation Case</button>
    </div>
    {#if cases.length === 0}
      <EmptyState icon="🏛" title="No formation cases" description="Start your business formation journey." />
    {:else}
      <div class="card" style="padding:0;overflow:hidden">
        <table class="table">
          <thead><tr><th>Business Name</th><th>Entity</th><th>State</th><th>Status</th><th>Created</th></tr></thead>
          <tbody>
            {#each cases as c}
            <tr>
              <td style="font-weight:500">{String(c.business_name ?? 'Unnamed')}</td>
              <td><span class="badge badge--sand" style="font-size:0.7rem">{String(c.entity_type ?? '—')}</span></td>
              <td style="font-size:0.8125rem">{String(c.state ?? '—')}</td>
              <td><span class="badge badge--{statusBadge[String(c.status)] ?? 'gray'}" style="font-size:0.7rem">{String(c.status)}</span></td>
              <td style="font-size:0.8125rem;color:var(--color-text-muted)">{new Date(String(c.created_at)).toLocaleDateString()}</td>
            </tr>
            {/each}
          </tbody>
        </table>
      </div>
    {/if}
  {:else}
    {#if compliance.length === 0}
      <EmptyState icon="📅" title="No compliance events" description="Deadlines and filings will appear here." />
    {:else}
      <div class="card" style="padding:0;overflow:hidden">
        <table class="table">
          <thead><tr><th>Title</th><th>Type</th><th>Due Date</th><th>Status</th></tr></thead>
          <tbody>
            {#each compliance as ev}
            <tr>
              <td style="font-weight:500">{String(ev.title)}</td>
              <td style="font-size:0.8125rem;color:var(--color-text-muted)">{String(ev.type)}</td>
              <td style="font-size:0.8125rem;font-family:var(--font-mono)">{String(ev.due_date)}</td>
              <td><span class="badge badge--{String(ev.status)==='COMPLETE'?'green':String(ev.status)==='OVERDUE'?'red':'yellow'}" style="font-size:0.7rem">{String(ev.status)}</span></td>
            </tr>
            {/each}
          </tbody>
        </table>
      </div>
    {/if}
  {/if}
</div>
