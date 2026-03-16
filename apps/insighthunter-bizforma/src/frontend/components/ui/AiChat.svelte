<script lang="ts">
  import { streamChat } from '../../lib/api';
  import { onMount, tick } from 'svelte';

  export let context: string = '';
  export let onClose: () => void;

  interface Message { role: 'user' | 'assistant'; content: string; }

  let messages: Message[] = [
    { role: 'assistant', content: `Hi! I'm your Bizforma AI assistant. I can help answer questions about **${context}** or any part of your business formation. What would you like to know?` }
  ];
  let input = '';
  let loading = false;
  let scrollEl: HTMLElement;

  async function send() {
    const msg = input.trim();
    if (!msg || loading) return;
    input = '';
    messages = [...messages, { role: 'user', content: msg }];
    loading = true;

    // Streaming response
    const assistantMsg: Message = { role: 'assistant', content: '' };
    messages = [...messages, assistantMsg];
    const idx = messages.length - 1;

    await tick();
    scrollBottom();

    try {
      const stream = streamChat({ message: msg, context, history: messages.slice(1, -1) });
      for await (const chunk of stream) {
        messages[idx] = { ...messages[idx], content: messages[idx].content + chunk };
        messages = [...messages];
        scrollBottom();
      }
    } catch {
      messages[idx] = { ...messages[idx], content: 'Sorry, I ran into an error. Please try again.' };
      messages = [...messages];
    } finally {
      loading = false;
    }
  }

  function scrollBottom() {
    if (scrollEl) scrollEl.scrollTop = scrollEl.scrollHeight;
  }

  function onKey(e: KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); }
  }

  onMount(scrollBottom);
</script>

<!-- Backdrop -->
<div class="backdrop" on:click={onClose} aria-hidden="true"></div>

