<script lang="ts">
  let { size = 20 } = $props<{ size?: number }>();
</script>
<div class="spinner" style="width:{size}px;height:{size}px;" role="status" aria-label="Loading"></div>
