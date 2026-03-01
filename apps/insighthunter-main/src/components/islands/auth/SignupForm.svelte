<script lang="ts">
  let email = '';
  let password = '';
  let plan = 'lite';
  let loading = false;
  let error = '';
  let turnstileToken = '';

  async function handleSubmit(e: Event) {
    e.preventDefault();
    if (!turnstileToken) { error = 'Please complete the verification.'; return; }
    loading = true;
    error = '';

    try {
      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, plan, turnstileToken })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Signup failed');
      window.location.href = '/shop';
    } catch (err: any) {
      error = err.message;
    } finally {
      loading = false;
    }
  }

  // Turnstile callback (called by Cloudflare script)
  (window as any).onTurnstileSuccess = (token: string) => {
    turnstileToken = token;
  };
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
      <input type="password" bind:value={password} required minlength="8" />
    </label>

    <!-- Cloudflare Turnstile -->
    <div
      class="cf-turnstile"
      data-sitekey="<your-turnstile-sitekey>"
      data-callback="onTurnstileSuccess"
    ></div>

    <button type="submit" disabled={loading || !turnstileToken} class="btn-primary">
      {loading ? 'Creating account...' : 'Create Account'}
    </button>

  </form>
</div>

<svelte:head>
  <script src="https://challenges.cloudflare.com/turnstile/v0/api.js" async defer></script>
</svelte:head>

<style>
  .signup-wrapper { max-width: 480px; margin: 4rem auto; padding: 2rem; }
  .plan-selector { display: flex; gap: 1rem; margin-bottom: 1.5rem; }
  .plan-btn { flex: 1; padding: 0.75rem; border: 1px solid var(--color-muted); background: transparent; color: var(--color-text); border-radius: 8px; cursor: pointer; }
  .plan-btn.active { border-color: var(--color-primary); color: var(--color-primary); }
  label { display: flex; flex-direction: column; gap: 0.25rem; margin-bottom: 1rem; }
  input { padding: 0.75rem; background: var(--color-surface); border: 1px solid var(--color-muted); border-radius: 8px; color: var(--color-text); }
  .error { color: #f87171; margin-bottom: 1rem; }
</style>
