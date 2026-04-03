<script lang="ts">
  let email = '', sent = false, error = '', loading = false;
  async function submit() {
    error = ''; loading = true;
    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      if (res.ok) { sent = true; } else { const b = await res.json(); error = b.error || 'Failed'; }
    } catch { error = 'Network error.'; }
    finally { loading = false; }
  }
</script>

{#if sent}
  <div style="text-align:center;padding:var(--space-8);">
    <div style="font-size:3rem;margin-bottom:var(--space-4);">📬</div>
    <h2 style="font-family:var(--font-display);font-size:var(--text-xl);font-style:italic;margin-bottom:var(--space-3);">Check your inbox.</h2>
    <p style="color:var(--color-text-muted);font-size:var(--text-sm);">We've sent a password reset link to <strong>{email}</strong>.</p>
  </div>
{:else}
  <form on:submit|preventDefault={submit}>
    <h1 style="font-family:var(--font-display);font-size:var(--text-xl);font-style:italic;margin-bottom:var(--space-2);">Reset your password.</h1>
    <p style="color:var(--color-text-muted);font-size:var(--text-sm);margin-bottom:var(--space-6);">Enter your email and we'll send a reset link.</p>
    {#if error}<p role="alert" style="color:var(--color-error);font-size:var(--text-sm);margin-bottom:var(--space-3);">{error}</p>{/if}
    <label style="display:block;margin-bottom:var(--space-5);">
      <span style="font-size:var(--text-sm);font-weight:500;">Email</span>
      <input type="email" bind:value={email} required autocomplete="email"
        style="display:block;width:100%;margin-top:var(--space-1);padding:var(--space-2) var(--space-3);border:1px solid var(--color-border);border-radius:var(--radius-md);background:var(--color-surface);font-size:var(--text-sm);" />
    </label>
    <button type="submit" class="btn btn-primary" style="width:100%;justify-content:center;" disabled={loading}>
      {loading ? 'Sending…' : 'Send reset link'}
    </button>
    <p style="text-align:center;margin-top:var(--space-5);font-size:var(--text-sm);">
      <a href="/auth/login" style="color:var(--color-primary);">← Back to login</a>
    </p>
  </form>
{/if}
