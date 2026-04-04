<script lang="ts">
  import { formData, updateSection } from '../../stores/wizard';
  import GlassField from '../ui/GlassField.svelte';
  $: d = $formData.concept;
</script>

<div class="space">
  <GlassField id="idea" label="Business Idea" hint="Describe your concept in detail — the more specific, the better.">
    <textarea id="idea" rows="4" value={d.businessIdea}
      on:input={e => updateSection('concept', { businessIdea: e.currentTarget.value })}
      placeholder="e.g. A subscription service delivering curated local artisan food boxes monthly…"
    />
  </GlassField>

  <GlassField id="market" label="Target Market" hint="Who are your ideal customers?">
    <textarea id="market" rows="3" value={d.targetMarket}
      on:input={e => updateSection('concept', { targetMarket: e.currentTarget.value })}
      placeholder="e.g. Urban millennials aged 28–40 interested in sustainable food…"
    />
  </GlassField>

  <GlassField id="products" label="Products & Services">
    <textarea id="products" rows="3" value={d.products}
      on:input={e => updateSection('concept', { products: e.currentTarget.value })}
      placeholder="List your main offerings…"
    />
  </GlassField>

  <GlassField id="value" label="Unique Value Proposition" hint="What makes you different from competitors?">
    <textarea id="value" rows="3" value={d.uniqueValue}
      on:input={e => updateSection('concept', { uniqueValue: e.currentTarget.value })}
      placeholder="Your competitive advantage…"
    />
  </GlassField>

  <div class="tip" role="note">
    <span class="tip-icon" aria-hidden="true">💡</span>
    <span><strong>Tip:</strong> A clear concept guides every decision ahead. Spend time refining this before continuing.</span>
  </div>
</div>

<style>
  .space { display: flex; flex-direction: column; gap: 20px; }
  .tip {
    display: flex; gap: 10px; align-items: flex-start;
    background: rgba(94,92,230,0.08);
    border: 1px solid rgba(94,92,230,0.20);
    border-radius: 12px;
    padding: 13px 15px;
    font-size: 14px;
    color: rgba(255,255,255,0.65);
    line-height: 1.5;
  }
  .tip strong { color: rgba(94,92,230,0.9); }
  .tip-icon { font-size: 18px; flex-shrink: 0; margin-top: 1px; }
</style>
