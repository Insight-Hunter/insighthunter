<script lang="ts">
  import { setToken } from '../../lib/auth';
  let email = '', password = '', error = '', loading = false;
  const params = new URLSearchParams(typeof window !== 'undefined' ? window.location.search : '');
  const next = params.get('next') || '/dashboard';

  async function submit() {
    error = ''; loading = true;
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const body = await res.json();
      if (!res.ok || !body.data?.token) { error = body.error || 'Invalid credentials'; return; }
      setToken(body.data.token);
      window.location.href = next;
    } catch { error = 'Network error. Please try again.'; }
    finally { loading = false; }
  }
</script>

<form on:submit|preventDefault={submit}>
  <h1 style="font-family:var(--font-display);font-size:var(--text-xl);font-style:italic;margin-bottom:var(--space-2);">Welcome back.</h1>
  <p style="color:var(--color-text-muted);font-size:var(--text-sm);margin-bottom:var(--space-6);">Sign in to your Insight Hunter account.</p>
  {#if error}<p role="alert" style="color:var(--color-error);font-size:var(--text-sm);margin-bottom:var(--space-4);">{error}</p>{/if}
  <label style="display:block;margin-bottom:var(--space-4);">
    <span style="font-size:var(--text-sm);font-weight:500;">Email</span>
    <input type="email" bind:value={email} required autocomplete="email"
      style="display:block;width:100%;margin-top:var(--space-1);padding:var(--space-2) var(--space-3);border:1px solid var(--color-border);border-radius:var(--radius-md);background:var(--color-surface);font-size:var(--text-sm);" />
  </label>
  <label style="display:block;margin-bottom:var(--space-5);">
    <span style="font-size:var(--text-sm);font-weight:500;">Password</span>
    <input type="password" bind:value={password} required autocomplete="current-password"
      style="display:block;width:100%;margin-top:var(--space-1);padding:var(--space-2) var(--space-3);border:1px solid var(--color-border);border-radius:var(--radius-md);background:var(--color-surface);font-size:var(--text-sm);" />
  </label>
  <div style="display:flex;justify-content:flex-end;margin-top:calc(var(--space-1) * -3);margin-bottom:var(--space-5);">
    <a href="/auth/forgot-password" style="font-size:var(--text-xs);color:var(--color-primary);">Forgot password?</a>
  </div>
  <button type="submit" class="btn btn-primary" style="width:100%;justify-content:center;" disabled={loading}>
    {loading ? 'Signing in…' : 'Sign in'}
  </button>
  <p style="text-align:center;margin-top:var(--space-5);font-size:var(--text-sm);color:var(--color-text-muted);">
    No account? <a href="/auth/register" style="color:var(--color-primary);font-weight:600;">Create one →</a>
  </p>
</form>
