<script lang="ts">
export const title = "";
export const label = "";
export const value = "";
export const delta = "";
export const change = "";
export const tone: "up" | "down" | "neutral" = "neutral";
export const positive: boolean | null = null;
export const icon = "";

$: resolvedLabel = label || title || "Metric";
$: resolvedDelta = delta || change || "";
$: resolvedTone = positive === true ? "up" : positive === false ? "down" : tone;

$: toneClass =
  resolvedTone === "up" ? "tone-up" : resolvedTone === "down" ? "tone-down" : "tone-neutral";
</script>

<article class="kpi-card">
  <div class="kpi-top">
    <div>
      <p class="kpi-label">{resolvedLabel}</p>
      <h3 class="kpi-value">{value}</h3>
    </div>

    {#if icon}
      <div class="kpi-icon" aria-hidden="true">{icon}</div>
    {/if}
  </div>

  {#if resolvedDelta}
    <div class={'kpi-delta ${toneClass}'}>
      <span class="delta-pill">{resolvedDelta}</span>
    </div>
  {/if}
</article>

<style>
  .kpi-card {
    border: 1px solid rgba(255,255,255,0.08);
    background:
      linear-gradient(180deg, rgba(255,255,255,0.03), rgba(255,255,255,0.015)),
      rgba(16, 27, 46, 0.82);
    border-radius: 22px;
    padding: 20px;
    box-shadow: 0 18px 44px rgba(0,0,0,0.18);
    min-width: 0;
  }

  .kpi-top {
    display: flex;
    align-items: start;
    justify-content: space-between;
    gap: 14px;
  }

  .kpi-label {
    margin: 0 0 10px;
    font-size: 0.78rem;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: #8fa8c7;
    font-weight: 700;
  }

  .kpi-value {
    margin: 0;
    font-size: clamp(1.8rem, 4vw, 2.5rem);
    line-height: 1;
    letter-spacing: -0.04em;
    color: #f4f7fb;
    font-weight: 800;
  }

  .kpi-icon {
    width: 40px;
    height: 40px;
    border-radius: 14px;
    display: grid;
    place-items: center;
    background: rgba(89,167,255,0.12);
    color: #a9ccff;
    font-size: 1rem;
    flex: 0 0 auto;
  }

  .kpi-delta {
    margin-top: 16px;
  }

  .delta-pill {
    display: inline-flex;
    align-items: center;
    min-height: 30px;
    padding: 0 10px;
    border-radius: 999px;
    font-size: 0.82rem;
    font-weight: 700;
    border: 1px solid transparent;
  }

  .tone-up .delta-pill {
    color: #7ee2a8;
    background: rgba(34,197,94,0.12);
    border-color: rgba(34,197,94,0.18);
  }

  .tone-down .delta-pill {
    color: #ff9f9f;
    background: rgba(239,68,68,0.12);
    border-color: rgba(239,68,68,0.18);
  }

  .tone-neutral .delta-pill {
    color: #b8c7dc;
    background: rgba(255,255,255,0.06);
    border-color: rgba(255,255,255,0.08);
  }
</style>
