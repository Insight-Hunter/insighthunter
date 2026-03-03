<!-- apps/insighthunter-auth/src/components/islands/auth/LoginForm.svelte -->
<script lang="ts">
  import { onMount } from 'svelte';

  export let redirectTo: string = 'https://lite.insighthunter.app';
  export let turnstileSiteKey: string = '';

  type State = 'idle' | 'loading' | 'success' | 'error';

  let state: State      = 'idle';
  let email             = '';
  let password          = '';
  let showPassword      = false;
  let errorMsg          = '';
  let turnstileToken    = '';
  let turnstileWidget: HTMLDivElement;

  onMount(() => {
    // Load Turnstile script
    if (turnstileSiteKey && !document.getElementById('cf-turnstile-script')) {
      const s = document.createElement('script');
      s.id = 'cf-turnstile-script';
      s.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js';
      s.async = true;
      document.head.appendChild(s);
    }
  });

  function onTurnstileSuccess(token: string) {
    turnstileToken = token;
  }

  async function handleSubmit(e: SubmitEvent) {
    e.preventDefault();
    if (state === 'loading') return;
    state    = 'loading';
    errorMsg = '';

    try {
      const res  = await fetch('/api/auth/login', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ email, password, turnstileToken }),
      });
      const data = await res.json();

      if (!res.ok) {
        errorMsg = data.error ?? 'Login failed. Please try again.';
        state    = 'error';
        // Reset Turnstile
        if ((window as any).turnstile) (window as any).turnstile.reset();
        return;
      }

      state = 'success';
      // Small delay so user sees success state, then redirect
      setTimeout(() => { window.location.href = redirectTo; }, 600);

    } catch {
      errorMsg = 'Network error. Please check your connection.';
      state    = 'error';
    }
  }
</script>

