<script lang="ts">
  import { formData, updateSection } from '../../stores/wizard';
  import GlassField from '../ui/GlassField.svelte';
  import { getNameSuggestions } from '../../lib/api';
  import type { NameSuggestion } from '../../lib/api';

  $: d = $formData.naming;
  $: idea = $formData.concept.businessIdea;

  let loading = false;
  let suggestions: NameSuggestion[] = [];
  let error = '';

  async function suggest() {
    if (!idea.trim()) { error = 'Add a business idea in Step 1 first.'; return; }
    loading = true; error = '';
    try {
      suggestions = await getNameSuggestions(idea, '', 'modern and professional');
    } catch { error = 'AI suggestions unavailable. Try again.'; }
    finally { loading = false; }
  }

  function pick(name: string) {
    updateSection('naming', { businessName: name });
  }
</script>

<div class="space">
  <GlassField id="bizname" label="Business Name" hint="This will be your official registered name.">
    <input id="bizname" type="text" value={d.businessName}
      on:input={e => updateSection('naming', { businessName: e.currentTarget.value })}
      placeholder="Acme Ventures LLC"
    />
  </GlassField>

  <GlassField id="altnames" label="Alternate Names" hint="DBA or trade names you plan to use.">
    <input id="altnames" type="text" value={d.alternateNames}
      on:input={e => updateSection('naming', { alternateNames: e.currentTarget.value })}
      placeholder="Comma-separated alternatives…"
    />
  </GlassField>

  <!-- AI Suggestions -->
  <div class="ai-panel">
    <div class="ai-header">
      <span class="ai-badge">✦ AI</span>
      <span class="ai-label">Get name suggestions from your business idea</span>
    </div>
    <button class="ai-btn" on:click={suggest} disabled={loading} aria-busy={loading}>
      {loading ? 'Generating…' : '✦ Suggest Names with AI'}
    </button>
    {#if error}<p class="error">{error}</p>{/if}

    {#if suggestions.length}
      <div class="suggestions" role="list">
        {#each suggestions as s}
          <button class="sug-card" role="listitem" on:click={() => pick(s.name)}>
            <div class="sug-name">{s.name}</div>
            <div class="sug-domain">🌐 {s.domain}</div>
            <div class="sug-rationale">{s.rationale}</div>
          </button>
        {/each}
      </div>
    {/if}
  </div>

  <!-- Domain check toggle -->
  <label class="toggle-row">
    <span>Domain name available?</span>
    <div class="toggle" class:on={d.domainAvailable} role="switch" aria-checked={d.domainAvailable}
      on:click={() => updateSection('naming', { domainAvailable: !d.domainAvailable })}
      on:keydown={e => e.key === 'Enter' && updateSection('naming', { domainAvailable: !d.domainAvailable })}
      tabindex="0"
    >
      <div class="toggle-knob"></div>
    </div>
  </label>
</div>

<style>
  .space { display: flex; flex-direction: column; gap: 20px; }

  .ai-panel {
    background: rgba(94,92,230,0.07);
    border: 1px solid rgba(94,92,230,0.18);
    border-radius: 14px;
    padding: 16px;
    display: flex; flex-direction: column; gap: 12px;
  }
  .ai-header { display: flex; align-items: center; gap: 8px; }
  .ai-badge {
    font-size: 11px; font-weight: 700;
    color: #5e5ce6;
    background: rgba(94,92,230,0.15);
    border: 1px solid rgba(94,92,230,0.30);
    border-radius: 6px;
    padding: 2px 7px;
    letter-spacing: 0.3px;
  }
  .ai-label { font-size: 13px; color: rgba(255,255,255,0.50); }

  .ai-btn {
    align-self: flex-start;
    padding: 9px 18px;
    border-radius: 10px;
    background: rgba(94,92,230,0.22);
    border: 1px solid rgba(94,92,230,0.40);
    color: #a78bfa;
    font-size: 14px;
    font-weight: 600;
    font-family: inherit;
    cursor: pointer;
    transition: background 0.15s, transform 0.1s;
  }
  .ai-btn:hover:not(:disabled) { background: rgba(94,92,230,0.32); }
  .ai-btn:active:not(:disabled) { transform: scale(0.97); }
  .ai-btn:disabled { opacity: 0.5; cursor: not-allowed; }

  .error { font-size: 13px; color: #ff453a; margin: 0; }

  .suggestions {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
    gap: 8px;
  }
  .sug-card {
    background: rgba(255,255,255,0.05);
    border: 1px solid rgba(255,255,255,0.10);
    border-radius: 11px;
    padding: 11px 13px;
    cursor: pointer;
    text-align: left;
    font-family: inherit;
    transition: background 0.15s, border-color 0.15s, transform 0.1s;
  }
  .sug-card:hover {
    background: rgba(94,92,230,0.14);
    border-color: rgba(94,92,230,0.35);
  }
  .sug-card:active { transform: scale(0.97); }
  .sug-name { font-size: 14px; font-weight: 600; color: rgba(255,255,255,0.88); margin-bottom: 3px; }
  .sug-domain { font-size: 11px; color: rgba(10,132,255,0.80); margin-bottom: 5px; }
  .sug-rationale { font-size: 12px; color: rgba(255,255,255,0.38); line-height: 1.4; }

  /* Toggle */
  .toggle-row {
    display: flex; align-items: center; justify-content: space-between;
    padding: 13px 15px;
    background: rgba(255,255,255,0.04);
    border: 1px solid rgba(255,255,255,0.09);
    border-radius: 12px;
    font-size: 14px;
    color: rgba(255,255,255,0.65);
    cursor: pointer;
  }
  .toggle {
    width: 44px; height: 26px;
    background: rgba(255,255,255,0.14);
    border-radius: 13px;
    position: relative;
    transition: background 0.2s;
    flex-shrink: 0;
    cursor: pointer;
  }
  .toggle.on { background: #30d158; }
  .toggle-knob {
    position: absolute;
    top: 3px; left: 3px;
    width: 20px; height: 20px;
    background: white;
    border-radius: 50%;
    transition: transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1);
    box-shadow: 0 1px 4px rgba(0,0,0,0.3);
  }
  .toggle.on .toggle-knob { transform: translateX(18px); }
</style>
