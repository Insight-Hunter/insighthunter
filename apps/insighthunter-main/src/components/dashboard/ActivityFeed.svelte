<script>
  export let activities = [];
</script>
<div class="activity-feed">
  <h3>Recent Activity</h3>
  <ul>
    {#each activities as activity}
      <li>{activity.description}</li>
    {/each}
  </ul>
</div>