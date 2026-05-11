<!-- apps/insighthunter-main/src/components/dashboard/pbx/VoicemailInbox.svelte -->
<script lang="ts">
  import { onMount, createEventDispatcher } from 'svelte';
  import { pbxClient, type Voicemail } from '../../../lib/pbx-client';

  const dispatch = createEventDispatcher();
  let voicemails: Voicemail[] = [];
  let loading = true;
  let playingId: string | null = null;
  let expandedId: string | null = null;

  function formatTime(iso: string) {
    return new Date(iso).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
  }

  function formatDur(secs: number) {
    return secs < 60 ? `${secs}s` : `${Math.floor(secs / 60)}m ${secs % 60}s`;
  }

  async function load() {
    loading = true;
    try { const { data } = await pbxClient.listVoicemail(); voicemails = data; }
    finally { loading = false; }
  }

  async function play(vm: Voicemail) {
    if (playingId === vm.id) { playingId = null; return; }
    playingId = vm.id;
    if (!vm.read) {
      await pbxClient.markRead(vm.id);
      vm.read = 1;
      voicemails = voicemails.map(v => v.id === vm.id ? { ...v, read: 1 } : v);
      dispatch('readchange');
    }
  }

  async function remove(id: string) {
    if (!confirm('Delete voicemail?')) return;
    await pbxClient.deleteVoicemail(id);
    voicemails = voicemails.filter(v => v.id !== id);
  }

  onMount(load);
</script>

<div class="vm-inbox">
  <div class="section-header">
    <h3>Voicemail <span class="unread-count">{voicemails.filter(v => !v.read).length} unread</span></h3>
  </div>

  {#if loading}
    <div class="loading-row"><span class="spinner"></span> Loading voicemail…</div>
  {:else if voicemails.length === 0}
    <div class="empty-state">📬 No voicemails. New messages will appear here automatically.</div>
  {:else}
    <ul class="vm-list">
      {#each voicemails as vm}
        <li class="vm-item" class:vm-item--unread={!vm.read}>
          <div class="vm-row" role="button" tabindex="0" on:click={() => (expandedId = expandedId === vm.id ? null : vm.id)} on:keypress={(e) => e.key === 'Enter' && (expandedId = expandedId === vm.id ? null : vm.id)}>
            <div class="vm-meta">
              <span class="vm-from">📞 {vm.from_number}</span>
              {#if !vm.read}<span class="unread-dot"></span>{/if}
              <span class="vm-ext">ext {vm.extension_id ?? '—'}</span>
            </div>
            <div class="vm-details">
              <span class="vm-time">{formatTime(vm.received_at)}</span>
              <span class="vm-dur">{formatDur(vm.duration)}</span>
            </div>
          </div>

          {#if expandedId === vm.id}
            <div class="vm-expanded">
              <!-- Audio player -->
              <audio
                controls
                src={pbxClient.getVoicemailAudioUrl(vm.id)}
                class="vm-audio"
                on:play={() => play(vm)}
              ></audio>
              <!-- AI Transcription -->
              {#if vm.transcription}
                <div class="vm-transcript">
                  <span class="transcript-label">🤖 Transcript</span>
                  <p class="transcript-text">{vm.transcription}</p>
                </div>
              {:else}
                <p class="transcript-pending">Transcription processing…</p>
              {/if}
              <div class="vm-actions">
                <button class="btn btn--ghost btn--sm" on:click={() => remove(vm.id)}>🗑 
