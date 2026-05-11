<script lang="ts">
  let name = $state('');
  let org_name = $state('');
  let email = $state('');
  let password = $state('');
  let loading = $state(false);
  let error = $state('');

  async function handleSubmit() {
    if (!name || !org_name || !email || !password) { error = 'All fields are required'; return; }
    if (password.length < 8) { error = 'Password must be at least 8 characters'; return; }
    loading = true; error = '';
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, org_name, email, password }),
      });
      const data = await res.json() as { access_token?: string; error?: string };
      if (!res.ok) { error = data.error ?? 'Registration failed'; return; }
      if (data.access_token) {
        localStorage.setItem('ih_access_token', data.access_token);
        window.location.href = '/dashboard';
      }
    } catch { error = 'Network error. Please try again.'; }
    finally { loading = false; }
  }
</script>

<div>
  <h2 style="font-family:var(--font-display);font-size:1.5rem;margin-bottom:var(--space-6);">Create your account</h2>
  {#if error}<div class="error-banner">{error}</div>{/if}
  <div style="display:flex;flex-direction:column;gap:var(--space-4);">
    <div class="form-group"><label>Your name</label><input type="text" class="input" bind:value={name} placeholder="Jane Smith" /></div>
    <div class="form-group"><label>Company name</label><input type="text" class="input" bind:value={org_name} placeholder="Acme Inc." /></div>
    <div class="form-group"><label>Work email</label><input type="email" class="input" bind:value={email} placeholder="jane@acme.com" /></div>
    <div class="form-group"><label>Password</label><input type="password" class="input" bind:value={password} placeholder="Min. 8 characters" /></div>
    <button class="btn btn--primary" onclick={handleSubmit} disabled={loading} style="width:100%;justify-content:center;">
      {loading ? 'Creating account…' : 'Start free →'}
    </button>
  </div>
  <p style="margin-top:var(--space-6);text-align:center;font-size:0.875rem;color:var(--color-text-muted);">
    Already have an account? <a href="/auth/login">Sign in</a>
  </p>
</div>
<style>
  .error-banner { background: #fee2e2; color: #991b1b; padding: var(--space-3); border-radius: var(--radius-md); margin-bottom: var(--space-4); font-size: 0.875rem; }
</style>
