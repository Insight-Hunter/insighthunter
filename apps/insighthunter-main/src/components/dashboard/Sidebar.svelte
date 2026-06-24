<script lang="ts">
  export let session: any;

  const navItems = [
    { href: '/dashboard', icon: '◫', label: 'Overview' },
    { href: '/dashboard/reports', icon: '◔', label: 'Reports' },
    { href: '/dashboard/forecast', icon: '△', label: 'Forecast' },
    { href: '/dashboard/bookkeeping', icon: '⌘', label: 'Bookkeeping' },
    { href: '/dashboard/bizforma', icon: '□', label: 'BizForma' },
    { href: '/dashboard/insights', icon: '✦', label: 'AI Insights' },
    { href: '/dashboard/settings', icon: '⚙', label: 'Settings' },
  ];

  let collapsed = false;
  let currentPath = '';

  const user = session?.user ?? {};
  const email = user?.email || 'account@insighthunter.ai';
  const tier = (user?.tier || 'free').toString();
  const orgId = user?.orgId || session?.orgId || 'org';
  const displayName =
    user?.name ||
    email.split('@')[0] ||
    'Insight Hunter';

  if (typeof window !== 'undefined') {
    currentPath = window.location.pathname;
  }
</script>

<aside class:collapsed class="sidebar">
  <div class="sidebar-inner">
    <div class="sidebar-brand">
      <a href="/dashboard" class="brand-link" aria-label="Go to dashboard">
        <span class="brand-mark">IH</span>

        {#if !collapsed}
          <span class="brand-copy">
            <strong>Insight Hunter</strong>
            <small>Auto-CFO workspace</small>
          </span>
        {/if}
      </a>

      <button
        class="collapse-btn"
        type="button"
        aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        on:click={() => (collapsed = !collapsed)}
      >
        {collapsed ? '→' : '←'}
      </button>
    </div>

    <div class="workspace-card">
      {#if !collapsed}
        <span class="workspace-label">Workspace</span>
        <strong>{displayName}</strong>
        <small>{orgId}</small>
      {:else}
        <span class="workspace-mini">✦</span>
      {/if}
    </div>

    <nav class="sidebar-nav" aria-label="Dashboard navigation">
      {#each navItems as item}
        <a
          href={item.href}
          class:active={currentPath === item.href}
          class="nav-item"
          aria-current={currentPath === item.href ? 'page' : undefined}
          title={collapsed ? item.label : undefined}
        >
          <span class="nav-icon">{item.icon}</span>
          {#if !collapsed}
            <span class="nav-label">{item.label}</span>
          {/if}
        </a>
      {/each}
    </nav>

    <div class="sidebar-footer">
      {#if !collapsed}
        <div class="user-card">
          <span class="user-label">Signed in</span>
          <strong>{email}</strong>
          <span class="tier-pill">{tier}</span>
        </div>
      {:else}
        <div class="tier-mini" title={tier}>
          {tier.slice(0, 1).toUpperCase()}
        </div>
      {/if}
    </div>
  </div>
</aside>

<style>
  :global(:root) {
    --sb-bg: #0b111b;
    --sb-surface: rgba(18, 28, 43, 0.88);
    --sb-surface-2: rgba(23, 35, 54, 0.95);
    --sb-border: rgba(149, 172, 201, 0.16);
    --sb-border-strong: rgba(103, 197, 255, 0.32);
    --sb-text: var(--app-text, #edf4ff);
    --sb-muted: var(--app-muted, #97a9c0);
    --sb-subtle: var(--app-subtle, #7488a3);
    --sb-cyan: var(--app-cyan, #68d6ff);
    --sb-gold: var(--app-gold, #eb9650);
    --sb-radius: 20px;
  }

  .sidebar {
    width: 286px;
    min-height: 100vh;
    background:
      radial-gradient(circle at top, rgba(103, 197, 255, 0.08), transparent 28%),
      linear-gradient(180deg, #0d1522, #09111b 72%);
    border-right: 1px solid var(--sb-border);
    transition: width 180ms ease;
    flex-shrink: 0;
  }

  .sidebar.collapsed {
    width: 92px;
  }

  .sidebar-inner {
    display: flex;
    flex-direction: column;
    gap: 18px;
    min-height: 100vh;
    padding: 18px 14px;
  }

  .sidebar-brand {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
  }

  .brand-link {
    display: flex;
    align-items: center;
    gap: 12px;
    min-width: 0;
    text-decoration: none;
    color: var(--sb-text);
  }

  .brand-mark {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 42px;
    height: 42px;
    border-radius: 14px;
    background: linear-gradient(180deg, rgba(103, 197, 255, 0.22), rgba(235, 149, 80, 0.15));
    border: 1px solid rgba(103, 197, 255, 0.18);
    font-size: 0.85rem;
    font-weight: 800;
    letter-spacing: 0.08em;
  }

  .brand-copy {
    display: flex;
    flex-direction: column;
    min-width: 0;
  }

  .brand-copy strong {
    font-size: 0.98rem;
    letter-spacing: -0.02em;
  }

  .brand-copy small {
    color: var(--sb-muted);
    font-size: 0.74rem;
  }

  .collapse-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 34px;
    height: 34px;
    border: 1px solid var(--sb-border);
    border-radius: 10px;
    background: transparent;
    color: var(--sb-muted);
    cursor: pointer;
    transition:
      color 160ms ease,
      border-color 160ms ease,
      transform 160ms ease;
  }

  .collapse-btn:hover {
    color: var(--sb-cyan);
    border-color: var(--sb-border-strong);
    transform: translateY(-1px);
  }

  .workspace-card,
  .user-card {
    border: 1px solid var(--sb-border);
    border-radius: var(--sb-radius);
    background: var(--sb-surface);
  }

  .workspace-card {
    padding: 14px;
    min-height: 90px;
    display: flex;
    flex-direction: column;
    justify-content: center;
    gap: 5px;
  }

  .workspace-label,
  .user-label {
    color: var(--sb-subtle);
    font-size: 0.7rem;
    font-weight: 700;
    letter-spacing: 0.12em;
    text-transform: uppercase;
  }

  .workspace-card strong,
  .user-card strong {
    color: var(--sb-text);
    font-size: 0.95rem;
    line-height: 1.3;
    word-break: break-word;
  }

  .workspace-card small {
    color: var(--sb-muted);
    font-size: 0.74rem;
  }

  .workspace-mini,
  .tier-mini {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 100%;
    min-height: 48px;
    border-radius: 14px;
    background: var(--sb-surface);
    border: 1px solid var(--sb-border);
    color: var(--sb-cyan);
    font-weight: 800;
  }

  .sidebar-nav {
    display: flex;
    flex-direction: column;
    gap: 8px;
    flex: 1;
  }

  .nav-item {
    display: flex;
    align-items: center;
    gap: 12px;
    min-height: 48px;
    padding: 0 14px;
    border: 1px solid transparent;
    border-radius: 16px;
    color: var(--sb-muted);
    text-decoration: none;
    transition:
      background 160ms ease,
      color 160ms ease,
      border-color 160ms ease,
      transform 160ms ease;
  }

  .nav-item:hover {
    background: rgba(103, 197, 255, 0.06);
    border-color: rgba(103, 197, 255, 0.08);
    color: var(--sb-text);
    transform: translateX(1px);
  }

  .nav-item.active {
    background: linear-gradient(180deg, rgba(103, 197, 255, 0.12), rgba(103, 197, 255, 0.06));
    border-color: rgba(103, 197, 255, 0.18);
    color: var(--sb-cyan);
  }

  .nav-icon {
    width: 18px;
    text-align: center;
    flex: 0 0 auto;
    font-size: 0.94rem;
  }

  .nav-label {
    font-size: 0.92rem;
    font-weight: 600;
  }

  .sidebar-footer {
    padding-top: 6px;
  }

  .user-card {
    padding: 14px;
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .tier-pill {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: fit-content;
    min-height: 30px;
    padding: 0 10px;
    border-radius: 999px;
    background: rgba(235, 149, 80, 0.12);
    border: 1px solid rgba(235, 149, 80, 0.2);
    color: var(--sb-gold);
    font-size: 0.7rem;
    font-weight: 800;
    letter-spacing: 0.1em;
    text-transform: uppercase;
  }

  @media (max-width: 980px) {
    .sidebar {
      width: 100%;
      min-height: auto;
      border-right: 0;
      border-bottom: 1px solid var(--sb-border);
    }

    .sidebar.collapsed {
      width: 100%;
    }

    .sidebar-inner {
      min-height: auto;
    }

    .sidebar-nav {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }
  }

  @media (max-width: 640px) {
    .sidebar-nav {
      grid-template-columns: 1fr;
    }
  }
</style>
