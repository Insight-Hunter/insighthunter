<script lang="ts">
  import type { WizardStep } from '../../stores/wizard';

  export let steps: WizardStep[];
  export let current: number;
  export let onStepClick: (n: number) => void;

  $: pct = Math.round(((current - 1) / (steps.length - 1)) * 100);
</script>

<div class="progress-wrap" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label="Formation progress">
  <!-- Thin rail -->
  <div class="rail" aria-hidden="true">
    <div class="fill" style="width: {pct}%"></div>
  </div>

  <!-- Step pills (desktop) -->
  <div class="pills" aria-hidden="true">
    {#each steps as step}
      {@const done = step.id < current}
      {@const active = step.id === current}
      <button
        class="pill"
        class:done
        class:active
        on:click={() => onStepClick(step.id)}
        tabindex="-1"
        title={step.name}
      >
        {#if done}
          <svg width="10" height="10" viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="2.2">
            <polyline points="2 6 5 9 10 3"/>
          </svg>
        {:else}
          <span>{step.id}</span>
        {/if}
      </button>
    {/each}
  </div>

  <!-- Current step label -->
  <div class="label">
    <span class="label-text">{current} of {steps.length} — {steps[current - 1]?.name}</span>
    <span class="label-pct">{pct}%</span>
  </div>
</div>

<style>
  .progress-wrap {
    position: sticky;
    top: 52px;
    z-index: 40;
    background: var(--material-chrome, rgba(12,12,20,0.88));
    backdrop-filter: saturate(160%) blur(16px);
    -webkit-backdrop-filter: saturate(160%) blur(16px);
    border-bottom: 1px solid rgba(255,255,255,0.06);
    padding: 8px max(16px, env(safe-area-inset-left));
  }

  /* Thin progress rail */
  .rail {
    height: 3px;
    background: rgba(255,255,255,0.07);
    border-radius: 2px;
    overflow: hidden;
    margin-bottom: 8px;
  }
  .fill {
    height: 100%;
    background: linear-gradient(90deg, #5e5ce6, #0a84ff, #30d158);
    border-radius: 2px;
    transition: width 0.5s cubic-bezier(0.25, 0.46, 0.45, 0.94);
    box-shadow: 0 0 8px rgba(10,132,255,0.4);
  }

  /* Pills row */
  .pills {
    display: none;
    gap: 4px;
    justify-content: space-between;
    margin-bottom: 6px;
  }
  @media (min-width: 640px) { .pills { display: flex; } }

  .pill {
    width: 24px; height: 24px;
    border-radius: 50%;
    display: flex; align-items: center; justify-content: center;
    font-size: 10px;
    font-weight: 600;
    border: 1.5px solid rgba(255,255,255,0.10);
    background: rgba(255,255,255,0.04);
    color: rgba(255,255,255,0.28);
    cursor: pointer;
    transition: all 0.2s;
    padding: 0;
    font-family: var(--font-sans);
  }
  .pill.done {
    background: rgba(48,209,88,0.15);
    border-color: rgba(48,209,88,0.40);
    color: #30d158;
  }
  .pill.active {
    background: rgba(10,132,255,0.2);
    border-color: rgba(10,132,255,0.5);
    color: #0a84ff;
    box-shadow: 0 0 10px rgba(10,132,255,0.3);
  }
  .pill:hover { border-color: rgba(255,255,255,0.25); color: rgba(255,255,255,0.6); }

  /* Label row */
  .label {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  .label-text {
    font-size: 12px;
    font-weight: 500;
    color: rgba(255,255,255,0.40);
    letter-spacing: 0.1px;
  }
  .label-pct {
    font-size: 11px;
    font-weight: 600;
    color: rgba(10,132,255,0.8);
    font-variant-numeric: tabular-nums;
  }
</style>
