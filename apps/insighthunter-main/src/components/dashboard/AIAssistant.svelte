<script lang="ts">
  import { onMount } from 'svelte';
  import Spinner from '../shared/Spinner.svelte';
  import { apiGet, apiPost, getToken } from '../../lib/api.js';

  interface Message { id: string; role: 'user' | 'assistant'; content: string; }
  interface Conversation { id: string; title: string; updated_at: string; }
  interface Usage { used: number; limit: number | null; }

  let conversations = $state<Conversation[]>([]);
  let activeConvId = $state<string | null>(null);
  let messages = $state<Message[]>([]);
  let input = $state('');
  let loading = $state(false);
  let streaming = $state(false);
  let streamingText = $state('');
  let usage = $state<Usage>({ used: 0, limit: null });
  let convLoading = $state(true);

  onMount(async () => {
    await loadConversations();
    await loadUsage();
    convLoading = false;
  });

  async function loadConversations() {
    try {
      conversations = await apiGet<Conversation[]>('/ai/conversations');
    } catch { conversations = []; }
  }

  async function loadUsage() {
    try {
      usage = await apiGet<Usage>('/ai/usage');
    } catch {}
  }

  async function newConversation() {
    const conv = await apiPost<Conversation>('/ai/conversations', { title: 'New Chat' });
    conversations = [conv, ...conversations];
    await selectConversation(conv.id);
  }

  async function selectConversation(id: string) {
    activeConvId = id;
    loading = true;
    try {
      const data = await apiGet<{ messages: Message[] }>(`/ai/conversations/${id}`);
      messages = data.messages ?? [];
    } catch { messages = []; }
    finally { loading = false; }
    scrollToBottom();
  }

  async function sendMessage() {
    if (!input.trim() || streaming) return;
    if (!activeConvId) await newConversation();
    if (!activeConvId) return;

    const userMsg: Message = { id: crypto.randomUUID(), role: 'user', content: input.trim() };
    messages = [...messages, userMsg];
    const sent = input.trim();
    input = '';
    streaming = true;
    streamingText = '';
    scrollToBottom();

    const token = getToken();
    const res = await fetch(`/api/ai/conversations/${activeConvId}/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ message: sent }),
    });

    if (!res.ok) {
      const err = await res.json() as { error?: string };
      messages = [...messages, { id: crypto.randomUUID(), role: 'assistant', content: `⚠ ${err.error ?? 'Error'}` }];
      streaming = false;
      return;
    }

    const reader = res.body!.getReader();
    const decoder = new TextDecoder();
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      const chunk = decoder.decode(value);
      for (const line of chunk.split('\n')) {
        if (line.startsWith('data: ') && !line.includes('[DONE]')) {
          try {
            const data = JSON.parse(line.slice(6)) as { response?: string };
            if (data.response) streamingText += data.response;
          } catch { /* skip malformed */ }
        }
      }
      scrollToBottom();
    }

    messages = [...messages, { id: crypto.randomUUID(), role: 'assistant', content: streamingText }];
    streamingText = '';
    streaming = false;
    await loadUsage();
    scrollToBottom();
  }

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  }

  function scrollToBottom() {
    setTimeout(() => {
      const el = document.getElementById('messages-end');
      el?.scrollIntoView({ behavior: 'smooth' });
    }, 50);
  }

  function formatTime(iso: string) {
    return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }
</script>

<div class="ai-assistant">
  <!-- Left panel: conversations -->
  <aside class="ai-sidebar">
    <div class="ai-sidebar__header">
      <span class="ai-sidebar__title">Conversations</span>
      <button class="btn btn--primary btn--sm" onclick={newConversation}>+ New</button>
    </div>

    {#if usage.limit !== null}
    <div class="usage-bar">
      <div class="usage-bar__label">
        <span>Today</span>
        <span>{usage.used} / {usage.limit} queries</span>
      </div>
      <div class="usage-bar__track">
        <div class="usage-bar__fill" style="width:{Math.min(100, usage.used / usage.limit * 100)}%"></div>
      </div>
    </div>
    {/if}

    <div class="ai-sidebar__list">
      {#if convLoading}
        <div style="display:flex;justify-content:center;padding:var(--space-6)"><Spinner /></div>
      {:else if conversations.length === 0}
        <p class="ai-sidebar__empty">No conversations yet. Start one!</p>
      {:else}
        {#each conversations as conv (conv.id)}
          <button
            class="conv-item {activeConvId === conv.id ? 'active' : ''}"
            onclick={() => selectConversation(conv.id)}
          >
            <span class="conv-item__title">{conv.title}</span>
            <span class="conv-item__date">{formatTime(conv.updated_at)}</span>
          </button>
        {/each}
      {/if}
    </div>
  </aside>

  <!-- Right panel: chat -->
  <div class="ai-chat">
    {#if !activeConvId}
      <div class="ai-welcome">
        <div class="ai-welcome__icon">✦</div>
        <h2>InsightHunter AI CFO</h2>
        <p>Ask me anything about your finances. I have access to your bookkeeping data, reports, and financial history.</p>
        <button class="btn btn--primary btn--lg" onclick={newConversation}>Start a conversation</button>
      </div>
    {:else}
      <div class="ai-messages" id="ai-messages">
        {#if loading}
          <div style="display:flex;justify-content:center;padding:var(--space-8)"><Spinner size={32} /></div>
        {:else}
          {#each messages as msg (msg.id)}
            <div class="message message--{msg.role}">
              <div class="message__bubble">{msg.content}</div>
            </div>
          {/each}
          {#if streaming && streamingText}
            <div class="message message--assistant">
              <div class="message__bubble">{streamingText}<span class="cursor">▋</span></div>
            </div>
          {:else if streaming}
            <div class="message message--assistant">
              <div class="message__bubble typing">
                <span></span><span></span><span></span>
              </div>
            </div>
          {/if}
          <div id="messages-end"></div>
        {/if}
      </div>

      <div class="ai-input">
        <textarea
          class="ai-input__textarea"
          bind:value={input}
          onkeydown={handleKeydown}
          placeholder="Ask about your finances… (Enter to send)"
          rows={3}
          disabled={streaming}
        ></textarea>
        <button class="btn btn--primary ai-input__send" onclick={sendMessage} disabled={streaming || !input.trim()}>
          {#if streaming}<Spinner size={16} />{:else}Send{/if}
        </button>
      </div>
    {/if}
  </div>
</div>

<style>
  .ai-assistant { display: flex; height: calc(100vh - var(--topbar-height) - var(--space-16)); gap: var(--space-6); }
  .ai-sidebar { width: 260px; flex-shrink: 0; display: flex; flex-direction: column; background: var(--color-surface); border: 1px solid var(--color-border); border-radius: var(--radius-lg); overflow: hidden; }
  .ai-sidebar__header { display: flex; align-items: center; justify-content: space-between; padding: var(--space-4); border-bottom: 1px solid var(--color-border); }
  .ai-sidebar__title { font-weight: 600; font-size: 0.875rem; }
  .ai-sidebar__list { flex: 1; overflow-y: auto; padding: var(--space-2); }
  .ai-sidebar__empty { padding: var(--space-4); font-size: 0.8125rem; color: var(--color-text-muted); text-align: center; }
  .usage-bar { padding: var(--space-3) var(--space-4); border-bottom: 1px solid var(--color-border); }
  .usage-bar__label { display: flex; justify-content: space-between; font-size: 0.75rem; color: var(--color-text-muted); margin-bottom: var(--space-1); }
  .usage-bar__track { height: 4px; background: var(--color-bg-subtle); border-radius: 2px; }
  .usage-bar__fill { height: 100%; background: var(--color-primary); border-radius: 2px; transition: width 0.3s; }
  .conv-item { width: 100%; display: flex; flex-direction: column; gap: 2px; padding: var(--space-3); border-radius: var(--radius-md); border: none; background: none; cursor: pointer; text-align: left; transition: background 0.15s; }
  .conv-item:hover { background: var(--color-bg-subtle); }
  .conv-item.active { background: var(--sand-100); }
  .conv-item__title { font-size: 0.8125rem; font-weight: 500; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .conv-item__date { font-size: 0.7rem; color: var(--color-text-muted); }
  .ai-chat { flex: 1; display: flex; flex-direction: column; background: var(--color-surface); border: 1px solid var(--color-border); border-radius: var(--radius-lg); overflow: hidden; }
  .ai-welcome { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; padding: var(--space-8); gap: var(--space-4); }
  .ai-welcome__icon { font-size: 3rem; color: var(--sand-500); }
  .ai-welcome h2 { font-family: var(--font-display); font-size: 1.5rem; }
  .ai-welcome p { color: var(--color-text-muted); max-width: 360px; font-size: 0.9rem; }
  .ai-messages { flex: 1; overflow-y: auto; padding: var(--space-6); display: flex; flex-direction: column; gap: var(--space-4); }
  .message { display: flex; }
  .message--user { justify-content: flex-end; }
  .message--assistant { justify-content: flex-start; }
  .message__bubble { max-width: 75%; padding: var(--space-3) var(--space-4); border-radius: var(--radius-lg); font-size: 0.875rem; line-height: 1.6; white-space: pre-wrap; }
  .message--user .message__bubble { background: var(--color-primary); color: white; border-bottom-right-radius: 4px; }
  .message--assistant .message__bubble { background: var(--color-bg-subtle); color: var(--color-text); border-bottom-left-radius: 4px; }
  .cursor { animation: blink 1s step-end infinite; }
  @keyframes blink { 50% { opacity: 0; } }
  .typing { display: flex; gap: 4px; align-items: center; padding: var(--space-4) !important; }
  .typing span { width: 6px; height: 6px; background: var(--color-text-muted); border-radius: 50%; animation: bounce 1.2s infinite; }
  .typing span:nth-child(2) { animation-delay: 0.2s; }
  .typing span:nth-child(3) { animation-delay: 0.4s; }
  @keyframes bounce { 0%,60%,100% { transform: translateY(0); } 30% { transform: translateY(-6px); } }
  .ai-input { display: flex; gap: var(--space-3); padding: var(--space-4); border-top: 1px solid var(--color-border); }
  .ai-input__textarea { flex: 1; resize: none; padding: var(--space-3); border: 1px solid var(--color-border); border-radius: var(--radius-md); font-family: var(--font-ui); font-size: 0.875rem; }
  .ai-input__textarea:focus { outline: none; border-color: var(--color-primary); }
  .ai-input__send { align-self: flex-end; min-width: 70px; justify-content: center; }
</style>