<div class="auth-shell">
  <div class="auth-card">
    <!-- Logo / Brand -->
    <div class="brand">
      <div class="brand-icon">📊</div>
      <h1>InsightHunter</h1>
      <p>Sign in to your account</p>
    </div>

    <form on:submit={handleSubmit} novalidate>
      <!-- Email -->
      <div class="field">
        <label for="email">Email address</label>
        <input
          id="email"
          type="email"
          bind:value={email}
          placeholder="you@company.com"
          autocomplete="email"
          required
          disabled={state === 'loading' || state === 'success'}
          class:error-input={state === 'error'}
        />
      </div>

      <!-- Password -->
      <div class="field">
        <div class="field-header">
          <label for="password">Password</label>
          <a href="/auth/forgot-password" class="forgot">Forgot password?</a>
        </div>
        <div class="password-wrap">
          <input
            id="password"
            type={showPassword ? 'text' : 'password'}
            bind:value={password}
            placeholder="••••••••"
            autocomplete="current-password"
            required
            disabled={state === 'loading' || state === 'success'}
            class:error-input={state === 'error'}
          />
          <button
            type="button"
            class="toggle-pw"
            on:click={() => showPassword = !showPassword}
            aria-label={showPassword ? 'Hide password' : 'Show password'}
          >
            {showPassword ? '🙈' : '👁️'}
          </button>
        </div>
      </div>

      <!-- Turnstile CAPTCHA -->
      {#if turnstileSiteKey}
        <div
          class="cf-turnstile"
          data-sitekey={turnstileSiteKey}
          data-callback="onTurnstileSuccess"
          bind:this={turnstileWidget}
        ></div>
      {/if}

      <!-- Error Message -->
      {#if state === 'error' && errorMsg}
        <div class="alert-error" role="alert">
          <span>⚠️</span> {errorMsg}
        </div>
      {/if}

      <!-- Submit -->
      <button
        type="submit"
        class="btn-primary"
        disabled={state === 'loading' || state === 'success'}
      >
        {#if state === 'loading'}
          <span class="spinner"></span> Signing in…
        {:else if state === 'success'}
          ✓ Signed in! Redirecting…
        {:else}
          Sign in
        {/if}
      </button>
    </form>

    <div class="divider"><span>or</span></div>

    <!-- Magic Link option -->
    <a href="/auth/magic-link" class="btn-secondary">
      ✉️ Send me a sign-in link
    </a>

    <p class="switch-link">
      Don't have an account? <a href="/auth/signup">Create one free</a>
    </p>
  </div>
</div>

<svelte:head>
  <script>
    // Make Turnstile callback globally accessible
    function onTurnstileSuccess(token) {
      window.__turnstileToken = token;
    }
  </script>
</svelte:head>

<style>
  .auth-shell   { min-height: 100vh; display: flex; align-items: center; justify-content: center; background: linear-gradient(135deg, #f0f4ff 0%, #fafafa 100%); padding: 1rem; }
  .auth-card    { background: #fff; border-radius: 16px; box-shadow: 0 4px 24px rgba(0,0,0,.08); padding: 2.5rem 2rem; width: 100%; max-width: 420px; }

  .brand        { text-align: center; margin-bottom: 2rem; }
  .brand-icon   { font-size: 2.5rem; margin-bottom: .5rem; }
  .brand h1     { font-size: 1.5rem; font-weight: 700; color: #111827; margin: 0 0 .25rem; }
  .brand p      { color: #6b7280; font-size: .9rem; margin: 0; }

  .field        { margin-bottom: 1.25rem; }
  .field-header { display: flex; justify-content: space-between; align-items: baseline; margin-bottom: .5rem; }
  label         { display: block; font-size: .875rem; font-weight: 500; color: #374151; margin-bottom: .5rem; }
  .forgot       { font-size: .8rem; color: #007aff; text-decoration: none; }

  input[type="email"],
  input[type="password"],
  input[type="text"] {
    width: 100%; padding: .7rem 1rem; border: 1.5px solid #d1d5db; border-radius: 8px;
    font-size: .95rem; transition: border-color .2s, box-shadow .2s;
    box-sizing: border-box; outline: none;
  }
  input:focus           { border-color: #007aff; box-shadow: 0 0 0 3px rgba(0,122,255,.15); }
  input:disabled        { background: #f9fafb; color: #9ca3af; cursor: not-allowed; }
  .error-input          { border-color: #ef4444 !important; }

  .password-wrap  { position: relative; }
  .password-wrap input { padding-right: 3rem; }
  .toggle-pw      { position: absolute; right: .75rem; top: 50%; transform: translateY(-50%); background: none; border: none; cursor: pointer; font-size: 1rem; padding: 0; line-height: 1; }

  .cf-turnstile   { margin: 1rem 0; }

  .alert-error    { background: #fef2f2; border: 1px solid #fca5a5; color: #b91c1c; border-radius: 8px; padding: .75rem 1rem; font-size: .875rem; margin-bottom: 1rem; display: flex; align-items: center; gap: .5rem; }

  .btn-primary    { width: 100%; padding: .8rem; background: #007aff; color: #fff; border: none; border-radius: 8px; font-size: 1rem; font-weight: 600; cursor: pointer; transition: background .2s, opacity .2s; display: flex; align-items: center; justify-content: center; gap: .5rem; }
  .btn-primary:hover:not(:disabled) { background: #0066dd; }
  .btn-primary:disabled  { opacity: .6; cursor: not-allowed; }

  .divider        { display: flex; align-items: center; gap: 1rem; margin: 1.25rem 0; color: #9ca3af; font-size: .8rem; }
  .divider::before, .divider::after { content: ''; flex: 1; height: 1px; background: #e5e7eb; }

  .btn-secondary  { display: flex; align-items: center; justify-content: center; gap: .5rem; width: 100%; padding: .75rem; background: #f9fafb; border: 1.5px solid #e5e7eb; border-radius: 8px; font-size: .9rem; font-weight: 500; color: #374151; text-decoration: none; transition: background .2s, border-color .2s; box-sizing: border-box; }
  .btn-secondary:hover { background: #f3f4f6; border-color: #d1d5db; }

  .switch-link    { text-align: center; margin-top: 1.5rem; font-size: .875rem; color: #6b7280; }
  .switch-link a  { color: #007aff; font-weight: 500; text-decoration: none; }

  .spinner        { width: 18px; height: 18px; border: 2px solid rgba(255,255,255,.4); border-top-color: #fff; border-radius: 50%; animation: spin .7s linear infinite; }
  @keyframes spin { to { transform: rotate(360deg); } }
</style>
