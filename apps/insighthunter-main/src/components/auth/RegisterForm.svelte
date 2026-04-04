<script lang="ts">
  import { setToken } from '../../lib/auth';
  let name = '', email = '', password = '', tier = 'lite', error = '', loading = false;
  const params = new URLSearchParams(typeof window !== 'undefined' ? window.location.search : '');
  if (params.get('tier')) tier = params.get('tier')!;

  async function submit() {
    error = ''; loading = true;
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password, tier }),
      });
      const body = await res.json();
      if (!res.ok || !body.data?.token) { error = body.error || 'Registration failed'; return; }
      setToken(body.data.token);
      window.location.href = '/dashboard';
    } catch { error = 'Network error. Please try again.'; }
    finally { loading = false; }
  }
</script>

<form on:submit|preventDefault={submit}>
  <h1 style="font-family:var(--font-display);font-size:var(--text-xl);font-style:italic;margin-bottom:var(--space-2);">Start your free trial.</h1>
  <p style="color:var(--color-text-muted);font-size:var(--text-sm);margin-bottom:var(--space-6);">14 days free. No credit card required.</p>
  {#if error}<p role="alert" style="color:var(--color-error);font-size:var(--text-sm);margin-bottom:var(--space-3);">{error}</p>{/if}
  {#each [['Name','name',name,(v:string)=>{name=v},'text','name'],['Email','email',email,(v:string)=>{email=v},'email','email'],['Password','password',password,(v:string)=>{password=v},'password','new-password']] as [lbl,id,val,set,type,autocomplete]}
    <label style="display:block;margin-bottom:var(--space-4);">
      <span style="font-size:var(--text-sm);font-weight:500;">{lbl}</span>
      <input {type} value={val} on:input={e => set((e.target as HTMLInputElement).value)}
        {autocomplete} required
        style="display:block;width:100%;margin-top:var(--space-1);padding:var(--space-2) var(--space-3);border:1px solid var(--color-border);border-radius:var(--radius-md);background:var(--color-surface);font-size:var(--text-sm);" />
    </label>
  {/each}
  <button type="submit" class="btn btn-primary" style="width:100%;justify-content:center;" disabled={loading}>
    {loading ? 'Creating account…' : 'Create account'}
  </button>
  <p style="text-align:center;margin-top:var(--space-5);font-size:var(--text-sm);color:var(--color-text-muted);">
    Already have an account? <a href="/auth/login" style="color:var(--color-primary);font-weight:600;">Sign in →</a>
  </p>
</form>
