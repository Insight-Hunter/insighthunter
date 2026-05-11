<script>
  import { onMount } from 'svelte';

  let forecast = [];
  let error = null;

  onMount(async () => {
    try {
      const response = await fetch('/forecast');
      if (!response.ok) {
        throw new Error('Failed to fetch forecast data');
      }
      forecast = await response.json();
    } catch (e) {
      error = e.message;
    }
  });
</script>

<div class="card">
  <h3>Cash Flow Forecast</h3>
  {#if error}
    <p class="error">{error}</p>
  {:else if forecast.length === 0}
    <p>Loading forecast...</p>
  {:else}
    <table>
      <thead>
        <tr>
          <th>Date</th>
          <th>Forecasted Amount</th>
        </tr>
      </thead>
      <tbody>
        {#each forecast as item}
          <tr>
            <td>{item.date}</td>
            <td>{item.amount.toFixed(2)}</td>
          </tr>
        {/each}
      </tbody>
    </table>
  {/if}
</div>

<style>
  .error {
    color: red;
  }
  table {
    width: 100%;
    border-collapse: collapse;
  }
  th, td {
    border: 1px solid #ddd;
    padding: 8px;
  }
  th {
    background-color: #f2f2f2;
  }
</style>
