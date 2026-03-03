<!-- apps/insighthunter-auth/src/components/islands/auth/SignupForm.svelte -->
<script lang="ts">
  import { onMount } from 'svelte';

  export let turnstileSiteKey: string = '';

  type State = 'idle' | 'loading' | 'success' | 'error';

  let state: State   = 'idle';
  let fullName       = '';
  let email          = '';
  let password       = '';
  let confirmPw      = '';
  let showPassword   = false;
  let errorMsg       = '';
  let turnstileToken = '';

  // Password strength
  $: strength = getStrength(password);
  $: strengthLabel = ['', 'Weak', 'Fair', 'Good', 'Strong'][strength];
  $: strengthColor = ['', '#ef4444', '#f59e0b', '#10b981', '#059669'][strength];

  function getStrength(pw: string): number {
    if (!pw) return 0;
    let score = 0;
    if (pw.length >= 8)   score++;
    if (pw.length >= 12)  score++;
    if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) score++;
    if (/[0-9]/.test(pw)) score++;
    if (/[^A-Za-z0-9]/.test(pw)) score++;
    return Math.min(4, Math.ceil(score / 1.25));
  }

  onMount(() => {
    if (turnstileSiteKey && !document.getElementById('cf-turnstile-script')) {
      const s = document.createElement('script');
      s.id = 'cf-turnstile-script';
      s.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js';
      s.async = true;
      document.head.appendChild(s);
    }
  });

  async function handleSubmit(e: SubmitEvent) {
    e.preventDefault();
    errorMsg = '';

    if (password !== confirmPw)   { errorMsg = 'Passwords do not match.'; state = 'error'; return; }
    if (password.length < 8)      { errorMsg = 'Password must be at least 8 characters.'; state = 'error'; return; }
    if (fullName.trim().length < 2){ errorMsg = 'Please enter your full name.'; state = 'error'; return; }

    state = 'loading';

    try {
      const res  = await fetch('/api/auth/signup', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ email, password, fullName, turnstileToken }),
      });
      const data = await res.json();

      if (!res.ok) {
        errorMsg = data.error ?? 'Signup failed. Please try again.';
        state    = 'error';
        if ((window as any).turnstile) (window as any).turnstile.reset();
        return;
      }

      state = 'success';
    } catch {
      errorMsg = 'Network error. Please check your connection.';
      state    = 'error';
    }
  }
</script>

