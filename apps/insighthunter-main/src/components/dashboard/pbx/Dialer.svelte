<!-- apps/insighthunter-main/src/components/dashboard/pbx/Dialer.svelte -->
<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { pbxClient } from '../../../lib/pbx-client';

  // Telnyx WebRTC SDK — loaded dynamically
  let TelnyxRTC: typeof import('@telnyx/webrtc').TelnyxRTC | null = null;
  let client: InstanceType<typeof import('@telnyx/webrtc').TelnyxRTC> | null = null;

  let dialInput = '';
  let callState: 'idle' | 'connecting' | 'ringing' | 'active' | 'held' | 'error' = 'idle';
  let activeCallDuration = 0;
  let activeCallTimer: ReturnType<typeof setInterval> | null = null;
  let errorMsg = '';
  let micPermission: 'unknown' | 'granted' | 'denied' = 'unknown';
  let remoteAudio: HTMLAudioElement;
  let activeCall: unknown = null;

  const dialPad = [
    ['1','2','3'],
    ['4','5','6'],
    ['7','8','9'],
    ['*','0','#'],
  ];

  function formatDuration(secs: number): string {
    const m = Math.floor(secs / 60).toString().padStart(2, '0');
    const s = (secs % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  }

  function appendDigit(d: string) {
    dialInput += d;
    // DTMF tone during active call
    if (callState === 'active' && activeCall) {
      (activeCall as { dtmf: (d: string) => void }).dtmf(d);
    }
  }

  async function initWebRTC() {
    try {
      await navigator.mediaDevices.getUserMedia({ audio: true });
      micPermission = 'granted';
    } catch {
      micPermission = 'denied';
      return;
    }

    try {
      const { token } = await pbxClient.getWebRTCToken();
      // @ts-ignore — dynamic import
      const mod = await import('https://cdn.jsdelivr.net/npm/@telnyx/webrtc@2/dist/bundle/index.js');
      TelnyxRTC = mod.TelnyxRTC;
      client = new TelnyxRTC!({ login_token: token });

      client!.on('telnyx.ready', () => { callState = 'idle'; });
      client!.on('telnyx.error', (err: unknown) => {
        errorMsg = (err as { message?: string })?.message ?? 'WebRTC error';
        callState = 'error';
      });
      client!.on('telnyx.notification', (notification: { call?: unknown; type: string }) => {
        if (notification.type === 'callUpdate') {
          const call = notification.call as { state: string; answer: () => void };
          activeCall = call;
          if (call.state === 'ringing') { callState = 'ringing'; }
          else if (call.state === 'active') {
            callState = 'active';
            activeCallTimer = setInterval(() => activeCallDuration++, 1000);
          }
          else if (call.state === 'hangup' || call.state === 'destroy') {
            callState = 'idle';
            if (activeCallTimer) { clearInterval(activeCallTimer); activeCallTimer = null; }
            activeCallDuration = 0;
            activeCall = null;
          }
          // Wire remote audio
          const callWithAudio = call as { remoteStream?: MediaStream };
          if (callWithAudio.remoteStream && remoteAudio) {
            remoteAudio.srcObject = callWithAudio.remoteStream;
            remoteAudio.play().catch(() => { /**/ });
          }
        }
      });

      client!.connect();
    } catch (e) {
      errorMsg = (e as Error).message;
      callState = 'error';
    }
  }

  function makeCall() {
    if (!client || !dialInput) return;
    callState = 'connecting';
    (client as unknown as { newCall: (opts: unknown) => void }).newCall({
      destinationNumber: dialInput,
      audio: true,
      video: false,
    });
  }

  function hangUp() {
    (activeCall as { hangup: () => void })?.hangup();
  }

  function answerCall() {
    (activeCall as { answer: () => void })?.answer();
  }

  function toggleHold() {
    const c = activeCall as { held?: boolean; hold: () => void; unhold: () => void };
    if (c.held) { c.unhold(); callState = 'active'; }
    else { c.hold(); callState = 'held'; }
  }

  onMount(() => { initWebRTC(); });
  onDestroy(() => { client?.disconnect(); if (activeCallTimer) clearInterval(activeCallTimer); });
</script>

<!-- Hidden audio element for remote stream -->
<audio bind:this={remoteAudio} autoplay playsinline style="display:none"></audio>

<div class="dialer">
  <div class="dialer-card">
    <!-- Call status display -->
    <div class="call-status call-status--{callState}">
      {#if callState === 'idle'}
        <span class="status-text">Ready</span>
      {:else if callState === 'connecting'}
        <span class="status-text">Connecting…</span>
      {:else if callState === 'ringing'}
        <span class="status-text">Ringing…</span>
        <button class="btn btn--answer" on:click={answerCall}>Answer</button>
      {:else if callState === 'active'}
        <span class="status-text active-timer">{formatDuration(activeCallDuration)}</span>
      {:else if callState === 'held'}
        <span class="status-text">On Hold</span>
      {:else if callState === 'error'}
        <span class="status-text error-text">⚠️ {errorMsg}</span>
      {/if}
    </div>

    <!-- Number display -->
    <div class="dial-display">
      <input
        type="tel"
        bind:value={dialInput}
        placeholder="+1 (404) 555-0000"
        class="dial-input"
        maxlength={20}
        readonly={callState !== 'idle'}
      />
      {#if dialInput}
        <button class="backspace-btn" on:click={() => (dialInput = dialInput.slice(0, -1))} aria-label="Backspace">⌫</button>
      {/if}
    </div>

    <!-- Dial pad -->
    <div class="dial-pad">
      {#each dialPad as row}
        <div class="dial-row">
          {#each row as digit}
            <button class="dial-key" on:click={() => appendDigit(digit)}>{digit}</button>
          {/each}
        </div>
      {/each}
    </div>

    <!-- Action buttons -->
    <div class="dialer-actions">
      {#if callState === 'idle' || callState === 'error'}
        <button class="btn btn--call" on:click={makeCall} disabled={!dialInput || callState === 'error'}>
          📞 Call
        </button>
      {:else}
        <button class="btn btn--hold" on:click={toggleHold}>
          {callState === 'held' ? '▶ Resume' : '⏸ Hold'}
        </button>
        <button class="btn btn--hangup" on:click={hangUp}>
          📵 End
        </button>
      {/if}
    </div>

    {#if micPermission === 'denied'}
      <p class="mic-warning">⚠️ Microphone access denied. Allow mic access to use the dialer.</p>
    {/if}
  </div>
</div>

<style>
  .dialer { display: flex; justify-content: center; align-items: flex-start; padding: 0.5rem; }
  .dialer-card { background: var(--color-surface, #fff); border: 1px solid var(--color-border, #e5e2dc); border-radius: 16px; padding: 1.5rem; width: 100%; max-width: 340px; box-shadow: 0 2px 12px rgba(0,0,0,0.06); }
  .call-status { text-align: center; min-height: 2rem; margin-bottom: 1rem; display: flex; align-items: center; justify-content: center; gap: 0.75rem; border-radius: 8px; padding: 0.5rem; }
  .call-status--active { background: #ecfdf5; }
  .call-status--ringing { background: #fffbeb; animation: pulse 1s infinite; }
  .call-status--held { background: #f0f9ff; }
  .call-status--error { background: #fef2f2; }
  .status-text { font-weight: 600; font-size: 0.9rem; color: var(--color-text, #1a1a1a); }
  .active-timer { font-variant-numeric: tabular-nums; color: #16a34a; font-size: 1.1rem; }
  .error-text { color: #dc2626; font-size: 0.82rem; }
  .dial-display { position: relative; margin-bottom: 1rem; }
  .dial-input { width: 100%; padding: 0.6rem 2.2rem 0.6rem 0.9rem; font-size: 1.1rem; text-align: center; border: 1px solid var(--color-border, #e5e2dc); border-radius: 8px; background: var(--color-bg, #faf9f7); font-variant-numeric: tabular-nums; letter-spacing: 0.05em; box-sizing: border-box; }
  .backspace-btn { position: absolute; right: 0.6rem; top: 50%; transform: translateY(-50%); background: none; border: none; cursor: pointer; font-size: 1rem; color: var(--color-text-muted, #9ca3af); }
  .dial-pad { display: flex; flex-direction: column; gap: 0.4rem; margin-bottom: 1rem; }
  .dial-row { display: flex; gap: 0.4rem; }
  .dial-key { flex: 1; aspect-ratio: 1.5; background: var(--color-bg, #faf9f7); border: 1px solid var(--color-border, #e5e2dc); border-radius: 8px; font-size: 1.1rem; font-weight: 600; cursor: pointer; transition: background 0.1s; color: var(--color-text, #1a1a1a); }
  .dial-key:hover { background: #f3f0eb; }
  .dial-key:active { background: #e8e3db; transform: scale(0.97); }
  .dialer-actions { display: flex; gap: 0.5rem; justify-content: center; }
  .btn { padding: 0.6rem 1.25rem; border-radius: 8px; border: none; font-weight: 600; font-size: 0.9rem; cursor: pointer; transition: opacity 0.15s; }
  .btn--call { background: #22c55e; color: #fff; flex: 1; }
  .btn--call:disabled { opacity: 0.4; cursor: not-allowed; }
  .btn--hangup { background: #ef4444; color: #fff; }
  .btn--hold { background: #f59e0b; color: #fff; }
  .btn--answer { background: #22c55e; color: #fff; }
  .mic-warning { font-size: 0.78rem; color: #b45309; text-align: center; margin-top: 0.75rem; background: #fffbeb; border-radius: 6px; padding: 0.4rem; }
  @keyframes pulse { 0%,100% { opacity:1; } 50% { opacity:0.6; } }
</style>
