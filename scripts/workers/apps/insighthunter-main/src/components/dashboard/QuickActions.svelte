<script>
  export let actions = [];
</script>
<div class="quick-actions">
  <h3>Quick Actions</h3>
  <div class="action-grid">
    {#each actions as action}
      <button>{action.label}</button>
    {/each}
  </div>
</div>