<!-- GlassField.svelte — Apple-style glass form field wrapper -->
<script lang="ts">
  export let label: string;
  export let hint: string = '';
  export let id: string;
</script>

<div class="field">
  <label for={id} class="field-label">{label}</label>
  {#if hint}
    <p class="field-hint">{hint}</p>
  {/if}
  <div class="field-input-wrap">
    <slot />
  </div>
</div>

<style>
  .field { display: flex; flex-direction: column; gap: 5px; }
  .field-label {
    font-size: 13px;
    font-weight: 600;
    color: rgba(255,255,255,0.55);
    letter-spacing: 0.2px;
    text-transform: uppercase;
  }
  .field-hint {
    font-size: 12px;
    color: rgba(255,255,255,0.30);
    margin: 0;
    line-height: 1.4;
  }
  .field-input-wrap {
    position: relative;
  }
  /* Global input styles applied via :global to slot content */
  .field-input-wrap :global(input),
  .field-input-wrap :global(textarea),
  .field-input-wrap :global(select) {
    width: 100%;
    background: rgba(255,255,255,0.06);
    border: 1px solid rgba(255,255,255,0.11);
    border-radius: 12px;
    padding: 11px 14px;
    color: rgba(255,255,255,0.88);
    font-size: 15px;
    font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Text', sans-serif;
    outline: none;
    transition: border-color 0.15s, background 0.15s, box-shadow 0.15s;
    -webkit-appearance: none;
    appearance: none;
  }
  .field-input-wrap :global(input:focus),
  .field-input-wrap :global(textarea:focus),
  .field-input-wrap :global(select:focus) {
    border-color: rgba(10,132,255,0.55);
    background: rgba(255,255,255,0.08);
    box-shadow: 0 0 0 3px rgba(10,132,255,0.12);
  }
  .field-input-wrap :global(input::placeholder),
  .field-input-wrap :global(textarea::placeholder) {
    color: rgba(255,255,255,0.22);
  }
  .field-input-wrap :global(textarea) {
    resize: vertical;
    min-height: 80px;
  }
</style>
