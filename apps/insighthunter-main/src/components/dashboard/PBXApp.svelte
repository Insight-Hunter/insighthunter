<script lang="ts">
  import { onMount } from 'svelte';
  import Spinner from '../shared/Spinner.svelte';
  import EmptyState from '../shared/EmptyState.svelte';
  import { apiGet, apiPost, apiDelete } from '../../lib/api.js';

  let activeTab = $state<'extensions'|'calls'|'voicemails'|'ivr'>('extensions');
  let extensions = $state<Record<string,unknown>[]>([]);
  let callLogs    = $state<Record<string,unknown>[]>([]);
  let voicemails  = $state<Record<string,unknown>[]>([]);
  let ivrMenus    = $state<Record<string,unknown>[]>([]);
  let loading = $state(true);
  let newExtNumber = $state('');
  let newExtName   = $state('');
  let adding = $state(false);
  let error = $state('');

  onMount(async () => {
    const [exts, calls, vms, ivrs] = await Promise.all([
      apiGet<Record<string,unknown>[]>('/pbx/extensions').catch(() => []),
      apiGet<Record<string,unknown>[]>('/pbx/call-logs').catch(() => []),
      apiGet<Record<string,unknown>[]>('/pbx/voicemails').catch(() => []),
      apiGet<Record<string,unknown>[]>('/pbx/ivr-menus').catch(() => []),
    ]);
    extensions = exts; callLogs = calls; voicemails = vms; ivrMenus = ivrs;
    loading = false;
  });

  async function addExtension() {
    if (!newExtNumber || !newExtName) { error = 'Number and name required'; return; }
    adding = true; error = '';
    try {
      const ext = await apiPost<Record<string,unknown>>('/pbx/extensions', { number: newExtNumber, name: newExtName });
      extensions = [...extensions, ext];
      newExtNumber = ''; newExtName = '';
    } catch (e: unknown) { error = (e as Error).message; }
    finally { adding = false; }
  }

  async function deleteExtension(id: string) {
    if (!confirm('Delete this extension?')) return;
    await apiDelete(`/pbx/extensions/${id}`);
    extensions = extensions.filter(e => e.id !== id);
  }

  const dirIcon = (d: string) => d === 'inbound' ? '↓' : '↑';
  const statusBadge: Record<string,string> = { answered:'green', missed:'red', voicemail:'blue', ringing:'yellow' };
</script>

