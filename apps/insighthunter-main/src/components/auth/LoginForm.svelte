<script>
  // LoginForm.svelte — retained for legacy references, but login.astro is the
  // primary login page. This component now delegates to the auth subdomain
  // using credentials:include (HttpOnly cookie strategy — no localStorage).

  let email = '';
  let password = '';
  let error = '';
  let loading = false;

  const AUTH_BASE_URL = 'https://auth.insighthunter.app';

  async function login() {
    error = '';
    loading = true;

    try {
      const res = await fetch(`${AUTH_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email, password }),
      });

      let data = {};
      try { data = await res.json(); } catch {}

      if (!res.ok) {
        error = data?.error || data?.message || `Login failed (${res.status}).`;
        return;
      }

      // Session is managed via HttpOnly cookie set by auth.insighthunter.app.
      // Do NOT store token in localStorage or set document.cookie manually.
      window.location.href = '/dashboard';
    } catch (err) {
      error = err instanceof Error ? err.message : 'Network error — please try again.';
    } finally {
      loading = false;
    }
  }
</script>

<form on:submit|preventDefault={login}>
  <input
    type="email"
    placeholder="Email"
    bind:value={email}
    autocomplete="email"
    required
  />

  <input
    type="password"
    placeholder="Password"
    bind:value={password}
    autocomplete="current-password"
    required
  />

  <button type="submit" disabled={loading}>
    {loading ? 'Signing in…' : 'Sign In'}
  </button>

  {#if error}
    <p class="error" role="alert">{error}</p>
  {/if}
</form>
