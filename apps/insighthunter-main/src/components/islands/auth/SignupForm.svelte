<script lang="ts">
  let email = '';
  let password = '';
  let plan = 'lite';
  let loading = false;
  let error = '';

  async function handleSubmit(e: Event) {
    e.preventDefault();
    loading = true;
    error = '';

    try {
      const formData = new FormData();
      formData.append('email', email);
      formData.append('password', password);
      formData.append('plan', plan);
      // The auth service requires a role, we'll default to 'customer' for signups
      formData.append('role', 'customer');

      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        body: formData
      });

      // The signup service redirects on success, so we check for redirect
      if (res.redirected) {
        window.location.href = res.url;
        return;
      }

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Signup failed');
      }

    } catch (err: any) {
      error = err.message;
    } finally {
      loading = false;
    }
  }
</script>

<div class="signup-wrapper">
  <h1>Create Your Account</h1>

  {#if error}
    <p class="error">{error}</p>
  {/if}

  <form on:submit={handleSubmit}>

    <div class="plan-selector">
      {#each ['lite', 'standard', 'pro'] as p}
        <button
          type="button"
          class="plan-btn"
          class:active={plan === p}
          on:click={() => plan = p}
        >
          {p.charAt(0).toUpperCase() + p.slice(1)}
        </button>
      {/each}
    </div>

    <label>
      Email
      <input type="email" bind:value={email} required />
    </label>

    <label>
      Password
      <input type="password" bind:value={password} required minlength="12" />
    </label>

    <button type="submit" disabled={loading} class="btn-primary">
      {loading ? 'Creating account...' : 'Create Account'}
    </button>

  </form>
</div>

<style>
  .signup-wrapper { max-width: 480px; margin: 4rem auto; padding: 2rem; }
  .plan-selector { display: flex; gap: 1rem; margin-bottom: 1.5rem; }
  .plan-btn { flex: 1; padding: 0.75rem; border: 1px solid var(--color-muted); background: transparent; color: var(--color-text); border-radius: 8px; cursor: pointer; }
  .plan-btn.active { border-color: var(--color-primary); color: var(--color-primary); }
  label { display: flex; flex-direction: column; gap: 0.25rem; margin-bottom: 1rem; }
  input { padding: 0.75rem; background: var(--color-surface); border: 1px solid var(--color-muted); border-radius: 8px; color: var(--color-text); }
  .error { color: #f87171; margin-bottom: 1rem; }
</style>
