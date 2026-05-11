<script lang="ts">
  import { formData, updateSection } from '../../stores/wizard';
  import GlassField from '../ui/GlassField.svelte';
  $: d = $formData.compliance;
</script>
<div class="space">
  <GlassField id="sosdate" label="SOS Filing Date" hint="Date you filed (or plan to file) with the Secretary of State.">
    <input id="sosdate" type="date" value={d.sosFilingDate}
      on:input={e => updateSection('compliance', { sosFilingDate: e.currentTarget.value })} />
  </GlassField>
  <label class="toggle-row">
    <div><span class="tl">Annual Report Required?</span><p class="th">Most states require annual/biennial reports + fees.</p></div>
    <div class="toggle" class:on={d.annualReportRequired} role="switch" aria-checked={d.annualReportRequired}
      on:click={() => updateSection('compliance', { annualReportRequired: !d.annualReportRequired })}
      on:keydown={e => e.key==='Enter' && updateSection('compliance',{annualReportRequired:!d.annualReportRequired})} tabindex="0">
      <div class="toggle-knob"></div></div>
  </label>
  <label class="toggle-row">
    <div><span class="tl">Sales Tax Permit Needed?</span><p class="th">Required if selling taxable goods/services to customers in your state.</p></div>
    <div class="toggle" class:on={d.salesTaxPermit} role="switch" aria-checked={d.salesTaxPermit}
      on:click={() => updateSection('compliance', { salesTaxPermit: !d.salesTaxPermit })}
      on:keydown={e => e.key==='Enter' && updateSection('compliance',{salesTaxPermit:!d.salesTaxPermit})} tabindex="0">
      <div class="toggle-knob"></div></div>
  </label>
  <div class="note">✅ Also check local city/county business licenses, professional licenses, and the BOI report (required federally for most LLCs formed after Jan 2024).</div>
</div>
<style>
  .space{display:flex;flex-direction:column;gap:20px}
  .toggle-row{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:14px 15px;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.09);border-radius:12px;cursor:pointer}
  .tl{font-size:14px;font-weight:500;color:rgba(255,255,255,0.75);display:block;margin-bottom:2px}
  .th{font-size:12px;color:rgba(255,255,255,0.32);margin:0;line-height:1.4}
  .toggle{width:44px;height:26px;background:rgba(255,255,255,0.14);border-radius:13px;position:relative;transition:background .2s;flex-shrink:0}
  .toggle.on{background:#30d158}
  .toggle-knob{position:absolute;top:3px;left:3px;width:20px;height:20px;background:white;border-radius:50%;transition:transform .2s cubic-bezier(0.34,1.56,0.64,1);box-shadow:0 1px 4px rgba(0,0,0,0.3)}
  .toggle.on .toggle-knob{transform:translateX(18px)}
  .note{font-size:13px;color:rgba(255,255,255,0.50);background:rgba(48,209,88,0.07);border:1px solid rgba(48,209,88,0.18);border-radius:12px;padding:13px 15px;line-height:1.5}
</style>
