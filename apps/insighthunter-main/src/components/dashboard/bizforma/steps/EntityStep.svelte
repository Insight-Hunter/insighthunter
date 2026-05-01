<script lang="ts">
  import { formData, updateSection } from '../../stores/wizard';
  import GlassField from '../ui/GlassField.svelte';
  import { getEntityRec } from '../../lib/api';
  import type { EntityRec } from '../../lib/api';

  $: d = $formData.entity;
  $: idea = $formData.concept.businessIdea;

  const entityTypes = [
    { value: 'LLC',          label: 'LLC',              desc: 'Flexible, pass-through tax, liability protection. Most popular.' },
    { value: 'S-Corp',       label: 'S-Corp',           desc: 'Reduces self-employment tax. Max 100 US shareholders.' },
    { value: 'C-Corp',       label: 'C-Corp',           desc: 'Best for VC funding and going public. Double-taxed.' },
    { value: 'Sole-Prop',    label: 'Sole Proprietorship', desc: 'Simplest. No liability separation.' },
    { value: 'Partnership',  label: 'Partnership',      desc: '2+ owners. General or limited.' },
  ];

  const states = ['Alabama','Alaska','Arizona','Arkansas','California','Colorado','Connecticut','Delaware',
    'Florida','Georgia','Hawaii','Idaho','Illinois','Indiana','Iowa','Kansas','Kentucky','Louisiana','Maine',
    'Maryland','Massachusetts','Michigan','Minnesota','Mississippi','Missouri','Montana','Nebraska','Nevada',
    'New Hampshire','New Jersey','New Mexico','New York','North Carolina','North Dakota','Ohio','Oklahoma',
    'Oregon','Pennsylvania','Rhode Island','South Carolina','South Dakota','Tennessee','Texas','Utah',
    'Vermont','Virginia','Washington','West Virginia','Wisconsin','Wyoming'];

  let loading = false;
  let rec: EntityRec | null = null;

  async function getAiRec() {
    loading = true;
    try {
      rec = await getEntityRec({
        businessIdea: idea,
        owners: parseInt(d.owners) || 1,
        state: d.state,
        liabilityPriority: true,
      });
      if (rec?.recommended) updateSection('entity', { type: rec.recommended });
    } catch { /* ignore */ }
    finally { loading = false; }
  }
</script>

