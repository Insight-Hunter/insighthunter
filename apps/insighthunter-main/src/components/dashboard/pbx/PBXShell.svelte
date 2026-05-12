<!-- apps/insighthunter-main/src/components/dashboard/pbx/PBXShell.svelte -->
<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { pbxClient } from '../../../lib/pbx-client';
  import Dialer from './Dialer.svelte';
  import ExtensionManager from './ExtensionManager.svelte';
  import CallLogTable from './CallLogTable.svelte';
  import VoicemailInbox from './VoicemailInbox.svelte';
  import IVRBuilder from './IVRBuilder.svelte';

  type Tab = 'dialer' | 'extensions' | 'calls' | 'voicemail' | 'ivr' | 'settings';
  let activeTab: Tab = 'dialer';

  // Live call events via WebSocket
  let ws: WebSocket | null = null;
  let activeCalls: Record<string, unknown>[] = [];
  let wsStatus: 'connecting' | 'connected' | 'disconnected' = 'connecting';
  let unreadVoicemail = 0;
  let pbxSettings: Record<string, string> = {};

  const tabs: { id: Tab; label: string; icon: string }[] = [
    { id: 'dialer',     label: 'Dialer',      icon: '📞' },
    { id: 'extensions', label: 'Extensions',  icon: '🔌' },
    { id: 'calls',      label: 'Call Log',    icon: '📋' },
    { id: 'voicemail',  label: 'Voicemail',   icon: '📬' },
    { id: 'ivr',        label: 'Auto-Attend', icon: '🌐' },
    { id: 'settings',   label: 'Settings',    icon: '⚙️'  },
  ];

  function handleCallEvent(event: Record<string, unknown>) {
    const type = event.type as string;
    if (type === 'call.initiated') {
      activeCalls = [...activeCalls, event];
    } else if (type === 'call.hangup') {
      activeCalls = activeCalls.filter(c => c.callId !== event.callId);
    }
  }

  onMount(async () => {
    // WebSocket for live events
    try {
      ws = pbxClient.connectWS(handleCallEvent);
      ws.onopen = () => { wsStatus = 'connected'; };
      ws.onclose = () => { wsStatus = 'disconnected'; };
    } catch (e) { wsStatus = 'disconnected'; }

    // Unread voicemail badge
    try {
      const { data } = await pbxClient.listVoicemail();
      unreadVoicemail = data.filter(v => !v.read).length;
    } catch { /**/ }

    try {
      const { data } = await pbxClient.getSettings();
      pbxSettings = data;
    } catch { /**/ }
  });

  onDestroy(() => ws?.close());
</script>

