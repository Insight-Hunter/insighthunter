<script lang="ts">
  export let totalUsers: number = 0;
  export let totalRevenue: number = 0;
  export let activeSubscriptions: number = 0;
</script>

<div class="admin-stats grid grid-cols-3 gap-4">
  <div class="stat-card">
    <h3>Total Users</h3>
    <p>{totalUsers}</p>
  </div>
  <div class="stat-card">
    <h3>Revenue</h3>
    <p>${totalRevenue.toLocaleString()}</p>
  </div>
  <div class="stat-card">
    <h3>Active Subscriptions</h3>
    <p>{activeSubscriptions}</p>
  </div>
</div>
