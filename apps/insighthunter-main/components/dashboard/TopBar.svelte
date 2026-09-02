<script lang="ts">
export const title = "Dashboard";
export const session: { email?: string; name?: string } = {};

$: email = session?.email ?? "";
$: name = session?.name ?? (email ? email.split("@")[0] : "Operator");
$: initials =
  name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("") || "IH";
</script>

<header class="topbar">
  <div class="title-wrap">
    <p class="eyebrow">Insight Hunter workspace</p>
    <h1>{title}</h1>
  </div>

  <div class="actions">
    <div class="signal-card">
      <span class="signal-dot"></span>
      <div>
        <strong>System live</strong>
        <span>Auth, billing, and routing connected</span>
      </div>
    </div>

    <a class="ghost-action" href="/pricing">Plans</a>

    <div class="user-chip" aria-label="Current user">
      <span class="avatar">{initials}</span>
      <div class="user-meta">
        <strong>{name}</strong>
        <span>{email || 'Signed in'}</span>
      </div>
    </div>
  </div>
</header>

<style>
  .topbar {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 18px;
    padding: 20px 24px;
    border-bottom: 1px solid rgba(255,255,255,0.08);
    background:
      linear-gradient(180deg, rgba(255,255,255,0.02), rgba(255,255,255,0)),
      rgba(7, 14, 26, 0.72);
    backdrop-filter: blur(18px);
    position: sticky;
    top: 0;
    z-index: 20;
  }

  .title-wrap {
    min-width: 0;
  }

  .eyebrow {
    margin: 0 0 6px;
    font-size: 0.76rem;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    color: #7db4ff;
    font-weight: 700;
  }

  h1 {
    margin: 0;
    font-size: clamp(1.4rem, 2.8vw, 2rem);
    line-height: 1.1;
    letter-spacing: -0.03em;
    color: #f5f8fc;
  }

  .actions {
    display: flex;
    align-items: center;
    gap: 12px;
    flex-wrap: wrap;
    justify-content: flex-end;
  }

  .signal-card,
  .user-chip,
  .ghost-action {
    border: 1px solid rgba(255,255,255,0.08);
    background: rgba(16, 27, 46, 0.82);
    border-radius: 14px;
  }

  .signal-card {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 10px 12px;
    min-height: 48px;
  }

  .signal-card strong,
  .user-meta strong {
    display: block;
    color: #f4f7fb;
    font-size: 0.92rem;
  }

  .signal-card span,
  .user-meta span {
    color: #92a4bf;
    font-size: 0.8rem;
  }

  .signal-dot {
    width: 10px;
    height: 10px;
    border-radius: 999px;
    background: #22c55e;
    box-shadow: 0 0 0 6px rgba(34,197,94,0.12);
    flex: 0 0 auto;
  }

  .ghost-action {
    min-height: 48px;
    display: inline-flex;
    align-items: center;
    padding: 0 14px;
    color: #f4f7fb;
    text-decoration: none;
    font-weight: 700;
    transition: transform 0.18s ease, border-color 0.18s ease;
  }

  .ghost-action:hover {
    transform: translateY(-1px);
    border-color: rgba(125,180,255,0.3);
  }

  .user-chip {
    dis
