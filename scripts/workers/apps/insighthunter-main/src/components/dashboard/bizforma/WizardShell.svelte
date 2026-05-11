<script lang="ts">
  import { onMount } from 'svelte';
  import {
    currentStep, formData, isSaving,
    STEPS, currentStepDef, progressPercent,
    isFirstStep, isLastStep,
    nextStep, prevStep, goToStep,
    initSession, downloadSummary
  } from '../stores/wizard';

  // Lazy-load step components
  import ConceptStep      from './steps/ConceptStep.svelte';
  import NamingStep       from './steps/NamingStep.svelte';
  import EntityStep       from './steps/EntityStep.svelte';
  import RegistrationStep from './steps/RegistrationStep.svelte';
  import EINTaxStep       from './steps/EINTaxStep.svelte';
  import ComplianceStep   from './steps/ComplianceStep.svelte';
  import AccountingStep   from './steps/AccountingStep.svelte';
  import FinancingStep    from './steps/FinancingStep.svelte';
  import MarketingStep    from './steps/MarketingStep.svelte';
  import WebDesignStep    from './steps/WebDesignStep.svelte';
  import CalendarStep     from './steps/CalendarStep.svelte';
  import ProgressBar      from './ui/ProgressBar.svelte';
  import AiChat           from './ui/AiChat.svelte';

  let chatOpen = false;
  let mounted = false;

  onMount(async () => {
    await initSession();
    mounted = true;
  });

  const stepComponents = [
    ConceptStep, NamingStep, EntityStep, RegistrationStep, EINTaxStep,
    ComplianceStep, AccountingStep, FinancingStep, MarketingStep,
    WebDesignStep, CalendarStep
  ];

  $: StepComponent = stepComponents[$currentStep - 1];
</script>

<!-- ── Background mesh ─────────────────────────────────────────────────── -->
<div class="app-bg" aria-hidden="true">
  <div class="mesh mesh-1"></div>
  <div class="mesh mesh-2"></div>
  <div class="mesh mesh-3"></div>
  <div class="grid-overlay"></div>
</div>

