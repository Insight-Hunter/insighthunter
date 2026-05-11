<script lang="ts">
  export let label: string;
  export let value: string;
  export let change: string = '';
  export let positive: boolean = true;
  export let icon: string = '📊';
</script>

<div class="kpi-card">
  <div class="kpi-header">
    <span class="kpi-icon">{icon}</span>
    <span class="kpi-label">{label}</span>
  </div>
  <div class="kpi-value">{value}</div>
  {#if change}
    <div class="kpi-change" class:up={positive} class:down={!positive}>
      {positive ? '▲' : '▼'} {change}
    </div>
  {/if}
</div>

<style>
.kpi-card {
  background: #1c1b19;
  border: 1px solid rgba(255,255,255,0.06);
  border-radius: 16px;
  padding: 24px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.kpi-header { display: flex; align-items: center; gap: 10px; }
.kpi-icon { font-size: 1.2rem; }
.kpi-label { font-size: 0.8rem; color: #999; font-weight: 500; text-transform: uppercase; letter-spacing: 0.06em; }
.kpi-value { font-size: 2rem; font-weight: 700; color: #fff; font-family: 'General Sans', 'Inter', sans-serif; }
.kpi-change { font-size: 0.8rem; font-weight: 600; }
.up { color: #22c55e; }
.down { color: #ef4444; }
</style>
