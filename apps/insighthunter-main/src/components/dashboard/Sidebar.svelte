<script lang="ts">
  export let session: { email?: string; name?: string } = {};

  const nav = [
    { href: '/dashboard', label: 'Overview', hint: 'CFO command center' },
    { href: '/advisor', label: 'Advisor', hint: 'AI finance guidance' },
    { href: '/pricing', label: 'Billing', hint: 'Plans and subscriptions' },
    { href: '/documents', label: 'Documents', hint: 'Vault and records' },
    { href: '/compliance', label: 'Compliance', hint: 'Calendar and obligations' }
  ];

  $: email = session?.email ?? '';
  $: name = session?.name ?? (email ? email.split('@')[0] : 'Operator');
</script>

<aside class="sidebar">
  <div class="brand-block">
    <a class="brand" href="/">
      <span class="brand-mark">IH</span>
      <div>
        <strong>Insight Hunter</strong>
        <span>Finance operating system</span>
      </div>
    </a>
  </div>

  <div class="workspace-card">
    <p class="eyebrow">Workspace</p>
    <h2>{name}</h2>
    <p>{email || 'Authenticated user session active'}</p>
  </div>

  <nav class="nav" aria-label="Primary dashboard navigation">
    {#each nav as item}
      <a class="nav-link" href={item.href}>
        <div>
          <strong>{item.label}</strong>
          <span>{item.hint}</span>
        </div>
      </a>
    {/each}
  </nav>

  <div class="sidebar-footer">
    <div class="status-card">
      <p class="eyebrow">Platform state</p>
      <strong>Connected shell</strong>
      <span>Main app, auth worker, and edge routing aligned.</span>
    </div>

    <a class="launch-btn" href="/auth/register">Create another account</a>
  </div>
</aside>

<style>
  .sidebar {
    min-height: 100%;
    padding: 22px 18px;
    display: flex;
    flex-direction: column;
    gap: 18px;
    background:
      linear-gradient(180deg, rgba(255,255,255,0.03), rgba(255,255,255,0)),
      rgba(8, 14, 26, 0.9);
  }

  .brand-block {
    padding-bottom: 4px;
  }

  .brand {
    display: flex;
    align-items: center;
    gap: 12px;
    color: #f4f7fb;
    text-decoration: none;
  }

  .brand strong {
    display: block;
    font-size: 1rem;
  }

  .brand span:last-child {
    color: #8fa3bf;
    font-size: 0.84rem;
  }

  .brand-mark {
    width: 40px;
    height: 40px;
    border-radius: 14px;
    display: grid;
    place-items: center;
    background: linear-gradient(135deg, #5aa6ff, #2349dd);
    color: white !important;
    font-weight: 800;
    letter-spacing: -0.03em;
    box-shadow: 0 16px 32px rgba(30,88,255,0.28);
  }

  .workspace-card,
  .nav-link,
  .status-card {
    border: 1px solid rgba(255,255,255,0.08);
    background: rgba(16, 27, 46, 0.78);
    border-radius: 18px;
  }

  .workspace-card,
  .status-card {
    padding: 16px;
  }

  .eyebrow {
    margin: 0 0 8px;
    font-size: 0.72rem;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    color: #7db4ff;
    font-weight: 700;
  }

  .workspace-card h2,
  .status-card strong {
    margin: 0 0 8px;
    color: #f4f7fb;
    letter-spacing: -0.03em;
  }

  .workspace-card p,
  .status-card span {
    margin: 0;
    color: #92a4bf;
    line-height: 1.6;
  }

  .nav {
    display: grid;
    gap: 10px;
  }

  .nav-link {
    display: block;
    padding: 14px 14px;
    text-decoration: none;
    color: #f4f7fb;
    transition: transform 0.18s ease, border-color 0.18s ease, background 0.18s ease;
  }

  .nav-link:hover {
    transform: translateX(2px);
    border-color: rgba(125,180,255,0.28);
    background: rgba(23, 39, 66, 0.92);
  }

  .nav-link strong {
    display: block;
    margin-bottom: 4px;
    font-size: 0.95rem;
  }

  .nav-link span {
    display: block;
    color: #92a4bf;
    font-size: 0.82rem;
  }

  .sidebar-footer {
    margin-top: auto;
    display: grid;
    gap: 12px;
  }

  .launch-btn {
    min-height: 46px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    border-radius: 14px;
    background: #59a7ff;
    color: white;
    text-decoration: none;
    font-weight: 800;
    transition: transform 0.18s ease, opacity 0.18s ease;
  }

  .launch-btn:hover {
    transform: translateY(-1px);
  }

  @media (max-width: 980px) {
    .sidebar {
      padding: 18px;
    }
  }
</style>
