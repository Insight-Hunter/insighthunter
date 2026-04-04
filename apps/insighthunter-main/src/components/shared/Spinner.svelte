<script lang="ts">
  export let size = 24;
  export let label = 'Loading…';
</script>
<span role="status" aria-label={label} style="display:inline-block;width:{size}px;height:{size}px;">
  <svg viewBox="0 0 24 24" fill="none" stroke="var(--color-primary)" stroke-width="2.5" style="animation:spin 0.8s linear infinite;width:100%;height:100%;">
    <circle cx="12" cy="12" r="10" stroke-opacity="0.2"/>
    <path d="M12 2a10 10 0 0 1 10 10" stroke-linecap="round"/>
  </svg>
</span>
<style>
  @keyframes spin { to { transform: rotate(360deg); } }
</style>
