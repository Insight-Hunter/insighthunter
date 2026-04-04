<script lang="ts">
  import { formData, updateSection } from '../../stores/wizard';
  import GlassField from '../ui/GlassField.svelte';
  $: d = $formData.einTax;

  const taxElections = [
    { value: 'default-llc',  label: 'Default LLC (Disregarded / Partnership)' },
    { value: 's-corp',       label: 'S-Corp Election (Form 2553)' },
    { value: 'c-corp',       label: 'C-Corp (Default for Corporations)' },
    { value: 'sole-prop',    label: 'Sole Proprietor (Schedule C)' },
  ];
</script>

<div class="space">
  <div class="info-banner">
    <span>🔢</span>
    <span>Your EIN (Employer Identification Number) is your business's federal tax ID. Apply free at <strong>irs.gov/ein</strong> — takes under 10 minutes online.</span>
  </div>

  <label class="toggle-row">
    <div>
      <span class="toggle-label">EIN Applied / Obtained?</span>
      <p class="toggle-hint">Check this once you've received your EIN from the IRS.</p>
    </div>
    <div class="toggle" class:on={d.einApplied} role="switch" aria-checked={d.einApplied}
      on:click={() => updateSection('einTax', { einApplied: !d.einApplied })}
      on:keydown={e => e.key === 'Enter' && updateSection('einTax', { einApplied: !d.einApplied })}
      tabindex="0">
      <div class="toggle-knob"></div>
    </div>
  </label>

  {#if d.einApplied}
    <GlassField id="einnum" label="EIN Number" hint="Format: XX-XXXXXXX">
      <input id="einnum" type="text" value={d.einNumber}
        on:input={e => updateSection('einTax', { einNumber: e.currentTarget.value })}
        placeholder="12-3456789"
        maxlength="10"
      />
    </GlassField>
  {/if}

  <div>
    <p class="section-label">TAX ELECTION</p>
    <div class="election-list" role="radiogroup">
      {#each taxElections as te}
        <button class="election-card" class:selected={d.taxElection === te.value}
          role="radio" aria-checked={d.taxElection === te.value}
          on:click={() => updateSection('einTax', { taxElection: te.value })}>
          <span class="radio-dot" class:on={d.taxElection === te.value}></span>
          <span>{te.label}</span>
        </button>
      {/each}
    </div>
  </div>

  <div class="tip">
    <span class="tip-icon">⚡</span>
    <span><strong>S-Corp tip:</strong> If your LLC earns $50K+ net profit, S-Corp election may save thousands in self-employment taxes. Consult a CPA.</span>
  </div>
</div>

<style>
  .space { display: flex; flex-direction: column; gap: 20px; }
  .info-banner { display: flex; gap: 10px; background: rgba(10,132,255,0.08); border: 1px solid rgba(10,132,255,0.18); border-radius: 12px; padding: 13px 15px; font-size: 13px; color: rgba(255,255,255,0.60); line-height: 1.5; }
  .info-banner strong { color: #0a84ff; }

  .toggle-row { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 14px 15px; background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.09); border-radius: 12px; cursor: pointer; }
  .toggle-label { font-size: 14px; font-weight: 500; color: rgba(255,255,255,0.75); display: block; margin-bottom: 2px; }
  .toggle-hint { font-size: 12px; color: rgba(255,255,255,0.32); margin: 0; line-height: 1.4; }
  .toggle { width: 44px; height: 26px; background: rgba(255,255,255,0.14); border-radius: 13px; position: relative; transition: background 0.2s; flex-shrink: 0; }
  .toggle.on { background: #30d158; }
  .toggle-knob { position: absolute; top: 3px; left: 3px; width: 20px; height: 20px; background: white; border-radius: 50%; transition: transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1); box-shadow: 0 1px 4px rgba(0,0,0,0.3); }
  .toggle.on .toggle-knob { transform: translateX(18px); }

  .section-label { font-size: 11px; font-weight: 600; letter-spacing: 0.8px; color: rgba(255,255,255,0.35); margin: 0 0 8px; }
  .election-list { display: flex; flex-direction: column; gap: 6px; }
  .election-card { display: flex; align-items: center; gap: 10px; padding: 12px 14px; background: rgba(255,255,255,0.04); border: 1.5px solid rgba(255,255,255,0.08); border-radius: 11px; cursor: pointer; font-size: 14px; color: rgba(255,255,255,0.65); font-family: inherit; text-align: left; transition: all 0.15s; }
  .election-card.selected { border-color: rgba(10,132,255,0.50); background: rgba(10,132,255,0.10); color: rgba(255,255,255,0.88); }
  .radio-dot { width: 16px; height: 16px; border-radius: 50%; border: 2px solid rgba(255,255,255,0.25); flex-shrink: 0; transition: all 0.15s; }
  .radio-dot.on { border-color: #0a84ff; background: #0a84ff; box-shadow: 0 0 0 3px rgba(10,132,255,0.20); }
  .tip { display: flex; gap: 10px; background: rgba(255,159,10,0.08); border: 1px solid rgba(255,159,10,0.20); border-radius: 12px; padding: 13px 15px; font-size: 13px; color: rgba(255,255,255,0.60); line-height: 1.5; }
  .tip strong { color: #ff9f0a; }
  .tip-icon { font-size: 18px; flex-shrink: 0; }
</style>