<!-- Sheet -->
<div class="sheet" role="dialog" aria-label="AI Business Assistant" aria-modal="true">
  <!-- Handle -->
  <div class="handle" aria-hidden="true"></div>

  <!-- Header -->
  <header class="sheet-header">
    <div class="header-icon">🤖</div>
    <div>
      <h2 class="header-title">Bizforma AI</h2>
      <p class="header-sub">Ask about {context}</p>
    </div>
    <button class="close-btn" on:click={onClose} aria-label="Close assistant">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
        <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
      </svg>
    </button>
  </header>

  <!-- Messages -->
  <div class="messages" bind:this={scrollEl} role="log" aria-live="polite">
    {#each messages as msg, i (i)}
      <div class="msg" class:user={msg.role === 'user'} class:assistant={msg.role === 'assistant'}>
        {#if msg.role === 'assistant'}
          <span class="msg-avatar" aria-hidden="true">⬡</span>
        {/if}
        <div class="msg-bubble">
          {msg.content || (loading && i === messages.length - 1 ? '…' : '')}
        </div>
      </div>
    {/each}
  </div>

  <!-- Input -->
  <div class="input-bar">
    <textarea
      bind:value={input}
      on:keydown={onKey}
      placeholder="Ask a formation question…"
      rows="1"
      disabled={loading}
      class="chat-input"
      aria-label="Chat input"
    ></textarea>
    <button class="send-btn" on:click={send} disabled={!input.trim() || loading} aria-label="Send message">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
        <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
      </svg>
    </button>
  </div>
</div>

<style>
  .backdrop {
    position: fixed; inset: 0;
    background: rgba(0,0,0,0.55);
    backdrop-filter: blur(4px);
    -webkit-backdrop-filter: blur(4px);
    z-index: 80;
    animation: fadeIn 0.2s ease both;
  }

  .sheet {
    position: fixed;
    bottom: 0; left: 0; right: 0;
    z-index: 90;
    background: var(--bg-elevated, #1c1c24);
    border-top: 1px solid rgba(255,255,255,0.10);
    border-radius: 20px 20px 0 0;
    padding-bottom: max(24px, env(safe-area-inset-bottom));
    max-height: 72dvh;
    display: flex; flex-direction: column;
    animation: slideUp 0.32s cubic-bezier(0.25, 0.46, 0.45, 0.94) both;

    /* Desktop: side panel */
  }
  @media (min-width: 640px) {
    .sheet {
      top: 52px; bottom: 0; right: 0; left: auto;
      width: 360px;
      border-radius: 0;
      border-left: 1px solid rgba(255,255,255,0.10);
      max-height: none;
      animation: slideRight 0.28s cubic-bezier(0.25, 0.46, 0.45, 0.94) both;
    }
  }

  .handle {
    width: 36px; height: 4px;
    background: rgba(255,255,255,0.18);
    border-radius: 2px;
    margin: 10px auto 0;
    flex-shrink: 0;
  }
  @media (min-width: 640px) { .handle { display: none; } }

  .sheet-header {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 16px 18px 12px;
    border-bottom: 1px solid rgba(255,255,255,0.07);
    flex-shrink: 0;
  }
  .header-icon {
    width: 36px; height: 36px;
    background: linear-gradient(135deg, #5e5ce6, #0a84ff);
    border-radius: 10px;
    display: flex; align-items: center; justify-content: center;
    font-size: 18px;
  }
  .header-title {
    font-size: 15px;
    font-weight: 600;
    color: rgba(255,255,255,0.92);
    margin: 0 0 1px;
    line-height: 1.2;
  }
  .header-sub {
    font-size: 12px;
    color: rgba(255,255,255,0.38);
    margin: 0;
  }
  .close-btn {
    margin-left: auto;
    width: 30px; height: 30px;
    border-radius: 8px;
    border: 1px solid rgba(255,255,255,0.12);
    background: rgba(255,255,255,0.06);
    color: rgba(255,255,255,0.55);
    display: flex; align-items: center; justify-content: center;
    cursor: pointer;
    transition: background 0.15s;
  }
  .close-btn:hover { background: rgba(255,255,255,0.12); color: rgba(255,255,255,0.85); }

  .messages {
    flex: 1;
    overflow-y: auto;
    padding: 16px;
    display: flex;
    flex-direction: column;
    gap: 12px;
    scroll-behavior: smooth;
  }
  .msg {
    display: flex;
    gap: 8px;
    align-items: flex-end;
  }
  .msg.user { flex-direction: row-reverse; }
  .msg-avatar {
    font-size: 18px;
    flex-shrink: 0;
    margin-bottom: 2px;
  }
  .msg-bubble {
    max-width: 85%;
    padding: 10px 13px;
    border-radius: 14px;
    font-size: 14px;
    line-height: 1.5;
    white-space: pre-wrap;
    word-break: break-word;
  }
  .assistant .msg-bubble {
    background: rgba(255,255,255,0.07);
    border: 1px solid rgba(255,255,255,0.09);
    color: rgba(255,255,255,0.85);
    border-bottom-left-radius: 4px;
  }
  .user .msg-bubble {
    background: rgba(10,132,255,0.22);
    border: 1px solid rgba(10,132,255,0.35);
    color: rgba(255,255,255,0.92);
    border-bottom-right-radius: 4px;
  }

  .input-bar {
    display: flex;
    gap: 8px;
    align-items: flex-end;
    padding: 12px 14px;
    border-top: 1px solid rgba(255,255,255,0.07);
    flex-shrink: 0;
  }
  .chat-input {
    flex: 1;
    background: rgba(255,255,255,0.07);
    border: 1px solid rgba(255,255,255,0.12);
    border-radius: 12px;
    padding: 9px 13px;
    color: rgba(255,255,255,0.88);
    font-size: 14px;
    font-family: var(--font-sans);
    resize: none;
    outline: none;
    transition: border-color 0.15s, background 0.15s;
    line-height: 1.5;
  }
  .chat-input::placeholder { color: rgba(255,255,255,0.28); }
  .chat-input:focus {
    border-color: rgba(10,132,255,0.45);
    background: rgba(255,255,255,0.09);
  }
  .send-btn {
    width: 36px; height: 36px;
    border-radius: 10px;
    background: #0a84ff;
    border: none;
    color: white;
    display: flex; align-items: center; justify-content: center;
    cursor: pointer;
    flex-shrink: 0;
    transition: background 0.15s, transform 0.1s;
  }
  .send-btn:disabled { background: rgba(10,132,255,0.3); cursor: not-allowed; }
  .send-btn:not(:disabled):hover { background: #1a8fff; }
  .send-btn:not(:disabled):active { transform: scale(0.94); }

  @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
  @keyframes slideUp {
    from { transform: translateY(100%); }
    to   { transform: translateY(0); }
  }
  @keyframes slideRight {
    from { transform: translateX(100%); }
    to   { transform: translateX(0); }
  }
</style>
