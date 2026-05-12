<script lang="ts">
  export let open = false;
  export let title = '';
  function close() { open = false; }
  function onKey(e: KeyboardEvent) { if (e.key === 'Escape') close(); }
</script>

{#if open}
  <div role="dialog" aria-modal="true" aria-label={title}
    style="position:fixed;inset:0;z-index:100;display:flex;align-items:center;justify-content:center;padding:var(--space-4);"
    on:keydown={onKey}>
    <div on:click={close} style="position:absolute;inset:0;background:oklch(0 0 0 / 0.4);backdrop-filter:blur(4px);" aria-hidden="true"></div>
    <div style="position:relative;background:var(--color-surface);border-radius:var(--radius-xl);box-shadow:var(--shadow-lg);width:100%;max-width:520px;padding:var(--space-6);">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:var(--space-5);">
        <h2 style="font-family:var(--font-display);font-size:var(--text-lg);font-style:italic;">{title}</h2>
        <button on:click={close} aria-label="Close modal" style="color:var(--color-text-muted);padding:var(--space-1);">✕</button>
      </div>
      <slot />
    </div>
  </div>
{/if}