<div class="space">
  <!-- Entity type grid -->
  <div>
    <p class="section-label">ENTITY TYPE</p>
    <div class="entity-grid" role="radiogroup" aria-label="Select entity type">
      {#each entityTypes as et}
        <button
          class="entity-card"
          class:selected={d.type === et.value}
          role="radio"
          aria-checked={d.type === et.value}
          on:click={() => updateSection('entity', { type: et.value })}
        >
          <span class="entity-label">{et.label}</span>
          <span class="entity-desc">{et.desc}</span>
        </button>
      {/each}
    </div>
  </div>

  <GlassField id="state" label="State of Formation">
    <select id="state" value={d.state}
      on:change={e => updateSection('entity', { state: e.currentTarget.value })}>
      <option value="">Select a state…</option>
      {#each states as s}
        <option value={s}>{s}</option>
      {/each}
    </select>
  </GlassField>

  <GlassField id="owners" label="Number of Owners / Members">
    <input id="owners" type="number" min="1" max="500" value={d.owners}
      on:input={e => updateSection('entity', { owners: e.currentTarget.value })}
      placeholder="1"
    />
  </GlassField>

  <!-- AI Recommendation -->
  <div class="ai-box">
    <div class="ai-header">
      <span class="ai-badge">✦ AI</span>
      <span>Get a personalized entity recommendation</span>
    </div>
    <button class="ai-btn" on:click={getAiRec} disabled={loading || !idea.trim()}>
      {loading ? 'Analyzing…' : '✦ Recommend Entity Type'}
    </button>

    {#if rec}
      <div class="rec-card">
        <div class="rec-top">
          <span class="rec-label">Recommended</span>
          <span class="rec-type">{rec.recommended}</span>
        </div>
        <p class="rec-reasoning">{rec.reasoning}</p>
        <div class="rec-cols">
          <div>
            <p class="rec-list-label pros">Pros</p>
            <ul class="rec-list">
              {#each rec.pros as pro}<li>{pro}</li>{/each}
            </ul>
          </div>
          <div>
            <p class="rec-list-label cons">Cons</p>
            <ul class="rec-list">
              {#each rec.cons as con}<li>{con}</li>{/each}
            </ul>
          </div>
        </div>
        {#if rec.taxNote}
          <p class="rec-tax">💰 {rec.taxNote}</p>
        {/if}
      </div>
    {/if}
  </div>
</div>

<style>
  .space { display: flex; flex-direction: column; gap: 20px; }
  .section-label {
    font-size: 11px; font-weight: 600; letter-spacing: 0.8px;
    color: rgba(255,255,255,0.35); margin: 0 0 8px;
  }
  .entity-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
    gap: 8px;
  }
  .entity-card {
    background: rgba(255,255,255,0.04);
    border: 1.5px solid rgba(255,255,255,0.09);
    border-radius: 12px;
    padding: 12px 13px;
    cursor: pointer;
    text-align: left;
    font-family: inherit;
    transition: all 0.15s;
    display: flex; flex-direction: column; gap: 4px;
  }
  .entity-card:hover { border-color: rgba(10,132,255,0.35); background: rgba(10,132,255,0.05); }
  .entity-card.selected {
    border-color: rgba(10,132,255,0.60);
    background: rgba(10,132,255,0.12);
    box-shadow: 0 0 0 3px rgba(10,132,255,0.08);
  }
  .entity-label { font-size: 14px; font-weight: 600; color: rgba(255,255,255,0.88); }
  .entity-desc { font-size: 11px; color: rgba(255,255,255,0.38); line-height: 1.4; }

  .ai-box {
    background: rgba(94,92,230,0.07);
    border: 1px solid rgba(94,92,230,0.18);
    border-radius: 14px;
    padding: 16px;
    display: flex; flex-direction: column; gap: 12px;
  }
  .ai-header { display: flex; align-items: center; gap: 8px; font-size: 13px; color: rgba(255,255,255,0.50); }
  .ai-badge { font-size: 11px; font-weight: 700; color: #5e5ce6; background: rgba(94,92,230,0.15); border: 1px solid rgba(94,92,230,0.30); border-radius: 6px; padding: 2px 7px; }
  .ai-btn { align-self: flex-start; padding: 9px 18px; border-radius: 10px; background: rgba(94,92,230,0.22); border: 1px solid rgba(94,92,230,0.40); color: #a78bfa; font-size: 14px; font-weight: 600; font-family: inherit; cursor: pointer; transition: background 0.15s; }
  .ai-btn:disabled { opacity: 0.5; cursor: not-allowed; }
  .ai-btn:hover:not(:disabled) { background: rgba(94,92,230,0.32); }

  .rec-card {
    background: rgba(255,255,255,0.04);
    border: 1px solid rgba(255,255,255,0.09);
    border-radius: 12px;
    padding: 14px;
    display: flex; flex-direction: column; gap: 10px;
  }
  .rec-top { display: flex; align-items: center; gap: 10px; }
  .rec-label { font-size: 11px; font-weight: 600; color: rgba(255,255,255,0.35); text-transform: uppercase; }
  .rec-type { font-size: 20px; font-weight: 700; color: #0a84ff; }
  .rec-reasoning { font-size: 13px; color: rgba(255,255,255,0.60); margin: 0; line-height: 1.5; }
  .rec-cols { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
  .rec-list-label { font-size: 11px; font-weight: 600; text-transform: uppercase; margin: 0 0 5px; }
  .rec-list-label.pros { color: #30d158; }
  .rec-list-label.cons { color: #ff453a; }
  .rec-list { margin: 0; padding-left: 16px; }
  .rec-list li { font-size: 12px; color: rgba(255,255,255,0.55); line-height: 1.6; }
  .rec-tax { font-size: 12px; color: rgba(255,165,10,0.80); margin: 0; background: rgba(255,165,10,0.08); border-radius: 8px; padding: 8px 10px; }
</style>
