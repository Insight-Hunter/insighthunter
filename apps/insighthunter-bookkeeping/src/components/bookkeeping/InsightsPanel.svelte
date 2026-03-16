
<script lang="ts">
  import { onMount } from 'svelte';

  export let clientId: string;
  export let clientName: string;
  export let financialContext: Record<string, unknown> = {};

  let agentId = '';
  let ready = false;
  let plan = 'lite';
  let messages: Array<{ role: string; content: string }> = [];
  let input = '';
  let streaming = false;
  let error = '';
  let upgradeUrl = '';

  onMount(async () => {
    const token = localStorage.getItem('ih_token');
    if (!token) return;

    // Use userId as stable agentId so history persists across sessions
    agentId = `${JSON.parse(atob(token.split('.')[1] ?? '') || '{}').sub ?? clientId}-cfo`;

    const res = await fetch(`/api/agents/cfo/${agentId}/init`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, clientId, clientName, financialContext }),
    });
    const data = await res.json();

    if (res.status === 402) {
      error = data.error;
      upgradeUrl = data.upgrade_url;
      return;
    }
    ready = data.ready;
    plan = data.plan;
  });

  async function sendMessage() {
    if (!input.trim() || streaming) return;
    const userMsg = input.trim();
    messages = [...messages, { role: 'user', content: userMsg }];
    input = '';
    streaming = true;

    const res = await fetch(`/api/agents/cfo/${agentId}/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: userMsg }),
    });

    // Handle SSE stream
    const reader = res.body!.getReader();
    const decoder = new TextDecoder();
    let assistantMsg = '';
    messages = [...messages, { role: 'assistant', content: '' }];

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      const lines = decoder.decode(value).split('\n');
      for (const line of lines) {
        if (line.startsWith('data: ') && !line.includes('[DONE]')) {
          const { text } = JSON.parse(line.slice(6));
          assistantMsg += text;
          messages = [...messages.slice(0, -1), { role: 'assistant', content: assistantMsg }];
        }
      }
    }
    streaming = false;
  }
</script>

{#if upgradeUrl}
  <div class="upgrade-prompt">
    <p>🔒 {error}</p>
    <a href={upgradeUrl} class="btn-upgrade">Upgrade to Standard</a>
  </div>
{:else if !ready}
  <div class="loading">Initializing CFO Agent...</div>
{:else}
  <div class="insights-panel">
    <div class="chat-header">
      <span class="badge badge-{plan}">{plan.toUpperCase()}</span>
      <h3>AI CFO Assistant — {clientName}</h3>
    </div>

    <div class="messages">
      {#each messages as msg}
        <div class="message {msg.role}">
          <span class="bubble">{msg.content}</span>
        </div>
      {/each}
      {#if streaming}
        <div class="message assistant typing">
          <span class="bubble">▌</span>
        </div>
      {/if}
    </div>

    <div class="input-row">
      <input
        bind:value={input}
        on:keydown={(e) => e.key === 'Enter' && sendMessage()}
        placeholder="Ask your CFO anything..."
        disabled={streaming}
      />
      <button on:click={sendMessage} disabled={streaming || !input.trim()}>
        {streaming ? '...' : 'Send'}
      </button>
    </div>
  </div>
{/if}
