<script lang="ts">
  const AUTH_BASE_URL = 'https://auth.insighthunter.app';

  let email = '';
  let error = '';
  let success = '';
  let loading = false;

  async function submit() {
    error = '';
    success = '';

    if (!email.trim()) {
      error = 'Please enter your email address.';
      return;
    }

    loading = true;

    try {
      const res = await fetch(`${AUTH_BASE_URL}/auth/forgot-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
        }),
      });

      const raw = await res.text();
      console.log('forgot-password status:', res.status);
      console.log('forgot-password raw response:', raw);

      success = 'If an account exists for that email, a reset link has been sent.';
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

{#if success}
  <div class="success-banner">{success}</div>
{/if}

<form class="auth-form" on:submit|preventDefault={submit}>
  <div class="form-group">
    <label class="form-label" for="email">Work email</label>
    <input class="form-input" id="email" type="email" bind:value={email} autocomplete="email" placeholder="you@company.com" required />
  </div>

  <button type="submit" class="btn btn-gold submit-btn" disabled={loading} aria-busy={loading}>
    <span>{loading ? 'Sending link…' : 'Send reset link'}</span>
    {#if loading}<span class="spinner"></span>{/if}
  </button>
</form>

<div class="auth-footer">
  <p>Remembered your password? <a href="/auth/login" class="auth-link">Back to sign in</a></p>
</div>

<style>
  .error-banner { display:flex; align-items:center; gap:10px; background:rgba(224,82,82,.08); border:1px solid rgba(224,82,82,.3); border-radius:8px; padding:12px 16px; margin-bottom:16px; font-size:.875rem; color:#F87171; }
  .success-banner { display:flex; align-items:center; gap:10px; background:rgba(96,222,163,.08); border:1px solid rgba(96,222,163,.28); border-radius:8px; padding:12px 16px; margin-bottom:16px; font-size:.875rem; color:#60DEA3; }
  .auth-form { display:flex; flex-direction:column; gap:16px; margin-bottom:20px; }
  .form-group { display:flex; flex-direction:column; gap:8px; }
  .form-label { font-size:.9rem; font-weight:600; }
  .form-input { width:100%; border-radius:10px; border:1px solid var(--border-dim); background:rgba(255,255,255,.03); padding:13px 14px; color:inherit; }
  .form-input:focus { outline:none; border-color:var(--cyan-text); box-shadow:0 0 0 3px rgba(94,212,255,.12); }
  .submit-btn { width:100%; padding:14px; font-size:.975rem; margin-top:4px; display:inline-flex; justify-content:center; align-items:center; gap:10px; }
  .submit-btn:disabled { opacity:.7; cursor:not-allowed; }
  .spinner { width:16px; height:16px; border:2px solid rgba(0,0,0,.2); border-top-color:#000; border-radius:50%; animation:spin .7s linear infinite; }
  .auth-footer { text-align:center; font-size:.875rem; color:var(--muted); }
  .auth-link { color:var(--cyan-text); font-weight:600; transition:color .18s; }
  .auth-link:hover { color:var(--cyan); }
  @keyframes spin { to { transform:rotate(360deg); } }
</style>
