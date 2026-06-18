<script lang="ts">
  import { onMount } from 'svelte';
  import Spinner from '../shared/Spinner.svelte';

  let email = '';
  let password = '';
  let loading = false;
  let error = '';

  // Pre-fill email if redirected from registration
  onMount(() => {
    const params = new URLSearchParams(window.location.search);
    const pre = params.get('email');
    if (pre) email = decodeURIComponent(pre);
  });

  async function handleLogin(e: SubmitEvent) {
    e.preventDefault();
    loading = true;
    error = '';
    try {
      // FIX: was '/api/auth/login' (local route that doesn't exist)
      // FIX: credentials:'include' so auth subdomain sets HttpOnly cookie — no localStorage
      const res = await fetch('https://auth.insighthunter.app/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        error = data.error || 'Invalid email or password';
        return;
      }
      // Token is set as HttpOnly cookie by the auth server — do NOT store in localStorage
      const redirect = new URLSearchParams(window.location.search).get('redirect') || '/dashboard';
      window.location.href = redirect;
    } catch (err) {
      error = 'Network error — please try again';
    } finally {
      loading = false;
    }
  }
</script>

<form on:submit={handleLogin} class="login-form" novalidate>
  {#if error}
    <div class="form-error" role="alert">{error}</div>
  {/if}
  <div class="field">
    <label for="email">Email</label>
    <input id="email" type="email" bind:value={email} required autocomplete="email" placeholder="you@company.com" />
  </div>
  <div class="field">
    <label for="password">Password</label>
    <input id="password" type="password" bind:value={password} required autocomplete="current-password" placeholder="••••••••" />
  </div>
  <div class="form-footer">
    <a href="/auth/forgot-password" class="forgot-link">Forgot password?</a>
  </div>
  <button type="submit" class="btn btn-primary btn-full" disabled={loading}>
    {#if loading}<Spinner size={16} />{/if}
    {loading ? 'Signing in…' : 'Sign In'}
  </button>
  <p class="form-switch">Don't have an account? <a href="/auth/register">Create one free</a></p>
</form>

<style>
.login-form { display: flex; flex-direction: column; gap: 20px; }
.form-error { background: rgba(161,44,123,0.12); border: 1px solid rgba(161,44,123,0.3); color: #d163a7; border-radius: 8px; padding: 12px 16px; font-size: 0.875rem; }
.field { display: flex; flex-direction: column; gap: 6px; }
label { font-size: 0.875rem; font-weight: 500; color: var(--muted); }
input { background: var(--surface-alt); border: 1px solid var(--border-dim); border-radius: 8px; padding: 11px 14px; font-size: 0.9rem; color: var(--white); transition: border-color 0.18s; }
input:focus { outline: none; border-color: var(--gold); }
.form-footer { display: flex; justify-content: flex-end; margin-top: -8px; }
.forgot-link { font-size: 0.8rem; color: var(--muted); }
.forgot-link:hover { color: var(--white); }
.btn-full { width: 100%; justify-content: center; gap: 8px; }
.form-switch { text-align: center; font-size: 0.85rem; color: var(--muted); }
.form-switch a { color: var(--gold); }
</style>
