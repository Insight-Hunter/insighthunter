<!-- apps/insighthunter-main/src/components/dashboard/pbx/CallLogTable.svelte -->
<script lang="ts">
  import { onMount } from 'svelte';
  import { pbxClient, type CallLog } from '../../../lib/pbx-client';

  let logs: CallLog[] = [];
  let stats: { status: string; count: number; total_seconds: number }[] = [];
  let loading = true;
  let page = 1;
  let total = 0;
  let filter: 'all' | 'inbound' | 'outbound' | 'missed' = 'all';

  const statusColor: Record<string, string> = {
    completed: '#22c55e', missed: '#ef4444', voicemail: '#f59e0b', busy: '#6b7280', failed: '#dc2626', ringing: '#3b82f6',
  };

  function formatDur(secs: number | null): string {
    if (!secs) return '—';
    const m = Math.floor(secs / 60); const s = secs % 60;
    return m > 0 ? `${m}m ${s}s` : `${s}s`;
  }

  function formatTime(iso: string): string {
    return new Date(iso).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
  }

  async function load() {
    loading = true;
    try {
      const [logsRes, statsRes] = await Promise.all([pbxClient.listCallLogs(page), pbxClient.callStats()]);
      logs = logsRes.data; total = logsRes.total; stats = statsRes.data;
    } finally { loading = false; }
  }

  $: filteredLogs = filter === 'all' ? logs
    : filter === 'missed' ? logs.filter(l => l.status === 'missed')
    : logs.filter(l => l.direction === filter);

  onMount(load);
</script>

<div class="call-log">
  <!-- Stats row -->
  <div class="stats-row">
    {#each stats as s}
      <div class="stat-chip">
        <span class="stat-dot" style="background:{statusColor[s.status] ?? '#6b7280'}"></span>
        <span class="stat-label">{s.status}</span>
        <span class="stat-count">{s.count}</span>
      </div>
    {/each}
  </div>

  <!-- Filter tabs -->
  <div class="filter-tabs">
    {#each ['all','inbound','outbound','missed'] as f}
      <button class="filter-tab" class:filter-tab--active={filter === f} on:click={() => (filter = f as typeof filter)}>
        {f.charAt(0).toUpperCase() + f.slice(1)}
      </button>
    {/each}
  </div>

  {#if loading}
    <div class="loading-row"><span class="spinner"></span> Loading call log…</div>
  {:else if filteredLogs.length === 0}
    <div class="empty-state">No {filter === 'all' ? '' : filter} calls found.</div>
  {:else}
    <table class="log-table">
      <thead>
        <tr><th>Dir.</th><th>From</th><th>To</th><th>Time</th><th>Duration</th><th>Status</th></tr>
      </thead>
      <tbody>
        {#each filteredLogs as log}
          <tr>
            <td><span class="dir-badge dir-badge--{log.direction}">{log.direction === 'inbound' ? '↙' : '↗'}</span></td>
            <td class="number-cell">{log.from_number}</td>
            <td class="number-cell">{log.to_number}</td>
            <td class="time-cell">{formatTime(log.started_at)}</td>
            <td>{formatDur(log.duration)}</td>
            <td>
              <span class="status-pill" style="color:{statusColor[log.status] ?? '#6b7280'}">
                {log.status}
              </span>
            </td>
          </tr>
        {/each}
      </tbody>
    </table>

    <!-- Pagination -->
    <div class="pagination">
      <button class="btn btn--ghost" disabled={page <= 1} on:click={() => { page--; load(); }}>← Prev</button>
      <span>Page {page} · {total} total</span>
      <button class="btn btn--ghost" disabled={page * 25 >= total} on:click={() => { page++; load(); }}>Next →</button>
    </div>
  {/if}
</div>

<style>
  .call-log { max-width: 860px; }
  .stats-row { display: flex; flex-wrap: wrap; gap: 0.5rem; margin-bottom: 1rem; }
  .stat-chip { display: flex; align-items: center; gap: 0.35rem; padding: 0.3rem 0.7rem; background: var(--color-surface, #fff); border: 1px solid var(--color-border, #e5e2dc); border-radius: 999px; font-size: 0.8rem; }
  .stat-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }
  .stat-label { color: var(--color-text-muted, #6b7280); text-transform: capitalize; }
  .stat-count { font-weight: 700; }
  .filter-tabs { display: flex; gap: 0.25rem; margin-bottom: 1rem; }
  .filter-tab { padding: 0.3rem 0.8rem; border-radius: 6px; border: 1px solid var(--color-border, #e5e2dc); background: none; font-size: 0.82rem; cursor: pointer; color: var(--color-text-muted, #6b7280); }
  .filter-tab--active { background: var(--color-accent, #8b7355); color: #fff; border-color: transparent; }
  .log-table { width: 100%; border-collapse: collapse; font-size: 0.85rem; }
  .log-table th { text-align: left; padding: 0.5rem 0.75rem; font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.04em; color: var(--color-text-muted, #6b7280); background: var(--color-bg, #faf9f7); border-bottom: 1px solid var(--color-border, #e5e2dc); }
  .log-table td { padding: 0.55rem 0.75rem; border-bottom: 1px solid var(--color-border, #e5e2dc); }
  .dir-badge { font-size: 1rem; }
  .dir-badge--inbound { color: #22c55e; }
  .dir-badge--outbound { color: #3b82f6; }
  .number-cell { font-family: monospace; font-size: 0.87rem; }
  .time-cell { color: var(--color-text-muted, #6b7280); white-space: nowrap; }
  .status-pill { font-size: 0.78rem; font-weight: 600; text-transform: capitalize; }
  .pagination { display: flex; align-items: center; justify-content: center; gap: 1rem; margin-top: 1rem; font-size: 0.85rem; color: var(--color-text-muted, #6b7280); }
  .loading-row { display:flex; align-items:center; gap:0.5rem; padding:2rem; justify-content:center; color:var(--color-text-muted,#6b7280); }
  .empty-state { text-align:center; padding:2rem; color:var(--color-text-muted,#6b7280); }
  .spinner { width:16px; height:16px; border:2px solid var(--color-border,#e5e2dc); border-top-color:var(--color-accent,#8b7355); border-radius:50%; animation:spin 0.7s linear infinite; }
  .btn { padding:0.4rem 0.9rem; border-radius:6px; border:1px solid var(--color-border,#e5e2dc); background:none; font-size:0.82rem; cursor:pointer; }
  .btn--ghost:disabled { opacity:0.4; cursor:not-allowed; }
  @keyframes spin { to { transform:rotate(360deg); } }
</style>
