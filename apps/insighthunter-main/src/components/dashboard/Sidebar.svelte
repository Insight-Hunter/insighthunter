<script lang="ts">
  export let session: { email: string; tier: string; orgId: string };

  const navItems = [
    { href: '/dashboard', icon: '▦', label: 'Overview' },
    { href: '/dashboard/reports', icon: '📊', label: 'Reports' },
    { href: '/dashboard/forecast', icon: '📈', label: 'Forecast' },
    { href: '/dashboard/bookkeeping', icon: '📒', label: 'Bookkeeping' },
    { href: '/dashboard/bizforma', icon: '🏢', label: 'BizForma' },
    { href: '/dashboard/insights', icon: '✦', label: 'AI Insights' },
    { href: '/dashboard/settings', icon: '⚙', label: 'Settings' },
  ];

  let collapsed = false;
  $: currentPath = typeof window !== 'undefined' ? window.location.pathname : '';
</script>

<aside class="sidebar" class:collapsed>
  <div class="sidebar-logo">
    {#if !collapsed}
      <span class="logo-text">Insight Hunter</span>
    {:else}
      <span class="logo-icon">✦</span>
    {/if}
  </div>

  <nav class="sidebar-nav">
    {#each navItems as item}
      <a
        href={item.href}
        class="nav-item"
        class:active={currentPath === item.href}
      >
        <span class="nav-icon">{item.icon}</span>
        {#if !collapsed}<span class="nav-label">{item.label}</span>{/if}
      </a>
    {/each}
  </nav>

  <div class="sidebar-footer">
    {#if !collapsed}
      <div class="user-info">
        <span class="user-email">{session.email}</span>
        <span class="user-tier">{session.tier}</span>
      </div>
    {/if}
    <button class="collapse-btn" on:click={() => collapsed = !collapsed}>
      {collapsed ? '→' : '←'}
    </button>
  </div>
</aside>

<style>
.sidebar {
  width: 240px;
  min-height: 100vh;
  background: #0f0f0f;
  border-right: 1px solid rgba(255,255,255,0.06);
  display: flex;
  flex-direction: column;
  transition: width 0.2s ease;
  flex-shrink: 0;
}
.sidebar.collapsed { width: 64px; }
.sidebar-logo {
  padding: 20px 16px;
  border-bottom: 1px solid rgba(255,255,255,0.06);
  font-family: 'General Sans', 'Inter', sans-serif;
  font-weight: 700;
  font-size: 1rem;
  color: #C9A84C;
  min-height: 64px;
  display: flex;
  align-items: center;
}
.sidebar-nav {
  flex: 1;
  padding: 12px 8px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.nav-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 12px;
  border-radius: 8px;
  color: #999;
  font-size: 0.875rem;
  text-decoration: none;
  transition: background 0.15s, color 0.15s;
}
.nav-item:hover { background: rgba(255,255,255,0.05); color: #fff; }
.nav-item.active { background: rgba(201,168,76,0.12); color: #C9A84C; }
.nav-icon { width: 20px; text-align: center; flex-shrink: 0; }
.sidebar-footer {
  padding: 16px;
  border-top: 1px solid rgba(255,255,255,0.06);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}
.user-info { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
.user-email { font-size: 0.75rem; color: #999; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.user-tier {
  font-size: 0.7rem;
  font-weight: 700;
  color: #C9A84C;
  text-transform: uppercase;
  letter-spacing: 0.08em;
}
.collapse-btn {
  background: none;
  border: 1px solid rgba(255,255,255,0.1);
  color: #999;
  width: 28px; height: 28px;
  border-radius: 4px;
  cursor: pointer;
  flex-shrink: 0;
  font-size: 12px;
}
.collapse-btn:hover { color: #fff; border-color: rgba(255,255,255,0.3); }
</style>
