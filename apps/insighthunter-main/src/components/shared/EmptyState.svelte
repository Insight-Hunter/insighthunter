<script lang="ts">
  let { icon = '📭', title = 'Nothing here yet', description = '' } = $props<{ icon?: string; title?: string; description?: string }>();
</script>
<div class="empty-state">
  <div class="empty-state__icon">{icon}</div>
  <h3 class="empty-state__title">{title}</h3>
  {#if description}<p class="empty-state__desc">{description}</p>{/if}
  <slot />
</div>
<style>
  .empty-state { text-align: center; padding: var(--space-16) var(--space-8); color: var(--color-text-muted); }
  .empty-state__icon { font-size: 3rem; margin-bottom: var(--space-4); }
  .empty-state__title { font-size: 1.1rem; font-weight: 600; color: var(--color-text); margin-bottom: var(--space-2); }
  .empty-state__desc { font-size: 0.875rem; }
</style>
