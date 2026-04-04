<script lang="ts">
  import { formData } from '../../stores/wizard';
  import { getCalendar } from '../../lib/api';
  import type { CalendarEvent } from '../../lib/api';
  import { onMount } from 'svelte';

  $: fd = $formData;
  $: entityType = fd.entity.type;
  $: state      = fd.entity.state;

  let events: CalendarEvent[] = [];
  let loading = false;
  let generated = false;
  let error = '';

  const categoryColors: Record<string, string> = {
    state:    '#0a84ff',
    federal:  '#5e5ce6',
    tax:      '#ff9f0a',
    local:    '#30d158',
    default:  '#5ac8fa',
  };

  function color(cat: string) {
    return categoryColors[cat] ?? categoryColors.default;
  }

  async function generate() {
    loading = true; error = '';
    try {
      events = await getCalendar({
        entityType,
        state,
        formationDate: fd.compliance.sosFilingDate || undefined,
        hasSalesTax: fd.compliance.salesTaxPermit,
        taxElection: fd.einTax.taxElection,
      });
      generated = true;
    } catch {
      error = 'Failed to generate calendar. Try again.';
    } finally {
      loading = false;
    }
  }

  function downloadICS() {
    const lines = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//Bizforma//InsightHunters//EN',
      'CALSCALE:GREGORIAN',
    ];
    for (const ev of events) {
      const dt = ev.dueDate.replace(/-/g, '');
      const uid = crypto.randomUUID();
      lines.push(
        'BEGIN:VEVENT',
        `UID:${uid}`,
        `DTSTART;VALUE=DATE:${dt}`,
        `DTEND;VALUE=DATE:${dt}`,
        `SUMMARY:${ev.title}`,
        `DESCRIPTION:${ev.description}${ev.penalty ? ' Penalty: ' + ev.penalty : ''}`,
        `CATEGORIES:${ev.category.toUpperCase()}`,
        'END:VEVENT'
      );
    }
    lines.push('END:VCALENDAR');
    const blob = new Blob([lines.join('\r\n')], { type: 'text/calendar' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'bizforma-compliance.ics';
    document.body.appendChild(a); a.click();
    document.body.removeChild(a); URL.revokeObjectURL(url);
  }

  // Sort by date
  $: sorted = [...events].sort((a, b) => a.dueDate.localeCompare(b.dueDate));
</script>

<div class="space">
  {#if !generated}
    <div class="intro">
      <div class="intro-icon" aria-hidden="true">📅</div>
      <h3 class="intro-title">AI Compliance Calendar</h3>
      <p class="intro-desc">Generate your personalized compliance deadlines and tax dates based on your {entityType || 'entity'} in {state || 'your state'}.</p>
      {#if !entityType || !state}
        <p class="intro-warn">⚠️ Complete Entity Type and State in Steps 3 & 4 for best results.</p>
      {/if}
      <button class="gen-btn" on:click={generate} disabled={loading} aria-busy={loading}>
        {loading ? 'Generating your calendar…' : '✦ Generate AI Compliance Calendar'}
      </button>
      {#if error}<p class="error">{error}</p>{/if}
    </div>
  {:else}
    <div class="calendar-header">
      <div>
        <h3 class="cal-title">Your Compliance Calendar</h3>
        <p class="cal-sub">{events.length} deadlines for your {entityType} in {state}</p>
      </div>
      <div class="cal-actions">
        <button class="cal-btn secondary" on:click={generate} disabled={loading}>↺ Regenerate</button>
        <button class="cal-btn primary" on:click={downloadICS} disabled={events.length === 0}>
          ↓ Export .ics
        </button>
      </div>
    </div>

    {#if sorted.length === 0}
      <p class="empty">No events generated. Try regenerating.</p>
    {:else}
      <div class="timeline">
        {#each sorted as ev}
          <div class="event-card" style="--cat-color: {color(ev.category)}">
            <div class="event-left">
              <div class="event-dot" aria-hidden="true"></div>
              <div class="event-line" aria-hidden="true"></div>
            </div>
            <div class="event-body">
              <div class="event-meta">
                <span class="event-date">{new Date(ev.dueDate + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                <span class="event-cat">{ev.category}</span>
                {#if ev.recurring}<span class="event-rec">🔄 {ev.recurring}</span>{/if}
              </div>
              <div class="event-title">{ev.title}</div>
              <p class="event-desc">{ev.description}</p>
              {#if ev.penalty}
                <p class="event-penalty">⚠️ Late penalty: {ev.penalty}</p>
              {/if}
            </div>
          </div>
        {/each}
      </div>
    {/if}
  {/if}
</div>

<style>
  .space { display: flex; flex-direction: column; gap: 20px; }

  .intro {
    display: flex; flex-direction: column; align-items: center;
    text-align: center; gap: 12px; padding: 28px 16px;
  }
  .intro-icon { font-size: 48px; }
  .intro-title { font-size: 20px; font-weight: 700; color: rgba(255,255,255,0.88); margin: 0; }
  .intro-desc { font-size: 14px; color: rgba(255,255,255,0.50); margin: 0; line-height: 1.6; max-width: 400px; }
  .intro-warn { font-size: 13px; color: #ff9f0a; background: rgba(255,159,10,0.08); border: 1px solid rgba(255,159,10,0.20); border-radius: 10px; padding: 8px 14px; margin: 0; }

  .gen-btn {
    padding: 12px 28px;
    border-radius: 14px;
    background: linear-gradient(135deg, rgba(94,92,230,0.25), rgba(10,132,255,0.25));
    border: 1px solid rgba(94,92,230,0.40);
    color: #a78bfa;
    font-size: 15px; font-weight: 600; font-family: inherit;
    cursor: pointer;
    transition: all 0.15s;
  }
  .gen-btn:hover:not(:disabled) { background: linear-gradient(135deg, rgba(94,92,230,0.38), rgba(10,132,255,0.38)); }
  .gen-btn:disabled { opacity: 0.5; cursor: not-allowed; }
  .error { font-size: 13px; color: #ff453a; margin: 0; }

  .calendar-header { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; flex-wrap: wrap; }
  .cal-title { font-size: 17px; font-weight: 600; color: rgba(255,255,255,0.88); margin: 0 0 3px; }
  .cal-sub { font-size: 13px; color: rgba(255,255,255,0.38); margin: 0; }
  .cal-actions { display: flex; gap: 8px; }
  .cal-btn { padding: 8px 14px; border-radius: 10px; font-size: 13px; font-weight: 500; font-family: inherit; cursor: pointer; transition: all 0.15s; border: 1px solid; }
  .cal-btn.secondary { background: rgba(255,255,255,0.05); border-color: rgba(255,255,255,0.12); color: rgba(255,255,255,0.55); }
  .cal-btn.secondary:hover { background: rgba(255,255,255,0.09); color: rgba(255,255,255,0.80); }
  .cal-btn.primary { background: rgba(10,132,255,0.18); border-color: rgba(10,132,255,0.40); color: #0a84ff; }
  .cal-btn.primary:hover:not(:disabled) { background: rgba(10,132,255,0.26); }
  .cal-btn:disabled { opacity: 0.35; cursor: not-allowed; }

  .empty { font-size: 14px; color: rgba(255,255,255,0.38); text-align: center; padding: 20px; }

  /* Timeline */
  .timeline { display: flex; flex-direction: column; gap: 0; }
  .event-card {
    display: flex; gap: 0;
    --cat-color: #0a84ff;
  }
  .event-left { display: flex; flex-direction: column; align-items: center; width: 24px; flex-shrink: 0; margin-right: 14px; }
  .event-dot { width: 10px; height: 10px; border-radius: 50%; background: var(--cat-color); flex-shrink: 0; box-shadow: 0 0 8px var(--cat-color); margin-top: 16px; }
  .event-line { flex: 1; width: 1.5px; background: rgba(255,255,255,0.07); min-height: 24px; }
  .event-card:last-child .event-line { display: none; }

  .event-body { flex: 1; padding: 12px 0 20px; }
  .event-meta { display: flex; align-items: center; gap: 8px; margin-bottom: 4px; flex-wrap: wrap; }
  .event-date { font-size: 12px; font-weight: 600; color: rgba(255,255,255,0.45); font-variant-numeric: tabular-nums; }
  .event-cat { font-size: 10px; font-weight: 700; letter-spacing: 0.5px; text-transform: uppercase; color: var(--cat-color); background: color-mix(in srgb, var(--cat-color) 15%, transparent); border: 1px solid color-mix(in srgb, var(--cat-color) 30%, transparent); border-radius: 4px; padding: 1px 6px; }
  .event-rec { font-size: 11px; color: rgba(255,255,255,0.30); }
  .event-title { font-size: 15px; font-weight: 600; color: rgba(255,255,255,0.85); margin-bottom: 4px; }
  .event-desc { font-size: 13px; color: rgba(255,255,255,0.45); margin: 0 0 4px; line-height: 1.5; }
  .event-penalty { font-size: 12px; color: #ff9f0a; margin: 0; }
</style>
