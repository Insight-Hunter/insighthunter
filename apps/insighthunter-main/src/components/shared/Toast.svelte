<script lang="ts">
  import { onMount } from 'svelte';

  interface Toast { id: string; message: string; type: 'success' | 'error' | 'warning' | 'info'; }

  let toasts: Toast[] = $state([]);

  export function show(message: string, type: Toast['type'] = 'info') {
    const id = crypto.randomUUID();
    toasts = [...toasts, { id, message, type }];
    setTimeout(() => dismiss(id), 4000);
  }

  function dismiss(id: string) {
    toasts = toasts.filter(t => t.id !== id);
  }

  // Export globally
  onMount(() => {
    (window as any).toast = show;
  });
</script>

<div class="toast-container">
  {#each toasts as toast (toast.id)}
    <div class="toast toast--{toast.type}" role="alert">
      <span>{toast.message}</span>
      <button onclick={() => dismiss(toast.id)} style="background:none;border:none;color:inherit;cursor:pointer;margin-left:8px;">✕</button>
    </div>
  {/each}
</div>
