<script lang="ts">
  export let session: any;

  const user = session?.user ?? {};
  const name =
    user?.name ||
    user?.email?.split?.('@')?.[0] ||
    'Operator';

  const email = user?.email || '';
  const tier = (user?.tier || 'free').toString();
  const initials = name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part: string) => part[0]?.toUpperCase() ?? '')
    .join('') || 'IH';
</script>

<div class="topbar">
  <div class="topbar-left">
    <div class="search-shell">
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path
          d="M10.5 4a6.5 6.5 0 1 1 0 13a6.5 6.5 0 0 1 0-13Zm9 15 -4.35-4.35"
          fill="none"
          stroke="currentColor"
          stroke-width="1.8"
          stroke-linecap="round"
          stroke-linejoin="round"
        />
      </svg>
      <input
        type="search"
        placeholder="Search reports, insights, customers, payroll..."
        aria-label="Search dashboard"
      />
    </div>
  </div>

  <div class="topbar-right">
    <a class="quick-link" href="/dashboard/ai">AI CFO</a>
    <a class="quick-link" href="/dashboard/reports">Reports</a>

    <span class="tier-pill" data-tier={tier}>
      {tier}
    </span>

    <a class="profile-card" href="/dashboard/settings" aria-label="Open settings">
      <span class="profile-meta">
        <strong>{name}</strong>
        <small>{email}</small>
      </span>
      <span class="avatar">{initials}</span>
    </a>
  </div>
</div>

<style>
  :global(:root) {
    --tb-bg: rgba(10, 16, 26, 0.82);
    --tb-surface: rgba(18, 28, 43, 0.92);
    --tb-border: rgba(149, 172, 201, 0.16);
    --tb-border-strong: rgba(103, 197, 255, 0.3);
    --tb-text: var(--app-text, #edf4ff);
    --tb-muted: var(--app-muted, #97a9c0);
    --tb-cyan: var(--app-cyan, #68d6ff);
    --tb-gold: var(--app-gold, #eb9650);
  }

  .topbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
    min-height: 76px;
    padding: 14px 20px;
  }

  .topbar-left {
    flex: 1;
    min-width: 0;
  }

  .search-shell {
    display: flex;
    align-items: center;
    gap: 10px;
    min-height: 48px;
    padding: 0 14px;
    border: 1px solid var(--tb-border);
    border-radius: 14px;
    background: var(--tb-surface);
    max-width: 560px;
  }

  .search-shell svg {
    width: 18px;
    height: 18px;
    color: var(--tb-muted);
    flex: 0 0 auto;
  }

  .search-shell input {
    width: 100%;
    border: 0;
    outline: 0;
    background: transparent;
    color: var(--tb-text);
    font-size: 0.94rem;
  }

  .search-shell input::placeholder {
    color: var(--tb-muted);
  }

  .topbar-right {
    display: flex;
    align-items: center;
    gap: 12px;
    flex-wrap: wrap;
    justify-content: flex-end;
  }

  .quick-link {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-height: 40px;
    padding: 0 14px;
    border: 1px solid var(--tb-border);
    border-radius: 999px;
    color: var(--tb-text);
    background: transparent;
    font-size: 0.88rem;
    font-weight: 700;
    text-decoration: none;
    transition:
      border-color 160ms ease,
      color 160ms ease,
      transform 160ms ease;
  }

  .quick-link:hover {
    border-color: var(--tb-border-strong);
    color: var(--tb-cyan);
    transform: translateY(-1px);
  }

  .tier-pill {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-height: 34px;
    padding: 0 12px;
    border-radius: 999px;
    background: rgba(103, 197, 255, 0.1);
    border: 1px solid rgba(103, 197, 255, 0.2);
    color: var(--tb-cyan);
    font-size: 0.72rem;
    font-weight: 800;
    letter-spacing: 0.11em;
    text-transform: uppercase;
  }

  .tier-pill[data-tier='pro'],
  .tier-pill[data-tier='enterprise'] {
    background: rgba(235, 149, 80, 0.12);
    border-color: rgba(235, 149, 80, 0.22);
    color: var(--tb-gold);
  }

  .profile-card {
    display: inline-flex;
    align-items: center;
    gap: 12px;
    min-height: 52px;
    padding: 8px 10px 8px 14px;
    border: 1px solid var(--tb-border);
    border-radius: 16px;
    background: var(--tb-surface);
    text-decoration: none;
    transition:
      border-color 160ms ease,
      transform 160ms ease;
  }

  .profile-card:hover {
    border-color: var(--tb-border-strong);
    transform: translateY(-1px);
  }

  .profile-meta {
    display: flex;
    flex-direction: column;
    min-width: 0;
  }

  .profile-meta strong {
    color: var(--tb-text);
    font-size: 0.9rem;
    line-height: 1.2;
  }

  .profile-meta small {
    color: var(--tb-muted);
    font-size: 0.76rem;
    line-height: 1.2;
    white-space: nowrap;
  }

  .avatar {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 34px;
    height: 34px;
    border-radius: 999px;
    background: linear-gradient(180deg, rgba(103, 197, 255, 0.2), rgba(103, 197, 255, 0.08));
    color: var(--tb-text);
    font-size: 0.8rem;
    font-weight: 800;
    letter-spacing: 0.04em;
    flex: 0 0 auto;
  }

  @media (max-width: 920px) {
    .topbar {
      flex-direction: column;
      align-items: stretch;
    }

    .search-shell {
      max-width: none;
    }

    .topbar-right {
      justify-content: space-between;
    }
  }

  @media (max-width: 640px) {
    .topbar {
      padding: 12px 14px;
    }

    .topbar-right {
      gap: 10px;
    }

    .quick-link {
      flex: 1 1 calc(50% - 10px);
    }

    .profile-card {
      width: 100%;
      justify-content: space-between;
    }
  }
</style>
