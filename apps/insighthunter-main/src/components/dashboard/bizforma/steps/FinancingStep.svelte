<script lang="ts">
  import { formData, updateSection } from '../../stores/wizard';
  import GlassField from '../ui/GlassField.svelte';
  $: d = $formData.financing;
  const sources = ['Personal savings','Family & friends','SBA loan','Bank loan','Angel investors','VC funding','Crowdfunding','Grants','Revenue-based financing'];
</script>
<div class="space">
  <GlassField id="costs" label="Estimated Startup Costs" hint="Total capital needed to launch.">
    <input id="costs" type="text" value={d.startupCosts} on:input={e=>updateSection('financing',{startupCosts:e.currentTarget.value})} placeholder="e.g. $25,000" />
  </GlassField>
  <div>
    <p class="sl">FUNDING SOURCES</p>
    <div class="grid">
      {#each sources as s}
        {@const sel = d.fundingSources.includes(s)}
        <button class="chip" class:sel on:click={()=>{ const arr=d.fundingSources.split(',').map(x=>x.trim()).filter(Boolean); const next=sel?arr.filter(x=>x!==s):[...arr,s]; updateSection('financing',{fundingSources:next.join(', ')}); }}>{s}</button>
      {/each}
    </div>
  </div>
  <GlassField id="bank" label="Business Bank Account" hint="Keep personal and business finances strictly separate.">
    <input id="bank" type="text" value={d.businessAccount} on:input={e=>updateSection('financing',{businessAccount:e.currentTarget.value})} placeholder="e.g. Chase Business Checking, Mercury…" />
  </GlassField>
  <div class="note">🏦 Open a dedicated business bank account immediately after receiving your EIN. This is critical for liability protection.</div>
</div>
<style>
  .space{display:flex;flex-direction:column;gap:20px}
  .sl{font-size:11px;font-weight:600;letter-spacing:.8px;color:rgba(255,255,255,.35);margin:0 0 8px}
  .grid{display:flex;flex-wrap:wrap;gap:8px}
  .chip{padding:8px 14px;border-radius:20px;border:1.5px solid rgba(255,255,255,.10);background:rgba(255,255,255,.04);color:rgba(255,255,255,.60);font-size:13px;font-family:inherit;cursor:pointer;transition:all .15s}
  .chip.sel{border-color:rgba(255,159,10,.55);background:rgba(255,159,10,.12);color:#ff9f0a}
  .chip:hover{border-color:rgba(255,255,255,.22);color:rgba(255,255,255,.85)}
  .note{font-size:13px;color:rgba(255,255,255,.50);background:rgba(255,159,10,.07);border:1px solid rgba(255,159,10,.18);border-radius:12px;padding:13px 15px;line-height:1.5}
</style>
