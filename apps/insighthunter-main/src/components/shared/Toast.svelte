<script lang="ts">
  export let message = '';
  export let type: 'success' | 'error' | 'info' = 'info';
  export let visible = false;

  const colors = { success: 'var(--color-success)', error: 'var(--color-error)', info: 'var(--color-primary)' };
  const icons  = { success: '✓', error: '✕', info: 'ℹ' };
</script>

{#if visible}
  <div role="status" aria-live="polite"
    style="position:fixed;bottom:var(--space-6);right:var(--space-6);z-index:200;background:var(--color-surface);border:1px solid var(--color-border);border-left:4px solid {colors[type]};border-radius:var(--radius-lg);box-shadow:var(--shadow-lg);padding:var(--space-4) var(--space-5);display:flex;align-items:center;gap:var(--space-3);max-width:360px;">
    <span style="color:{colors[type]};font-weight:700;">{icons[type]}</span>
    <span style="font-size:var(--text-sm);">{message}</span>
  </div>
{/if}
