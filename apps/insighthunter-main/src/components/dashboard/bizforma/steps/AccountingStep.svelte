<script lang="ts">
  import { formData, updateSection } from '../../stores/wizard';
  import GlassField from '../ui/GlassField.svelte';
  $: d = $formData.accounting;
  const software = ['QuickBooks Online','Xero','Wave (Free)','FreshBooks','Bench','Pilot','Other'];
</script>
<div class="space">
  <div>
    <p class="sl">ACCOUNTING SOFTWARE</p>
    <div class="grid">
      {#each software as s}
        <button class="chip" class:sel={d.software===s} on:click={()=>updateSection('accounting',{software:s})}>{s}</button>
      {/each}
    </div>
  </div>
  <GlassField id="cpa" label="CPA / Accountant" hint="Name or firm handling your taxes. Can be found later.">
    <input id="cpa" type="text" value={d.accountant} on:input={e=>updateSection('accounting',{accountant:e.currentTarget.value})} placeholder="Jane Smith CPA or TBD…" />
  </GlassField>
  <GlassField id="taxstrat" label="Tax Strategy Notes">
    <textarea id="taxstrat" rows="3" value={d.taxStrategy} on:input={e=>updateSection('accounting',{taxStrategy:e.currentTarget.value})} placeholder="e.g. S-Corp election planned for 2026, maximize Section 179 deductions…" />
  </GlassField>
</div>
<style>
  .space{display:flex;flex-direction:column;gap:20px}
  .sl{font-size:11px;font-weight:600;letter-spacing:.8px;color:rgba(255,255,255,.35);margin:0 0 8px}
  .grid{display:flex;flex-wrap:wrap;gap:8px}
  .chip{padding:8px 14px;border-radius:20px;border:1.5px solid rgba(255,255,255,.10);background:rgba(255,255,255,.04);color:rgba(255,255,255,.60);font-size:13px;font-family:inherit;cursor:pointer;transition:all .15s}
  .chip.sel{border-color:rgba(10,132,255,.55);background:rgba(10,132,255,.14);color:#0a84ff}
  .chip:hover{border-color:rgba(255,255,255,.22);color:rgba(255,255,255,.85)}
</style>