<!-- ── Navigation bar (Apple HIG) ──────────────────────────────────────── -->
<nav class="nav-bar" role="navigation" aria-label="App navigation">
  <div class="nav-inner">
    <div class="nav-brand">
      <span class="nav-logo" aria-hidden="true">⬡</span>
      <span class="nav-title">Bizforma</span>
      <span class="nav-badge">by InsightHunters</span>
    </div>

    <div class="nav-actions">
      {#if $isSaving}
        <span class="save-indicator" aria-live="polite">
          <span class="save-dot"></span> Saving…
        </span>
      {/if}

      <button
        class="nav-btn icon-btn"
        aria-label="Open AI assistant"
        on:click={() => chatOpen = !chatOpen}
        aria-expanded={chatOpen}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
        </svg>
      </button>

      {#if $isLastStep}
        <button class="nav-btn primary-btn" on:click={downloadSummary}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
          </svg>
          Export
        </button>
      {/if}
    </div>
  </div>
</nav>

<!-- ── Progress rail ────────────────────────────────────────────────────── -->
<ProgressBar steps={STEPS} current={$currentStep} onStepClick={goToStep} />

<!-- ── Main content ─────────────────────────────────────────────────────── -->
<main class="main-content" role="main">
  <div class="step-header">
    <div class="step-icon-wrap" style="--step-gradient: linear-gradient(135deg, {$currentStepDef.color.replace('from-', '').replace(' to-', ', ')})">
      <span class="step-icon" aria-hidden="true">{$currentStepDef.icon}</span>
    </div>
    <div>
      <h1 class="step-title">
        <span class="step-num">Step {$currentStep}</span>
        {$currentStepDef.name}
      </h1>
      <p class="step-desc">{$currentStepDef.description}</p>
    </div>
  </div>

  <!-- Glass card -->
  <div class="glass-card" role="region" aria-label="Step {$currentStep} of {STEPS.length}">
    <div class="card-shine" aria-hidden="true"></div>
    {#if mounted && StepComponent}
      <svelte:component this={StepComponent} />
    {:else}
      <div class="loading-state" role="status" aria-label="Loading">
        <div class="spinner"></div>
      </div>
    {/if}
  </div>

  <!-- Step navigation -->
  <div class="step-nav" role="navigation" aria-label="Step navigation">
    <button
      class="step-btn prev-btn"
      on:click={prevStep}
      disabled={$isFirstStep}
      aria-label="Previous step"
    >
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <polyline points="15 18 9 12 15 6"/>
      </svg>
      <span>Back</span>
    </button>

    <div class="step-dots" role="tablist" aria-label="Step indicator">
      {#each STEPS as step}
        <button
          class="dot"
          class:active={step.id === $currentStep}
          class:done={step.id < $currentStep}
          role="tab"
          aria-selected={step.id === $currentStep}
          aria-label="Go to step {step.id}: {step.name}"
          on:click={() => goToStep(step.id)}
        ></button>
      {/each}
    </div>

    <button
      class="step-btn next-btn"
      on:click={nextStep}
      disabled={$isLastStep}
      aria-label="Next step"
    >
      <span>{$isLastStep ? 'Done' : 'Next'}</span>
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <polyline points="9 18 15 12 9 6"/>
      </svg>
    </button>
  </div>
</main>

<!-- ── AI Chat panel ─────────────────────────────────────────────────────── -->
{#if chatOpen}
  <AiChat context={$currentStepDef.name} onClose={() => chatOpen = false} />
{/if}

<style>
  /* ── Background ──────────────────────────────────────────────────────── */
  .app-bg {
    position: fixed;
    inset: 0;
    z-index: 0;
    overflow: hidden;
    pointer-events: none;
  }
  .mesh {
    position: absolute;
    border-radius: 50%;
    filter: blur(120px);
    opacity: 0.18;
    animation: pulse 12s ease-in-out infinite;
  }
  .mesh-1 {
    width: 600px; height: 600px;
    top: -100px; left: 10%;
    background: radial-gradient(circle, #5e5ce6, transparent 70%);
    animation-delay: 0s;
  }
  .mesh-2 {
    width: 500px; height: 500px;
    top: 30%; right: 5%;
    background: radial-gradient(circle, #0a84ff, transparent 70%);
    animation-delay: -4s;
  }
  .mesh-3 {
    width: 700px; height: 700px;
    bottom: -150px; left: 30%;
    background: radial-gradient(circle, #bf5af2, transparent 70%);
    animation-delay: -8s;
  }
  @keyframes pulse {
    0%, 100% { transform: scale(1) translate(0, 0); }
    33%       { transform: scale(1.08) translate(20px, -20px); }
    66%       { transform: scale(0.94) translate(-15px, 15px); }
  }
  .grid-overlay {
    position: absolute; inset: 0;
    background-image:
      linear-gradient(rgba(255,255,255,0.025) 1px, transparent 1px),
      linear-gradient(90deg, rgba(255,255,255,0.025) 1px, transparent 1px);
    background-size: 48px 48px;
  }

  /* ── Nav bar ─────────────────────────────────────────────────────────── */
  .nav-bar {
    position: sticky;
    top: 0;
    z-index: 50;
    background: var(--material-chrome, rgba(12,12,20,0.88));
    backdrop-filter: saturate(180%) blur(20px);
    -webkit-backdrop-filter: saturate(180%) blur(20px);
    border-bottom: 1px solid rgba(255,255,255,0.08);
    padding: 0 max(16px, env(safe-area-inset-left));
  }
  .nav-inner {
    max-width: 800px;
    margin: 0 auto;
    height: 52px;
    display: flex;
    align-items: center;
    justify-content: space-between;
  }
  .nav-brand {
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .nav-logo {
    font-size: 22px;
    line-height: 1;
    color: #5e5ce6;
    filter: drop-shadow(0 0 8px rgba(94,92,230,0.6));
  }
  .nav-title {
    font-size: 17px;
    font-weight: 600;
    letter-spacing: -0.3px;
    color: rgba(255,255,255,0.92);
  }
  .nav-badge {
    font-size: 11px;
    font-weight: 500;
    color: rgba(255,255,255,0.32);
    letter-spacing: 0.2px;
    padding: 2px 6px;
    border: 1px solid rgba(255,255,255,0.12);
    border-radius: 999px;
    display: none;
  }
  @media (min-width: 480px) { .nav-badge { display: inline; } }

  .nav-actions {
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .save-indicator {
    font-size: 12px;
    color: rgba(255,255,255,0.4);
    display: flex;
    align-items: center;
    gap: 5px;
  }
  .save-dot {
    width: 6px; height: 6px;
    background: #30d158;
    border-radius: 50%;
    animation: blink 1s ease-in-out infinite;
  }
  @keyframes blink { 0%,100%{opacity:1} 50%{opacity:0.3} }

  .nav-btn {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 7px 14px;
    border-radius: 10px;
    border: 1px solid rgba(255,255,255,0.12);
    background: rgba(255,255,255,0.06);
    color: rgba(255,255,255,0.75);
    font-size: 14px;
    font-weight: 500;
    font-family: var(--font-sans);
    cursor: pointer;
    transition: background 0.15s, color 0.15s, transform 0.1s;
  }
  .nav-btn:hover  { background: rgba(255,255,255,0.10); color: rgba(255,255,255,0.92); }
  .nav-btn:active { transform: scale(0.97); }
  .icon-btn { padding: 7px 10px; }
  .primary-btn {
    background: rgba(10,132,255,0.2);
    border-color: rgba(10,132,255,0.35);
    color: #0a84ff;
  }
  .primary-btn:hover { background: rgba(10,132,255,0.28); color: #40a9ff; }

  /* ── Main content ────────────────────────────────────────────────────── */
  .main-content {
    position: relative;
    z-index: 10;
    max-width: 800px;
    margin: 0 auto;
    padding: 24px 16px 48px;
    padding-bottom: max(48px, calc(env(safe-area-inset-bottom) + 32px));
  }

  /* ── Step header ─────────────────────────────────────────────────────── */
  .step-header {
    display: flex;
    align-items: center;
    gap: 14px;
    margin-bottom: 20px;
    animation: fadeUp 0.35s var(--ease-out) both;
  }
  .step-icon-wrap {
    width: 48px; height: 48px;
    border-radius: 14px;
    background: var(--step-gradient, linear-gradient(135deg, #5e5ce6, #0a84ff));
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 22px;
    flex-shrink: 0;
    box-shadow: 0 4px 16px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.15);
  }
  .step-title {
    font-size: 22px;
    font-weight: 700;
    letter-spacing: -0.5px;
    color: rgba(255,255,255,0.92);
    margin: 0 0 2px;
    line-height: 1.2;
  }
  .step-num {
    display: block;
    font-size: 11px;
    font-weight: 600;
    letter-spacing: 0.8px;
    text-transform: uppercase;
    color: rgba(255,255,255,0.35);
    margin-bottom: 2px;
  }
  .step-desc {
    font-size: 14px;
    color: rgba(255,255,255,0.45);
    margin: 0;
    line-height: 1.4;
  }

  /* ── Glass card ──────────────────────────────────────────────────────── */
  .glass-card {
    position: relative;
    background: rgba(255,255,255,0.04);
    border: 1px solid rgba(255,255,255,0.09);
    border-radius: 20px;
    padding: 28px 24px;
    overflow: hidden;
    animation: fadeUp 0.4s var(--ease-out) 0.05s both;

    /* Noise texture for depth */
    box-shadow:
      0 1px 0 rgba(255,255,255,0.08) inset,
      0 24px 48px rgba(0,0,0,0.3),
      0 0 0 0.5px rgba(255,255,255,0.04);
  }
  .card-shine {
    position: absolute;
    top: 0; left: 0; right: 0;
    height: 1px;
    background: linear-gradient(90deg, transparent, rgba(255,255,255,0.16) 50%, transparent);
    pointer-events: none;
  }

  /* ── Loading ─────────────────────────────────────────────────────────── */
  .loading-state {
    display: flex;
    align-items: center;
    justify-content: center;
    height: 120px;
  }
  .spinner {
    width: 28px; height: 28px;
    border-radius: 50%;
    border: 2.5px solid rgba(255,255,255,0.1);
    border-top-color: #0a84ff;
    animation: spin 0.7s linear infinite;
  }
  @keyframes spin { to { transform: rotate(360deg); } }

  /* ── Step navigation ─────────────────────────────────────────────────── */
  .step-nav {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-top: 20px;
    animation: fadeUp 0.4s var(--ease-out) 0.1s both;
  }
  .step-btn {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 11px 20px;
    border-radius: 14px;
    border: 1px solid rgba(255,255,255,0.12);
    background: rgba(255,255,255,0.06);
    color: rgba(255,255,255,0.80);
    font-size: 15px;
    font-weight: 500;
    font-family: var(--font-sans);
    cursor: pointer;
    transition: background 0.15s, transform 0.1s, opacity 0.15s;
    min-width: 88px;
    justify-content: center;
  }
  .step-btn:disabled {
    opacity: 0.28;
    cursor: not-allowed;
  }
  .step-btn:not(:disabled):hover { background: rgba(255,255,255,0.10); }
  .step-btn:not(:disabled):active { transform: scale(0.96); }

  .next-btn {
    background: rgba(10,132,255,0.18);
    border-color: rgba(10,132,255,0.35);
    color: #0a84ff;
  }
  .next-btn:not(:disabled):hover {
    background: rgba(10,132,255,0.26);
  }

  /* Dots */
  .step-dots {
    display: flex;
    gap: 5px;
    flex-wrap: wrap;
    justify-content: center;
    max-width: 180px;
  }
  .dot {
    width: 6px; height: 6px;
    border-radius: 50%;
    background: rgba(255,255,255,0.18);
    border: none;
    cursor: pointer;
    padding: 0;
    transition: all 0.2s var(--spring-normal);
  }
  .dot.active {
    width: 18px;
    border-radius: 3px;
    background: #0a84ff;
    box-shadow: 0 0 8px rgba(10,132,255,0.5);
  }
  .dot.done {
    background: rgba(48,209,88,0.55);
  }

  /* ── Animations ──────────────────────────────────────────────────────── */
  @keyframes fadeUp {
    from { opacity: 0; transform: translateY(12px); }
    to   { opacity: 1; transform: translateY(0); }
  }

  /* ── Responsive ──────────────────────────────────────────────────────── */
  @media (max-width: 480px) {
    .main-content { padding: 16px 12px 40px; }
    .glass-card { padding: 20px 16px; border-radius: 16px; }
    .step-btn { padding: 10px 14px; font-size: 14px; min-width: 72px; }
  }
</style>
