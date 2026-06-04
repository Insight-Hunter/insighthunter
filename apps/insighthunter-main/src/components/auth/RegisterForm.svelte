<script lang="ts">
  export let plan = 'lite';

  const AUTH_BASE_URL = 'https://auth.insighthunter.app';
  const planOptions = [
    { id: 'lite', name: 'Lite', price: 'Free' },
    { id: 'standard', name: 'Standard', price: '$49/mo' },
    { id: 'pro', name: 'Pro', price: '$99/mo' },
  ];

  let selectedPlan = plan || 'lite';
  let firstName = '';
  let lastName = '';
  let company = '';
  let email = '';
  let password = '';
  let agreeTerms = false;
  let loading = false;
  let error = '';
  let passwordStrength = '';
  let passwordColor = '';

  function getSubmitLabel(currentPlan: string) {
    return currentPlan === 'lite'
      ? 'Create Free Account'
      : currentPlan === 'standard'
        ? 'Start Insight Standard'
        : currentPlan === 'pro'
          ? 'Start Insight Pro'
          : 'Create Account';
  }

  $: {
    let score = 0;
    if (password.length >= 8) score++;
    if (/[A-Z]/.test(password)) score++;
    if (/[0-9]/.test(password)) score++;
    if (/[^A-Za-z0-9]/.test(password)) score++;

    const labels = ['', 'Weak', 'Fair', 'Good', 'Strong'];
    const colors = ['', '#E34E24', '#E8964E', '#5ED4FF', '#60DEA3'];

    passwordStrength = password.length > 0 ? `Password strength: ${labels[score]}` : '';
    passwordColor = colors[score] ?? '';
  }

  async function submit() {
    error = '';

    if (!firstName.trim() || !lastName.trim() || !company.trim() || !email.trim() || !password) {
      error = 'Please fill in all required fields.';
      return;
    }

    if (password.length < 8) {
      error = 'Password must be at least 8 characters.';
      return;
    }

    if (!agreeTerms) {
      error = 'You must agree to the Terms of Service.';
      return;
    }

    loading = true;

    try {
      const payload = {
        email: email.trim().toLowerCase(),
        password,
        name: `${firstName} ${lastName}`.trim(),
        org_name: company.trim(),
        plan: selectedPlan,
      };

      const res = await fetch(`${AUTH_BASE_URL}/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(payload),
      });

      const raw = await res.text();
      console.log('register status:', res.status);
      console.log('register raw response:', raw);

      let data: any = {};
      try {
        data = raw ? JSON.parse(raw) : {};
      } catch {
        data = { error: raw || `Registration failed (${res.status})` };
      }

      if (!res.ok) {
        error = data?.error || data?.message || data?.details || `Registration failed (${res.status}).`;
        return;
      }

      window.location.assign('/auth/login?registered=1&email=' + encodeURIComponent(email.trim().toLowerCase()));
    } catch (err) {
      error = err instanceof Error ? err.message : 'Network error — please try again.';
    } finally {
      loading = false;
    }
  }
</script>

<div class="plan-selector" role="radiogroup" aria-label="Choose a plan">
  {#each planOptions as option}
    <label class:selected={selectedPlan === option.id} class="plan-option">
      <input class="plan-radio" type="radio" bind:group={selectedPlan} value={option.id} name="plan" />
      <span class="plan-option-name">{option.name}</span>
      <span class="plan-option-price">{option.price}</span>
    </label>
  {/each}
</div>

{#if error}
  <div class="error-banner">{error}</div>
{/if}

<form class="auth-form" on:submit|preventDefault={submit}>
  <div class="form-row">
    <div class="form-group">
      <label class="form-label" for="first-name">First name</label>
      <input class="form-input" id="first-name" type="text" bind:value={firstName} autocomplete="given-name" placeholder="Jane" required />
    </div>

    <div class="form-group">
      <label class="form-label" for="last-name">Last name</label>
      <input class="form-input" id="last-name" type="text" bind:value={lastName} autocomplete="family-name" placeholder="Smith" required />
    </div>
  </div>

  <div class="form-group">
    <label class="form-label" for="company">Company name</label>
    <input class="form-input" id="company" type="text" bind:value={company} autocomplete="organization" placeholder="Acme Corp" required />
  </div>

  <div class="form-group">
    <label class="form-label" for="email">Work email</label>
    <input class="form-input" id="email" type="email" bind:value={email} autocomplete="email" placeholder="jane@company.com" required />
  </div>

  <div class="form-group">
    <label class="form-label" for="password">Password</label>
    <input class="form-input" id="password" type="password" bind:value={password} autocomplete="new-password" placeholder="Min 8 characters" minlength="8" required />
    <div class="password-strength" style={`color:${passwordColor}`}>{passwordStrength}</div>
  </div>

  <label class="check-label">
    <input type="checkbox" bind:checked={agreeTerms} required />
    <span>
      I agree to the
      <a href="/terms" class="auth-link" target="_blank" rel="noopener noreferrer">Terms of Service</a>
      and
      <a href="/privacy" class="auth-link" target="_blank" rel="noopener noreferrer">Privacy Policy</a>
    </span>
  </label>

  <button type="submit" class="btn btn-gold submit-btn" disabled={loading} aria-busy={loading}>
    <span>{loading ? 'Creating account…' : getSubmitLabel(selectedPlan)}</span>
    {#if loading}<span class="spinner"></span>{/if}
  </button>
</form>

<div class="auth-footer">
  <p>Already have an account? <a href="/auth/login" class="auth-link">Sign in</a></p>
</div>

<style>
  .plan-selector { display:flex; gap:8px; margin-bottom:24px; }
  .plan-option { flex:1; display:flex; flex-direction:column; align-items:center; gap:4px; padding:10px 8px; border:1px solid var(--border-dim); border-radius:10px; cursor:pointer; transition:border-color .18s,background .18s; text-align:center; }
  .plan-option.selected { border-color:var(--gold); background:rgba(227,78,36,.08); }
  .plan-radio { display:none; }
  .plan-option-name { font-size:.78rem; font-weight:700; color:var(--white); }
  .plan-option-price { font-size:.72rem; color:var(--muted); }

  .error-banner { display:flex; align-items:center; gap:10px; background:rgba(224,82,82,.08); border:1px solid rgba(224,82,82,.3); border-radius:8px; padding:12px 16px; margin-bottom:16px; font-size:.875rem; color:#F87171; }
  .auth-form { display:flex; flex-direction:column; gap:16px; margin-bottom:20px; }
  .form-row { display:grid; grid-template-columns:1fr 1fr; gap:12px; }
  .form-group { display:flex; flex-direction:column; gap:8px; }
  .form-label { font-size:.9rem; font-weight:600; }
  .form-input { width:100%; border-radius:10px; border:1px solid var(--border-dim); background:rgba(255,255,255,.03); padding:13px 14px; color:inherit; }
  .form-input:focus { outline:none; border-color:var(--cyan-text); box-shadow:0 0 0 3px rgba(94,212,255,.12); }
  .password-strength { font-size:.78rem; min-height:16px; margin-top:4px; }
  .check-label { display:flex; align-items:flex-start; gap:10px; font-size:.82rem; color:var(--muted); cursor:pointer; line-height:1.5; }
  .check-label input { margin-top:2px; accent-color:var(--gold); flex-shrink:0; }
  .submit-btn { width:100%; padding:14px; font-size:.975rem; margin-top:4px; display:inline-flex; justify-content:center; align-items:center; gap:10px; }
  .submit-btn:disabled { opacity:.7; cursor:not-allowed; }
  .spinner { width:16px; height:16px; border:2px solid rgba(0,0,0,.2); border-top-color:#000; border-radius:50%; animation:spin .7s linear infinite; }
  .auth-footer { text-align:center; font-size:.875rem; color:var(--muted); }
  .auth-link { color:var(--cyan-text); font-weight:600; transition:color .18s; }
  .auth-link:hover { color:var(--cyan); }
  @media (max-width: 480px) { .plan-selector { flex-direction:column; } .form-row { grid-template-columns:1fr; } }
  @keyframes spin { to { transform:rotate(360deg); } }
</style>
