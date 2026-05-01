<script lang="ts">
  import { formData, updateSection } from '../../stores/wizard';
  import GlassField from '../ui/GlassField.svelte';
  $: d = $formData.registration;
</script>

<div class="space">
  <div class="info-banner">
    <span>📋</span>
    <span>Register with your Secretary of State. Delaware and Wyoming are popular for LLC formation even if you operate elsewhere.</span>
  </div>

  <GlassField id="agent" label="Registered Agent" hint="Person or service to receive legal documents. Required in most states.">
    <input id="agent" type="text" value={d.registeredAgent}
      on:input={e => updateSection('registration', { registeredAgent: e.currentTarget.value })}
      placeholder="Name or registered agent service…"
    />
  </GlassField>

  <GlassField id="bizaddr" label="Business Address" hint="Principal place of business.">
    <textarea id="bizaddr" rows="2" value={d.businessAddress}
      on:input={e => updateSection('registration', { businessAddress: e.currentTarget.value })}
      placeholder="123 Main St, City, State, ZIP"
    />
  </GlassField>

  <GlassField id="mailaddr" label="Mailing Address" hint="Leave blank if same as above.">
    <textarea id="mailaddr" rows="2" value={d.mailingAddress}
      on:input={e => updateSection('registration', { mailingAddress: e.currentTarget.value })}
      placeholder="Optional — if different from business address"
    />
  </GlassField>

  <div class="checklist">
    <p class="checklist-title">Registration Checklist</p>
    {#each ['Choose your state of formation','Reserve business name (if required)','File Articles of Organization / Incorporation','Pay state filing fee ($50–$500)','Get Registered Agent','Draft Operating Agreement / Bylaws'] as item}
      <div class="check-item">
        <span class="check-icon" aria-hidden="true">◯</span>
        <span>{item}</span>
      </div>
    {/each}
  </div>
</div>

<style>
  .space { display: flex; flex-direction: column; gap: 20px; }
  .info-banner {
    display: flex; gap: 10px; align-items: flex-start;
    background: rgba(10,132,255,0.08); border: 1px solid rgba(10,132,255,0.18);
    border-radius: 12px; padding: 13px 15px;
    font-size: 13px; color: rgba(255,255,255,0.60); line-height: 1.5;
  }
  .checklist { background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08); border-radius: 12px; padding: 14px; }
  .checklist-title { font-size: 12px; font-weight: 600; color: rgba(255,255,255,0.38); text-transform: uppercase; letter-spacing: 0.5px; margin: 0 0 10px; }
  .check-item { display: flex; gap: 9px; align-items: center; padding: 6px 0; font-size: 13px; color: rgba(255,255,255,0.58); border-bottom: 1px solid rgba(255,255,255,0.05); }
  .check-item:last-child { border-bottom: none; }
  .check-icon { color: rgba(255,255,255,0.20); font-size: 14px; }
</style>
