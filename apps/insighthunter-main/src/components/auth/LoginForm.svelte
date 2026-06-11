<script lang="ts">
  const AUTH_BASE_URL = 'https://auth.insighthunter.app';

  let email = '';
  let password = '';
  let error = '';
  let loading = false;

  function getSafeRedirect(input: string | null) {
    if (!input) return '/dashboard';
    try {
      const decoded = decodeURIComponent(input).trim();
      if (!decoded.startsWith('/')) return '/dashboard';
      if (decoded.startsWith('//')) return '/dashboard';
      if (decoded.startsWith('/auth/')) return '/dashboard';
      return decoded;
    } catch {
      return '/dashboard';
    }
  }

  async function submit() {
    error = '';

    if (!email.trim() || !password) {
      error = 'Please fill in all fields.';
      return;
    }

    loading = true;

    try {
      const res = await fetch(`${AUTH_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          password,
        }),
      });

      const raw = await res.text();
      console.log('login status:', res.status);
      console.log('login raw response:', raw);

      let data: any = {};
      try {
        data = raw ? JSON.parse(raw) : {};
      } catch {
        data = { error: raw || `Login failed (${res.status})` };
      }

      if (!res.ok) {
        error = data?.error || data?.message || 'Invalid email or password.';
        return;
      }

      const token = data?.token || data?.accessToken || data?.data?.token || null;
      if (token) {
        try {
          localStorage.setItem('ih_access_token', token);
        } catch {}
      }

      const params = new URLSearchParams(window.location.search);
      const next = getSafeRedirect(params.get('next') || params.get('redirect'));
      window.location.assign(`/auth/callback?redirect=${encodeURIComponent(next)}`);
    } catch (err) {
      error = err instanceof Error ? err.message : 'Network error — please try again.';
    } finally {
      loading = false;
    }
  }
</script>

{#if error}
  <div class="error-banner">{error}</div>
{/if}

<form class="auth-form" on:submit|preventDefault={submit}>
  <div class="form-group">
    <label class="form-label" for="email">Email</label>
    <input class="form-input" type="email" id="email" bind:value={email} placeholder="you@company.com" autocomplete="email" required />
  </div>

  <div class="form-group">
    <div class="label-row">
      <label class="form-label" for="password">Password</label>
      <a href="/auth/forgot-password" class="forgot-link">Forgot password?</a>
    </div>
    <input class="form-input" type="password" id="password" bind:value={password} placeholder="••••••••" autocomplete="current-password" required />
  </div>

  <button type="submit" class="btn btn-gold submit-btn" disabled={loading} aria-busy={loading}>
    <span>{loading ? 'Signing in…' : 'Sign in'}</span>
    {#if loading}<span class="spinner"></span>{/if}
  </button>
</form>

<div class="divider">or</div>

<div class="auth-footer">
  <p>Don’t have an account? <a href="https://auth.insighthunter.app/signup?plan=free" class="auth-link">Create one free</a></p>
</div>

<style>
  .error-banner { display:flex; align-items:center; gap:10px; background:rgba(224,82,82,.08); border:1px solid rgba(224,82,82,.3); border-radius:8px; padding:12px 16px; margin-bottom:20px; font-size:.875rem; color:#F87171; }
  .auth-form { display:flex; flex-direction:column; gap:18px; margin-bottom:20px; }
  .form-group { display:flex; flex-direction:column; gap:8px; }
  .form-label { font-size:.9rem; font-weight:600; }
  .form-input { width:100%; border-radius:10px; border:1px solid var(--border-dim); background:rgba(255,255,255,.03); padding:13px 14px; color:inherit; }
  .form-input:focus { outline:none; border-color:var(--cyan-text); box-shadow:0 0 0 3px rgba(94,212,255,.12); }
  .label-row { display:flex; justify-content:space-between; align-items:center; gap:12px; }
  .forgot-link { font-size:.8rem; color:var(--cyan-text); transition:color .18s; }
  .forgot-link:hover { color:var(--cyan); }
  .submit-btn { width:100%; padding:14px; font-size:.975rem; margin-top:4px; display:inline-flex; justify-content:center; align-items:center; gap:10px; }
  .submit-btn:disabled { opacity:.7; cursor:not-allowed; }
  .spinner { width:16px; height:16px; border:2px solid rgba(0,0,0,.2); border-top-color:#000; border-radius:50%; animation:spin .7s linear infinite; }
  .divider { display:flex; align-items:center; gap:12px; color:var(--subtle); font-size:.8rem; margin:20px 0; }
  .divider::before,.divider::after { content:''; flex:1; height:1px; background:var(--border-dim); }
  .auth-footer { text-align:center; font-size:.875rem; color:var(--muted); }
  .auth-link { color:var(--cyan-text); font-weight:600; transition:color .18s; }
  .auth-link:hover { color:var(--cyan); }
  @keyframes spin { to { transform:rotate(360deg); } }
</style>
