<script lang="ts">
  let email = $state('');
  let password = $state('');
  let loading = $state(false);
  let error = $state('');

  async function handleSubmit() {
    if (!email || !password) { error = 'Email and password are required'; return; }
    loading = true; error = '';
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json() as { access_token?: string; error?: string };
      if (!res.ok) { error = data.error ?? 'Login failed'; return; }
      if (data.access_token) {
        localStorage.setItem('ih_access_token', data.access_token);
        const next = new URLSearchParams(window.location.search).get('next') ?? '/dashboard';
        window.location.href = next;
      }
    } catch (e) {
      error = 'Network error. Please try again.';
    } finally { loading = false; }
  }
</script>

<div>
  <h2 style="font-family:var(--font-display);font-size:1.5rem;margin-bottom:var(--space-6);">Welcome back</h2>
  {#if error}<div class="error-banner">{error}</div>{/if}
  <div style="display:flex;flex-direction:column;gap:var(--space-4);">
    <div class="form-group">
      <label for="email">Email</label>
      <input id="email" type="email" class="input" bind:value={email} placeholder="you@company.com" />
    </div>
    <div class="form-group">
      <label for="password">Password</label>
      <input id="password" type="password" class="input" bind:value={password} placeholder="••••••••" />
    </div>
    <a href="/auth/forgot-password" style="font-size:0.8125rem;color:var(--color-text-muted);">Forgot password?</a>
    <button class="btn btn--primary" onclick={handleSubmit} disabled={loading} style="width:100%;justify-content:center;">
      {loading ? 'Signing in…' : 'Sign in'}
    </button>
  </div>
  <p style="margin-top:var(--space-6);text-align:center;font-size:0.875rem;color:var(--color-text-muted);">
    Don't have an account? <a href="/auth/register">Create one →</a>
  </p>
</div>
<style>
  .error-banner { background: #fee2e2; color: #991b1b; padding: var(--space-3); border-radius: var(--radius-md); margin-bottom: var(--space-4); font-size: 0.875rem; }
</style>
