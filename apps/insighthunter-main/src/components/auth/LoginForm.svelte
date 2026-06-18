<script>
  let email = '';
  let password = '';
  let error = '';
  let loading = false;

  async function login() {
    error = '';
    loading = true;

    try {
      // FIX: was '/api/auth/login' (local, non-existent endpoint).
      // Now targets auth subdomain with credentials:include for HttpOnly cookie flow.
      const res = await fetch('https://auth.insighthunter.app/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        error = data.message || 'Invalid email or password';
        return;
      }

      // FIX: removed localStorage.setItem — tokens must NOT be in localStorage (XSS risk)
      // FIX: removed manual document.cookie set — auth subdomain sets HttpOnly cookie via Set-Cookie

      window.location.href = '/dashboard';

    } catch (err) {
      error = 'Network error — please try again';
    } finally {
      loading = false;
    }
  }
</script>

<form on:submit|preventDefault={login}>
  <input type="email" placeholder="Email" bind:value={email} required />
  <input type="password" placeholder="Password" bind:value={password} required />
  <button type="submit" disabled={loading}>
    {loading ? 'Signing in...' : 'Sign In'}
  </button>
  {#if error}
    <p class="error">{error}</p>
  {/if}
</form>