<div class="auth-shell">
  <div class="auth-card">
    <div class="brand">
      <div class="brand-icon">📊</div>
      <h1>InsightHunter</h1>
      <p>Create your free account</p>
    </div>

    {#if state === 'success'}
      <!-- Success state -->
      <div class="success-card">
        <div class="success-icon">✉️</div>
        <h2>Check your email</h2>
        <p>We sent a verification link to <strong>{email}</strong>.</p>
        <p class="sub">You can start using InsightHunter right away. Verify your email to unlock all features.</p>
        <a href="https://lite.insighthunter.app" class="btn-primary">Go to Dashboard →</a>
      </div>
    {:else}
      <form on:submit={handleSubmit} novalidate>
        <!-- Full Name -->
        <div class="field">
          <label for="fullName">Full name</label>
          <input id="fullName" type="text" bind:value={fullName}
            placeholder="Jane Smith" autocomplete="name" required
            disabled={state === 'loading'} />
        </div>

        <!-- Email -->
        <div class="field">
          <label for="email">Email address</label>
          <input id="email" type="email" bind:value={email}
            placeholder="you@company.com" autocomplete="email" required
            disabled={state === 'loading'} class:error-input={state === 'error'} />
        </div>

        <!-- Password -->
        <div class="field">
          <label for="password">Password</label>
          <div class="password-wrap">
            <input id="password" type={showPassword ? 'text' : 'password'}
              bind:value={password} placeholder="Min. 8 characters"
              autocomplete="new-password" required disabled={state === 'loading'}
              class:error-input={state === 'error'} />
            <button type="button" class="toggle-pw"
              on:click={() => showPassword = !showPassword}
              aria-label="Toggle password visibility">
              {showPassword ? '🙈' : '👁️'}
            </button>
          </div>
          <!-- Strength meter -->
          {#if password}
            <div class="strength-meter">
              <div class="strength-bars">
                {#each [1,2,3,4] as i}
                  <div class="bar" style="background:{i <= strength ? strengthColor : '#e5e7eb'}"></div>
                {/each}
              </div>
              <span class="strength-label" style="color:{strengthColor}">{strengthLabel}</span>
            </div>
          {/if}
        </div>

        <!-- Confirm Password -->
        <div class="field">
          <label for="confirmPw">Confirm password</label>
          <input id="confirmPw" type={showPassword ? 'text' : 'password'}
            bind:value={confirmPw} placeholder="••••••••"
            autocomplete="new-password" required disabled={state === 'loading'}
            class:error-input={confirmPw && confirmPw !== password} />
          {#if confirmPw && confirmPw !== password}
            <p class="field-error">Passwords do not match</p>
          {/if}
        </div>

        <!-- Turnstile -->
        {#if turnstileSiteKey}
          <div class="cf-turnstile" data-sitekey={turnstileSiteKey}
            data-callback="onTurnstileSuccess"></div>
        {/if}

        <!-- Error -->
        {#if state === 'error' && errorMsg}
          <div class="alert-error" role="alert"><span>⚠️</span> {errorMsg}</div>
        {/if}

        <!-- Terms -->
        <p class="terms">
          By creating an account, you agree to our
          <a href="/legal/terms" target="_blank">Terms of Service</a> and
          <a href="/legal/privacy" target="_blank">Privacy Policy</a>.
        </p>

        <button type="submit" class="btn-primary" disabled={state === 'loading'}>
          {#if state === 'loading'}
            <span class="spinner"></span> Creating account…
          {:else}
            Create free account
          {/if}
        </button>
      </form>

      <p class="switch-link">
        Already have an account? <a href="/auth/login">Sign in</a>
      </p>
    {/if}
  </div>
</div>

<style>
  .auth-shell   { min-height: 100vh; display: flex; align-items: center; justify-content: center; background: linear-gradient(135deg, #f0f4ff 0%, #fafafa 100%); padding: 1rem; }
  .auth-card    { background: #fff; border-radius: 16px; box-shadow: 0 4px 24px rgba(0,0,0,.08); padding: 2.5rem 2rem; width: 100%; max-width: 440px; }
  .brand        { text-align: center; margin-bottom: 2rem; }
  .brand-icon   { font-size: 2.5rem; margin-bottom: .5rem; }
  .brand h1     { font-size: 1.5rem; font-weight: 700; color: #111827; margin: 0 0 .25rem; }
  .brand p      { color: #6b7280; font-size: .9rem; margin: 0; }

  .field        { margin-bottom: 1.25rem; }
  label         { display: block; font-size: .875rem; font-weight: 500; color: #374151; margin-bottom: .5rem; }
  input         { width: 100%; padding: .7rem 1rem; border: 1.5px solid #d1d5db; border-radius: 8px; font-size: .95rem; transition: border-color .2s, box-shadow .2s; box-sizing: border-box; outline: none; }
  input:focus   { border-color: #007aff; box-shadow: 0 0 0 3px rgba(0,122,255,.15); }
  input:disabled{ background: #f9fafb; cursor: not-allowed; }
  .error-input  { border-color: #ef4444 !important; }
  .field-error  { font-size: .8rem; color: #ef4444; margin: .35rem 0 0; }

  .password-wrap         { position: relative; }
  .password-wrap input   { padding-right: 3rem; }
  .toggle-pw             { position: absolute; right: .75rem; top: 50%; transform: translateY(-50%); background: none; border: none; cursor: pointer; font-size: 1rem; padding: 0; }

  .strength-meter  { display: flex; align-items: center; gap: .75rem; margin-top: .5rem; }
  .strength-bars   { display: flex; gap: 4px; flex: 1; }
  .bar             { height: 4px; flex: 1; border-radius: 2px; transition: background .3s; }
  .strength-label  { font-size: .75rem; font-weight: 600; min-width: 36px; }

  .cf-turnstile    { margin: 1rem 0; }
  .alert-error     { background: #fef2f2; border: 1px solid #fca5a5; color: #b91c1c; border-radius: 8px; padding: .75rem 1rem; font-size: .875rem; margin-bottom: 1rem; display: flex; align-items: center; gap: .5rem; }

  .terms           { font-size: .78rem; color: #9ca3af; margin: .75rem 0 1rem; line-height: 1.5; }
  .terms a         { color: #6b7280; text-decoration: underline; }

  .btn-primary     { width: 100%; padding: .8rem; background: #007aff; color: #fff; border: none; border-radius: 8px; font-size: 1rem; font-weight: 600; cursor: pointer; transition: background .2s, opacity .2s; display: flex; align-items: center; justify-content: center; gap: .5rem; }
  .btn-primary:hover:not(:disabled) { background: #0066dd; }
  .btn-primary:disabled { opacity: .6; cursor: not-allowed; }

  /* Success state */
  .success-card   { text-align: center; padding: 1rem 0; }
  .success-icon   { font-size: 3rem; margin-bottom: 1rem; }
  .success-card h2{ font-size: 1.4rem; font-weight: 700; margin: 0 0 .75rem; }
  .success-card p { color: #4b5563; margin-bottom: .5rem; }
  .sub            { font-size: .875rem; color: #9ca3af !important; margin-bottom: 1.5rem !important; }
  .success-card .btn-primary { margin-top: .5rem; text-decoration: none; }

  .switch-link    { text-align: center; margin-top: 1.5rem; font-size: .875rem; color: #6b7280; }
  .switch-link a  { color: #007aff; font-weight: 500; text-decoration: none; }

  .spinner        { width: 18px; height: 18px; border: 2px solid rgba(255,255,255,.4); border-top-color: #fff; border-radius: 50%; animation: spin .7s linear infinite; }
  @keyframes spin { to { transform: rotate(360deg); } }
</style>
