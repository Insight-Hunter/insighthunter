<script lang="ts">
  export let icon: string = '📂';
  export let title: string;
  export let description: string;
  export let ctaLabel: string | null = null;
  export let ctaHref: string | null = null;
</script>

<div style="display:flex;flex-direction:column;align-items:center;text-align:center;padding:var(--space-16) var(--space-8);color:var(--color-text-muted);">
  <div style="font-size:2.5rem;margin-bottom:var(--space-4);" aria-hidden="true">{icon}</div>
  <h3 style="font-size:var(--text-lg);color:var(--color-text);font-family:var(--font-display);margin-bottom:var(--space-2);">{title}</h3>
  <p style="font-size:var(--text-sm);max-width:36ch;margin-bottom:var(--space-5);">{description}</p>
  {#if ctaLabel && ctaHref}
    <a href={ctaHref} class="btn btn-primary">{ctaLabel}</a>
  {/if}
</div>
