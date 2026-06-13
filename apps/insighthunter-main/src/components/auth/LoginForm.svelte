<script>
  let email = '';
  let password = '';
  let error = '';
  let loading = false;

  async function login() {
    error = '';
    loading = true;

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        error = data.message || 'Invalid login';
        return;
      }

      // ✅ store auth
      localStorage.setItem('token', data.token);

      // ✅ ALSO set cookie (needed for Astro SSR + middleware)
      document.cookie = `token=${data.token}; path=/; SameSite=Lax`;

      // ✅ redirect
      window.location.href = '/dashboard';

    } catch (err) {
      error = 'Network error';
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
    required
  />

  <input
    type="password"
    placeholder="Password"
    bind:value={password}
    required
  />

  <button type="submit" disabled={loading}>
    {loading ? 'Signing in...' : 'Sign In'}
  </button>

  {#if error}
    <p class="error">{error}</p>
  {/if}
</form>