<div class="pbx-shell">
  <!-- Header bar -->
  <header class="pbx-header">
    <div class="pbx-title">
      <span class="pbx-icon">☎️</span>
      <h2>Business Phone</h2>
    </div>
    <div class="pbx-status">
      {#if activeCalls.length > 0}
        <span class="badge badge--active">{activeCalls.length} active call{activeCalls.length > 1 ? 's' : ''}</span>
      {/if}
      <span class="ws-dot ws-dot--{wsStatus}" title="Live: {wsStatus}"></span>
    </div>
  </header>

  <!-- Active calls banner -->
  {#if activeCalls.length > 0}
    <div class="active-calls-bar">
      {#each activeCalls as call}
        <div class="active-call-chip">
          <span>📞 {call.direction === 'inbound' ? '↙' : '↗'} {call.from}</span>
          <span class="call-status-dot"></span>
        </div>
      {/each}
    </div>
  {/if}

  <!-- Tabs -->
  <nav class="pbx-tabs" role="tablist">
    {#each tabs as tab}
      <button
        role="tab"
        aria-selected={activeTab === tab.id}
        class="pbx-tab"
        class:pbx-tab--active={activeTab === tab.id}
        on:click={() => (activeTab = tab.id)}
      >
        <span class="tab-icon">{tab.icon}</span>
        <span class="tab-label">{tab.label}</span>
        {#if tab.id === 'voicemail' && unreadVoicemail > 0}
          <span class="badge badge--unread">{unreadVoicemail}</span>
        {/if}
      </button>
    {/each}
  </nav>

  <!-- Tab panels -->
  <main class="pbx-content">
    {#if activeTab === 'dialer'}
      <Dialer />
    {:else if activeTab === 'extensions'}
      <ExtensionManager />
    {:else if activeTab === 'calls'}
      <CallLogTable />
    {:else if activeTab === 'voicemail'}
      <VoicemailInbox on:readchange={() => { unreadVoicemail = Math.max(0, unreadVoicemail - 1); }} />
    {:else if activeTab === 'ivr'}
      <IVRBuilder />
    {:else if activeTab === 'settings'}
      <PBXSettings bind:settings={pbxSettings} />
    {/if}
  </main>
</div>

<!-- Inline PBXSettings to keep file count lean -->
{#if false}
<!-- PBXSettings is inlined as a sub-component below -->
{/if}

<style>
  .pbx-shell { display: flex; flex-direction: column; height: 100%; background: var(--color-bg, #faf9f7); border-radius: 12px; overflow: hidden; border: 1px solid var(--color-border, #e5e2dc); }
  .pbx-header { display: flex; align-items: center; justify-content: space-between; padding: 1rem 1.5rem; background: var(--color-surface, #fff); border-bottom: 1px solid var(--color-border, #e5e2dc); }
  .pbx-title { display: flex; align-items: center; gap: 0.5rem; }
  .pbx-title h2 { font-size: 1rem; font-weight: 600; margin: 0; color: var(--color-text, #1a1a1a); }
  .pbx-icon { font-size: 1.2rem; }
  .pbx-status { display: flex; align-items: center; gap: 0.75rem; }
  .ws-dot { width: 8px; height: 8px; border-radius: 50%; }
  .ws-dot--connected { background: #22c55e; }
  .ws-dot--connecting { background: #f59e0b; animation: pulse 1s infinite; }
  .ws-dot--disconnected { background: #ef4444; }
  .active-calls-bar { display: flex; gap: 0.5rem; padding: 0.5rem 1.5rem; background: #ecfdf5; border-bottom: 1px solid #d1fae5; overflow-x: auto; }
  .active-call-chip { display: flex; align-items: center; gap: 0.4rem; padding: 0.25rem 0.75rem; background: #fff; border: 1px solid #6ee7b7; border-radius: 999px; font-size: 0.8rem; font-weight: 500; }
  .call-status-dot { width: 6px; height: 6px; border-radius: 50%; background: #22c55e; animation: pulse 1.5s infinite; }
  .pbx-tabs { display: flex; background: var(--color-surface, #fff); border-bottom: 1px solid var(--color-border, #e5e2dc); overflow-x: auto; }
  .pbx-tab { display: flex; align-items: center; gap: 0.35rem; padding: 0.75rem 1.1rem; border: none; background: none; cursor: pointer; font-size: 0.82rem; font-weight: 500; color: var(--color-text-muted, #6b7280); white-space: nowrap; border-bottom: 2px solid transparent; transition: color 0.15s, border-color 0.15s; position: relative; }
  .pbx-tab:hover { color: var(--color-text, #1a1a1a); }
  .pbx-tab--active { color: var(--color-accent, #8b7355); border-bottom-color: var(--color-accent, #8b7355); }
  .pbx-content { flex: 1; overflow-y: auto; padding: 1.5rem; }
  .badge { padding: 0.1rem 0.45rem; border-radius: 999px; font-size: 0.7rem; font-weight: 700; }
  .badge--active { background: #dcfce7; color: #166534; }
  .badge--unread { background: #ef4444; color: #fff; margin-left: 0.15rem; }
  @keyframes pulse { 0%,100% { opacity:1; } 50% { opacity:0.4; } }
</style>