<div>
  <div class="tabs">
    <button class="tab {activeTab==='extensions'?'active':''}" onclick={() => activeTab='extensions'}>Extensions</button>
    <button class="tab {activeTab==='calls'?'active':''}" onclick={() => activeTab='calls'}>Call Log</button>
    <button class="tab {activeTab==='voicemails'?'active':''}" onclick={() => activeTab='voicemails'}>Voicemail</button>
    <button class="tab {activeTab==='ivr'?'active':''}" onclick={() => activeTab='ivr'}>IVR Menus</button>
  </div>

  {#if loading}
    <div style="display:flex;justify-content:center;padding:var(--space-16)"><Spinner size={32}/></div>
  {:else if activeTab === 'extensions'}
    <div class="card" style="margin-bottom:var(--space-4)">
      <h4 style="margin-bottom:var(--space-4);font-size:0.875rem;font-weight:600">Add Extension</h4>
      <div style="display:flex;gap:var(--space-3);flex-wrap:wrap;align-items:flex-end">
        <div class="form-group" style="flex:none">
          <label>Number</label>
          <input class="input" bind:value={newExtNumber} placeholder="101" style="width:100px" />
        </div>
        <div class="form-group">
          <label>Name</label>
          <input class="input" bind:value={newExtName} placeholder="Sales" />
        </div>
        <button class="btn btn--primary" onclick={addExtension} disabled={adding}>
          {adding ? 'Adding…' : '+ Add'}
        </button>
      </div>
      {#if error}<p style="color:var(--color-danger);font-size:0.8125rem;margin-top:var(--space-2)">{error}</p>{/if}
    </div>
    {#if extensions.length === 0}
      <EmptyState icon="☎" title="No extensions yet" description="Add your first extension above." />
    {:else}
      <div class="card" style="padding:0;overflow:hidden">
        <table class="table">
          <thead><tr><th>Number</th><th>Name</th><th>Voicemail</th><th>Status</th><th></th></tr></thead>
          <tbody>
            {#each extensions as ext}
            <tr>
              <td style="font-family:var(--font-mono);font-weight:600">{String(ext.number)}</td>
              <td>{String(ext.name)}</td>
              <td><span class="badge badge--{ext.voicemail_enabled ? 'green' : 'gray'}">{ext.voicemail_enabled ? 'On' : 'Off'}</span></td>
              <td><span class="badge badge--{ext.is_active ? 'green' : 'gray'}">{ext.is_active ? 'Active' : 'Inactive'}</span></td>
              <td><button class="btn btn--danger btn--sm" onclick={() => deleteExtension(String(ext.id))}>Delete</button></td>
            </tr>
            {/each}
          </tbody>
        </table>
      </div>
    {/if}
  {:else if activeTab === 'calls'}
    {#if callLogs.length === 0}
      <EmptyState icon="📞" title="No calls yet" description="Call logs will appear here once your PBX is configured." />
    {:else}
      <div class="card" style="padding:0;overflow:hidden">
        <table class="table">
          <thead><tr><th>Dir</th><th>From</th><th>To</th><th>Status</th><th>Duration</th><th>Time</th></tr></thead>
          <tbody>
            {#each callLogs as call}
            <tr>
              <td style="font-size:1.1rem">{dirIcon(String(call.direction))}</td>
              <td style="font-family:var(--font-mono);font-size:0.8125rem">{String(call.from_number ?? '—')}</td>
              <td style="font-family:var(--font-mono);font-size:0.8125rem">{String(call.to_number ?? '—')}</td>
              <td><span class="badge badge--{statusBadge[String(call.status)] ?? 'gray'}">{String(call.status)}</span></td>
              <td style="color:var(--color-text-muted)">{call.duration_seconds}s</td>
              <td style="font-size:0.8125rem;color:var(--color-text-muted)">{new Date(String(call.created_at)).toLocaleString()}</td>
            </tr>
            {/each}
          </tbody>
        </table>
      </div>
    {/if}
  {:else if activeTab === 'voicemails'}
    {#if voicemails.length === 0}
      <EmptyState icon="🎙" title="No voicemails" description="Voicemails will appear here." />
    {:else}
      <div class="card" style="padding:0;overflow:hidden">
        <table class="table">
          <thead><tr><th>Caller</th><th>Transcription</th><th>Listened</th><th>Time</th><th></th></tr></thead>
          <tbody>
            {#each voicemails as vm}
            <tr>
              <td style="font-family:var(--font-mono);font-size:0.8125rem">{String(vm.caller_number ?? 'Unknown')}</td>
              <td style="font-size:0.8125rem;max-width:300px">{String(vm.transcription ?? '—')}</td>
              <td><span class="badge badge--{vm.listened ? 'gray' : 'blue'}">{vm.listened ? 'Read' : 'New'}</span></td>
              <td style="font-size:0.8125rem;color:var(--color-text-muted)">{new Date(String(vm.created_at)).toLocaleString()}</td>
              <td><a class="btn btn--ghost btn--sm" href="/api/pbx/voicemails/{vm.id}/audio" target="_blank">▶ Play</a></td>
            </tr>
            {/each}
          </tbody>
        </table>
      </div>
    {/if}
  {:else}
    {#if ivrMenus.length === 0}
      <EmptyState icon="📟" title="No IVR menus" description="Create phone menu trees for your callers." />
    {:else}
      <div class="card" style="padding:0;overflow:hidden">
        <table class="table">
          <thead><tr><th>Menu Name</th><th>Greeting</th></tr></thead>
          <tbody>
            {#each ivrMenus as menu}
            <tr>
              <td style="font-weight:600">{String(menu.name)}</td>
              <td style="color:var(--color-text-muted);font-size:0.8125rem">{String(menu.greeting_text ?? '—')}</td>
            </tr>
            {/each}
          </tbody>
        </table>
      </div>
    {/if}
  {/if}
</div>
