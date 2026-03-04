<!-- apps/insighthunter-main/src/lib/components/RecentActivity.svelte -->
<script lang="ts">
  import { onMount } from 'svelte';

  type ActivityType = 'invoice' | 'payment' | 'ai_insight' | 'alert' | 'report' | 'login';

  interface Activity {
    id: string;
    type: ActivityType;
    title: string;
    description: string;
    amount?: number;
    currency?: string;
    timestamp: string;
    read: boolean;
  }

  let activities: Activity[] = [];
  let loading = true;
  let error = '';

  const ICONS: Record<ActivityType, string> = {
    invoice:    '🧾',
    payment:    '💳',
    ai_insight: '🤖',
    alert:      '⚠️',
    report:     '📊',
    login:      '🔐',
  };

  const COLORS: Record<ActivityType, string> = {
    invoice:    '#667eea',
    payment:    '#10b981',
    ai_insight: '#764ba2',
    alert:      '#f59e0b',
    report:     '#06b6d4',
    login:      '#6b7280',
  };

  function formatTime(ts: string): string {
    const date = new Date(ts);
    const now  = new Date();
    const diff = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diff < 60)   return `${diff}s ago`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400)return `${Math.floor(diff / 3600)}h ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }

  function formatAmount(amount: number, currency = 'USD'): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency', currency, minimumFractionDigits: 2,
    }).format(amount);
  }

  async function fetchActivity() {
    try {
      loading = true;
      error   = '';
      const res = await fetch('/api/activity/recent?limit=10');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      activities = data.activities ?? [];
    } catch (e) {
      error = e instanceof Error ? e.message : 'Failed to load activity';
    } finally {
      loading = false;
    }
  }

  async function markAllRead() {
    await fetch('/api/activity/mark-read', { method: 'POST' });
    activities = activities.map(a => ({ ...a, read: true }));
  }

  onMount(() => {
    fetchActivity();
    // Poll every 30s for live feel
    const interval = setInterval(fetchActivity, 30_000);
    return () => clearInterval(interval);
  });
</script>

<div class="card">
  <div class="card-header">
    <div class="header-left">
      <h2>Recent Activity</h2>
      {#if activities.some(a => !a.read)}
        <span class="badge">{activities.filter(a => !a.read).length} new</span>
      {/if}
    </div>
    <div class="header-actions">
      {#if activities.some(a => !a.read)}
        <button class="link-btn" on:click={markAllRead}>Mark all read</button>
      {/if}
      <button class="icon-btn" on:click={fetchActivity} title="Refresh">↻</button>
    </div>
  </div>

  {#if loading}
    <div class="state-container">
      <div class="spinner"></div>
      <p>Loading activity...</p>
    </div>

  {:else if error}
    <div class="state-container error">
      <span>⚠️</span>
      <p>{error}</p>
      <button class="retry-btn" on:click={fetchActivity}>Retry</button>
    </div>

  {:else if activities.length === 0}
    <div class="state-container">
      <span style="font-size:2rem">📭</span>
      <p>No recent activity</p>
    </div>

  {:else}
    <ul class="activity-list">
      {#each activities as activity (activity.id)}
        <li class="activity-item" class:unread={!activity.read}>
          <div
            class="activity-icon"
            style="background: {COLORS[activity.type]}22; color: {COLORS[activity.type]}"
          >
            {ICONS[activity.type]}
          </div>
          <div class="activity-body">
            <div class="activity-top">
              <span class="activity-title">{activity.title}</span>
              {#if activity.amount}
                <span
                  class="activity-amount"
                  style="color: {activity.type === 'payment' ? '#10b981' : '#f0fdf4'}"
                >
                  {formatAmount(activity.amount, activity.currency)}
                </span>
              {/if}
            </div>
            <p class="activity-desc">{activity.description}</p>
          </div>
          <span class="activity-time">{formatTime(activity.timestamp)}</span>
          {#if !activity.read}
            <div class="unread-dot"></div>
          {/if}
        </li>
      {/each}
    </ul>

    <a href="/reports" class="view-all">View all activity →</a>
  {/if}
</div>

<style>
  .card {
    background: #0f3d2e;
    border: 1px solid #1a4d3a;
    border-radius: 16px;
    padding: 1.5rem;
    color: #f0fdf4;
    font-family: Inter, sans-serif;
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  .card-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .header-left {
    display: flex;
    align-items: center;
    gap: 0.75rem;
  }

  h2 {
    font-size: 1.1rem;
    font-weight: 700;
    color: #f0fdf4;
    margin: 0;
  }

  .badge {
    background: linear-gradient(135deg, #667eea, #764ba2);
    color: white;
    font-size: 0.7rem;
    font-weight: 700;
    padding: 0.2rem 0.6rem;
    border-radius: 50px;
  }

  .header-actions {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .link-btn {
    background: none;
    border: none;
    color: #a7f3d0;
    font-size: 0.8rem;
    cursor: pointer;
    padding: 0;
  }

  .link-btn:hover { text-decoration: underline; }

  .icon-btn {
    background: #1a4d3a;
    border: none;
    color: #a7f3d0;
    width: 2rem;
    height: 2rem;
    border-radius: 8px;
    cursor: pointer;
    font-size: 1rem;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .icon-btn:hover { background: #22604a; }

  .state-container {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    padding: 2rem;
    color: #a7f3d0;
    font-size: 0.9rem;
  }

  .state-container.error { color: #f87171; }

  .spinner {
    width: 24px;
    height: 24px;
    border: 3px solid #1a4d3a;
    border-top-color: #a7f3d0;
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
  }

  @keyframes spin { to { transform: rotate(360deg); } }

  .retry-btn {
    margin-top: 0.5rem;
    padding: 0.4rem 1rem;
    background: #1a4d3a;
    border: 1px solid #f87171;
    color: #f87171;
    border-radius: 8px;
    cursor: pointer;
    font-size: 0.8rem;
  }

  .activity-list {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }

  .activity-item {
    display: flex;
    align-items: flex-start;
    gap: 0.75rem;
    padding: 0.75rem;
    border-radius: 10px;
    transition: background 0.15s;
    position: relative;
  }

  .activity-item:hover { background: #1a4d3a; }

  .activity-item.unread { background: #12402e; }

  .activity-icon {
    width: 2.25rem;
    height: 2.25rem;
    border-radius: 10px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 1rem;
    flex-shrink: 0;
  }

  .activity-body {
    flex: 1;
    min-width: 0;
  }

  .activity-top {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 0.5rem;
  }

  .activity-title {
    font-size: 0.875rem;
    font-weight: 600;
    color: #f0fdf4;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .activity-amount {
    font-size: 0.875rem;
    font-weight: 700;
    white-space: nowrap;
  }

  .activity-desc {
    font-size: 0.78rem;
    color: #6ee7b7;
    margin: 0.15rem 0 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .activity-time {
    font-size: 0.72rem;
    color: #6b7280;
    white-space: nowrap;
    flex-shrink: 0;
  }

  .unread-dot {
    width: 6px;
    height: 6px;
    background: #667eea;
    border-radius: 50%;
    position: absolute;
    top: 0.9rem;
    right: 0.75rem;
  }

  .view-all {
    display: block;
    text-align: center;
    color: #a7f3d0;
    font-size: 0.85rem;
    text-decoration: none;
    padding: 0.5rem;
    border-radius: 8px;
    border: 1px solid #1a4d3a;
    transition: background 0.15s;
  }

  .view-all:hover { background: #1a4d3a; }
</style>
