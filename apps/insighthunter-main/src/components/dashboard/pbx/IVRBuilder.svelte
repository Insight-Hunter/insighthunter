<!-- apps/insighthunter-main/src/components/dashboard/pbx/IVRBuilder.svelte -->
<script lang="ts">
  import { onMount } from 'svelte';
  import { pbxClient, type IVRConfig, type IVROption } from '../../../lib/pbx-client';

  // ─── Types ───────────────────────────────────────────────────────────────────
  type ActionType = 'extension' | 'voicemail' | 'external' | 'queue' | 'submenu' | 'hangup';
  type ViewMode = 'editor' | 'flow' | 'preview';

  interface OptionRow extends IVROption {
    _id: string;   // local UUID for Svelte keying
    error?: string;
  }

  // ─── Constants ───────────────────────────────────────────────────────────────
  const AVAILABLE_DIGITS = ['1','2','3','4','5','6','7','8','9','0','*','#'];

  const ACTION_META: Record<ActionType, { label: string; icon: string; placeholder: string; hint: string }> = {
    extension:  { label: 'Extension',     icon: '🔌', placeholder: '101',             hint: 'Internal extension number' },
    voicemail:  { label: 'Voicemail',     icon: '📬', placeholder: 'ext 101 mailbox', hint: 'Leave a voicemail' },
    external:   { label: 'External #',   icon: '📞', placeholder: '+14045550100',      hint: 'E.164 format required' },
    queue:      { label: 'Call Queue',    icon: '👥', placeholder: 'support',          hint: 'Route to a named queue' },
    submenu:    { label: 'Sub-menu',      icon: '📋', placeholder: 'submenu-id',       hint: 'Nested IVR menu' },
    hangup:     { label: 'Hang Up',       icon: '📵', placeholder: '—',               hint: 'Disconnect the call' },
  };

  const GREETING_MAX = 500;

  // ─── State ───────────────────────────────────────────────────────────────────
  let viewMode: ViewMode = 'editor';
  let loading = true;
  let saving = false;
  let saved = false;
  let error = '';
  let isDirty = false;

  let greeting = '';
  let repeatGreeting = true;
  let timeoutAction: ActionType = 'voicemail';
  let timeoutTarget = '';
  let invalidAction: ActionType = 'voicemail';
  let invalidTarget = '';

  let options: OptionRow[] = [];

  // Preview state
  let previewActive = false;
  let previewInput = '';
  let previewLog: { time: string; msg: string; type: 'system' | 'digit' | 'action' }[] = [];
  let previewTimeout: ReturnType<typeof setTimeout> | null = null;

  // Drag state
  let dragIndex: number | null = null;
  let dragOverIndex: number | null = null;

  // ─── Helpers ─────────────────────────────────────────────────────────────────
  function uid() { return Math.random().toString(36).slice(2); }

  function usedDigits(): Set<string> {
    return new Set(options.map(o => o.digit));
  }

  function availableDigits(): string[] {
    const used = usedDigits();
    return AVAILABLE_DIGITS.filter(d => !used.has(d));
  }

  function markDirty() { isDirty = true; saved = false; }

  function validateRow(row: OptionRow): string {
    if (!row.label.trim()) return 'Label required';
    if (row.action !== 'hangup' && !row.target.trim()) return 'Target required';
    if (row.action === 'external' && !/^\+?[1-9]\d{7,14}$/.test(row.target.replace(/\s/g,''))) {
      return 'Must be valid E.164 number';
    }
    if (row.action === 'extension' && !/^\d{2,6}$/.test(row.target.trim())) {
      return 'Extension must be 2–6 digits';
    }
    return '';
  }

  function validateAll(): boolean {
    let valid = true;
    options = options.map(row => {
      const e = validateRow(row);
      if (e) valid = false;
      return { ...row, error: e };
    });
    if (!greeting.trim()) { error = 'Greeting text is required'; return false; }
    return valid;
  }

  // ─── Row operations ──────────────────────────────────────────────────────────
  function addOption() {
    const next = availableDigits()[0];
    if (!next) return;
    options = [...options, {
      _id: uid(),
      digit: next,
      label: '',
      action: 'extension',
      target: '',
    }];
    markDirty();
  }

  function removeOption(id: string) {
    options = options.filter(o => o._id !== id);
    markDirty();
  }

  function updateOption(id: string, patch: Partial<OptionRow>) {
    options = options.map(o => o._id === id ? { ...o, ...patch, error: '' } : o);
    markDirty();
  }

  // ─── Drag & Drop ─────────────────────────────────────────────────────────────
  function onDragStart(e: DragEvent, idx: number) {
    dragIndex = idx;
    (e.dataTransfer as DataTransfer).effectAllowed = 'move';
  }

  function onDragOver(e: DragEvent, idx: number) {
    e.preventDefault();
    dragOverIndex = idx;
  }

  function onDrop(e: DragEvent, idx: number) {
    e.preventDefault();
    if (dragIndex === null || dragIndex === idx) { dragIndex = null; dragOverIndex = null; return; }
    const reordered = [...options];
    const [moved] = reordered.splice(dragIndex, 1);
    reordered.splice(idx, 0, moved);
    options = reordered;
    dragIndex = null;
    dragOverIndex = null;
    markDirty();
  }

  function onDragEnd() { dragIndex = null; dragOverIndex = null; }

  // ─── Load / Save ─────────────────────────────────────────────────────────────
  async function load() {
    loading = true; error = '';
    try {
      const { data } = await pbxClient.getIVR();
      if (data) {
        greeting = data.greeting ?? '';
        options = (data.options ?? []).map((o: IVROption) => ({ ...o, _id: uid() }));
        // Extended fields stored as JSON extras in the DB
        const ext = data as IVRConfig & { repeatGreeting?: boolean; timeoutAction?: ActionType; timeoutTarget?: string; invalidAction?: ActionType; invalidTarget?: string };
        repeatGreeting   = ext.repeatGreeting   ?? true;
        timeoutAction    = ext.timeoutAction    ?? 'voicemail';
        timeoutTarget    = ext.timeoutTarget    ?? '';
        invalidAction    = ext.invalidAction    ?? 'voicemail';
        invalidTarget    = ext.invalidTarget    ?? '';
      }
    } catch (e) { error = (e as Error).message; }
    finally { loading = false; isDirty = false; }
  }

  async function save() {
    error = '';
    if (!validateAll()) return;
    saving = true;
    try {
      const payload: IVRConfig & Record<string, unknown> = {
        greeting,
        options: options.map(({ digit, label, action, target }) => ({ digit, label, action, target })),
        repeatGreeting,
        timeoutAction, timeoutTarget,
        invalidAction, invalidTarget,
      };
      await pbxClient.saveIVR(payload as IVRConfig);
      saved = true; isDirty = false;
      setTimeout(() => { saved = false; }, 3000);
    } catch (e) { error = (e as Error).message; }
    finally { saving = false; }
  }

  // ─── Preview simulation ───────────────────────────────────────────────────────
  function previewLog_(msg: string, type: 'system' | 'digit' | 'action' = 'system') {
    const time = new Date().toLocaleTimeString('en-US', { hour12: false });
    previewLog = [...previewLog, { time, msg, type }];
  }

  function startPreview() {
    previewActive = true; previewLog = []; previewInput = '';
    previewLog_(`📞 Call connected`);
    previewLog_(`🔊 ${greeting || '(no greeting set)'}`, 'system');
    if (options.length === 0) {
      previewLog_('⚠️ No options configured — call would hang up.', 'action');
      return;
    }
    previewLog_(`Options: ${options.map(o => `[${o.digit}] ${o.label}`).join('  ·  ')}`, 'system');
    if (previewTimeout) clearTimeout(previewTimeout);
    previewTimeout = setTimeout(() => {
      previewLog_(`⏱ No digit entered — ${timeoutAction}${timeoutTarget ? ` → ${timeoutTarget}` : ''}`, 'action');
    }, 8000);
  }

  function previewPress(digit: string) {
    if (!previewActive) return;
    if (previewTimeout) { clearTimeout(previewTimeout); previewTimeout = null; }
    previewLog_(`Pressed: [${digit}]`, 'digit');
    const match = options.find(o => o.digit === digit);
    if (match) {
      const meta = ACTION_META[match.action as ActionType];
      previewLog_(`${meta.icon} "${match.label}" → ${match.action}${match.target ? `: ${match.target}` : ''}`, 'action');
      if (match.action === 'hangup') {
        previewLog_(`📵 Call ended.`);
        previewActive = false;
      }
    } else {
      previewLog_(`❌ Invalid digit — ${invalidAction}${invalidTarget ? ` → ${invalidTarget}` : ''}`, 'action');
      if (repeatGreeting) {
        previewLog_(`🔊 Replaying: ${greeting}`, 'system');
      }
    }
  }

  function stopPreview() {
    if (previewTimeout) clearTimeout(previewTimeout);
    previewActive = false; previewLog = [];
  }

  onMount(load);
</script>

<!-- ─── Top bar ─────────────────────────────────────────────────────────────── -->
<div class="ivr-wrap">
  <div class="ivr-header">
    <div class="ivr-title">
      <span class="ivr-icon">🌐</span>
      <div>
        <h3>Auto-Attendant <span class="ivr-badge">IVR</span></h3>
        <p class="ivr-subtitle">Configure how incoming calls are greeted and routed</p>
      </div>
    </div>

    <div class="ivr-header-actions">
      <!-- View mode toggle -->
      <div class="view-toggle" role="group" aria-label="View mode">
        {#each [['editor','✏️ Editor'],['flow','📊 Flow'],['preview','▶ Preview']] as [mode, label]}
          <button
            class="view-btn"
            class:view-btn--active={viewMode === mode}
            on:click={() => { viewMode = mode as ViewMode; if (mode === 'preview') startPreview(); else stopPreview(); }}
          >{label}</button>
        {/each}
      </div>

      {#if isDirty || saved}
        <div class="save-state" class:save-state--saved={saved}>
          {saved ? '✓ Saved' : '● Unsaved'}
        </div>
      {/if}

      <button
        class="btn btn--primary"
        on:click={save}
        disabled={saving || !isDirty}
      >
        {saving ? 'Saving…' : 'Publish'}
      </button>
    </div>
  </div>

  {#if error}
    <div class="alert alert--error" role="alert">⚠️ {error} <button class="alert-close" on:click={() => (error = '')}>✕</button></div>
  {/if}

  {#if loading}
    <div class="loading-row"><span class="spinner"></span> Loading IVR config…</div>

  <!-- ─── EDITOR VIEW ──────────────────────────────────────────────────────── -->
  {:else if viewMode === 'editor'}
    <div class="editor-grid">

      <!-- LEFT: Greeting + settings -->
      <section class="editor-section">
        <h4 class="section-title">📢 Greeting Message</h4>
        <p class="section-hint">Callers hear this when the call connects. Keep it under 20 seconds.</p>

        <div class="field">
          <textarea
            class="greeting-input"
            bind:value={greeting}
            maxlength={GREETING_MAX}
            placeholder="Thank you for calling Acme Corp. For Sales press 1, for Support press 2, for our address press 3."
            rows={4}
            on:input={markDirty}
          ></textarea>
          <div class="char-count" class:char-count--warn={greeting.length > GREETING_MAX * 0.85}>
            {greeting.length} / {GREETING_MAX}
          </div>
        </div>

        <label class="checkbox-row">
          <input type="checkbox" bind:checked={repeatGreeting} on:change={markDirty} />
          <span>Replay greeting on invalid input</span>
        </label>

        <h4 class="section-title" style="margin-top:1.5rem">⏱ Timeout (no input)</h4>
        <div class="inline-fields">
          <select class="select" bind:value={timeoutAction} on:change={markDirty}>
            {#each Object.entries(ACTION_META) as [k, v]}
              <option value={k}>{v.icon} {v.label}</option>
            {/each}
          </select>
          {#if timeoutAction !== 'hangup'}
            <input
              class="input"
              bind:value={timeoutTarget}
              placeholder={ACTION_META[timeoutAction].placeholder}
              on:input={markDirty}
            />
          {/if}
        </div>

        <h4 class="section-title" style="margin-top:1rem">❌ Invalid Digit</h4>
        <div class="inline-fields">
          <select class="select" bind:value={invalidAction} on:change={markDirty}>
            {#each Object.entries(ACTION_META) as [k, v]}
              <option value={k}>{v.icon} {v.label}</option>
            {/each}
          </select>
          {#if invalidAction !== 'hangup'}
            <input
              class="input"
              bind:value={invalidTarget}
              placeholder={ACTION_META[invalidAction].placeholder}
              on:input={markDirty}
            />
          {/if}
        </div>
      </section>

      <!-- RIGHT: Option rows -->
      <section class="editor-section editor-section--options">
        <div class="options-header">
          <h4 class="section-title">🔢 Digit Routing</h4>
          <button
            class="btn btn--sm btn--ghost"
            on:click={addOption}
            disabled={availableDigits().length === 0}
            title={availableDigits().length === 0 ? 'All digits assigned' : 'Add routing rule'}
          >+ Add Option</button>
        </div>

        {#if options.length === 0}
          <div class="empty-options">
            <span class="empty-icon">🔢</span>
            <p>No routing options yet.</p>
            <p class="empty-sub">Click <strong>+ Add Option</strong> to create your first digit route.</p>
          </div>
        {:else}
          <div class="options-list" role="list">
            {#each options as row, idx (row._id)}
              <div
                class="option-row"
                class:option-row--dragging={dragIndex === idx}
                class:option-row--dragover={dragOverIndex === idx && dragIndex !== idx}
                class:option-row--error={!!row.error}
                draggable="true"
                role="listitem"
                on:dragstart={(e) => onDragStart(e, idx)}
                on:dragover={(e) => onDragOver(e, idx)}
                on:drop={(e) => onDrop(e, idx)}
                on:dragend={onDragEnd}
              >
                <!-- Drag handle -->
                <span class="drag-handle" title="Drag to reorder" aria-hidden="true">⠿</span>

                <!-- Digit selector -->
                <select
                  class="select select--digit"
                  value={row.digit}
                  on:change={(e) => updateOption(row._id, { digit: (e.target as HTMLSelectElement).value })}
                  aria-label="Key"
                >
                  <option value={row.digit}>{row.digit}</option>
                  {#each availableDigits() as d}
                    <option value={d}>{d}</option>
                  {/each}
                </select>

                <!-- Arrow -->
                <span class="route-arrow">→</span>

                <!-- Label -->
                <input
                  class="input input--label"
                  value={row.label}
                  placeholder="Label (e.g. Sales)"
                  maxlength={40}
                  on:input={(e) => updateOption(row._id, { label: (e.target as HTMLInputElement).value })}
                  aria-label="Option label"
                />

                <!-- Action type -->
                <select
                  class="select select--action"
                  value={row.action}
                  on:change={(e) => updateOption(row._id, { action: (e.target as HTMLSelectElement).value as ActionType, target: '' })}
                  aria-label="Action type"
                >
                  {#each Object.entries(ACTION_META) as [k, v]}
                    <option value={k}>{v.icon} {v.label}</option>
                  {/each}
                </select>

                <!-- Target -->
                {#if row.action !== 'hangup'}
                  <input
                    class="input input--target"
                    class:input--invalid={!!row.error}
                    value={row.target}
                    placeholder={ACTION_META[row.action as ActionType].placeholder}
                    on:input={(e) => updateOption(row._id, { target: (e.target as HTMLInputElement).value })}
                    aria-label="Target"
                    title={ACTION_META[row.action as ActionType].hint}
                  />
                {:else}
                  <span class="hangup-spacer">—</span>
                {/if}

                <!-- Delete -->
                <button
                  class="btn-icon btn-icon--danger"
                  on:click={() => removeOption(row._id)}
                  aria-label="Remove option"
                  title="Remove"
                >✕</button>
              </div>

              {#if row.error}
                <p class="row-error">⚠️ {row.error}</p>
              {/if}
            {/each}
          </div>
        {/if}

        <p class="drag-hint">☝ Drag rows to reorder · {AVAILABLE_DIGITS.length - options.length} digits remaining</p>
      </section>
    </div>

  <!-- ─── FLOW VIEW ────────────────────────────────────────────────────────── -->
  {:else if viewMode === 'flow'}
    <div class="flow-view">
      <div class="flow-diagram">

        <!-- Caller node -->
        <div class="flow-node flow-node--caller">
          <span class="flow-node-icon">📞</span>
          <span>Incoming Call</span>
        </div>
        <div class="flow-connector"></div>

        <!-- Greeting node -->
        <div class="flow-node flow-node--greeting">
          <span class="flow-node-icon">🔊</span>
          <span class="flow-node-title">Greeting</span>
          <span class="flow-node-detail">{greeting || '(not set)'}</span>
        </div>

        <!-- Options fork -->
        {#if options.length > 0}
          <div class="flow-connector"></div>
          <div class="flow-fork-label">Caller presses…</div>
          <div class="flow-options-grid">
            {#each options as opt}
              <div class="flow-option-card">
                <div class="flow-option-digit">[{opt.digit}]</div>
                <div class="flow-option-label">{opt.label || '—'}</div>
                <div class="flow-option-action">
                  <span class="flow-action-icon">{ACTION_META[opt.action as ActionType]?.icon}</span>
                  <span>{ACTION_META[opt.action as ActionType]?.label}{opt.target ? `: ${opt.target}` : ''}</span>
                </div>
              </div>
            {/each}

            <!-- Timeout card -->
            <div class="flow-option-card flow-option-card--fallback">
              <div class="flow-option-digit">⏱</div>
              <div class="flow-option-label">Timeout</div>
              <div class="flow-option-action">
                <span class="flow-action-icon">{ACTION_META[timeoutAction]?.icon}</span>
                <span>{ACTION_META[timeoutAction]?.label}{timeoutTarget ? `: ${timeoutTarget}` : ''}</span>
              </div>
            </div>

            <!-- Invalid card -->
            <div class="flow-option-card flow-option-card--fallback">
              <div class="flow-option-digit">❌</div>
              <div class="flow-option-label">Invalid</div>
              <div class="flow-option-action">
                <span class="flow-action-icon">{ACTION_META[invalidAction]?.icon}</span>
                <span>{ACTION_META[invalidAction]?.label}{invalidTarget ? `: ${invalidTarget}` : ''}</span>
              </div>
            </div>
          </div>
        {:else}
          <div class="flow-connector"></div>
          <div class="flow-node flow-node--warn">⚠️ No options — calls will drop</div>
        {/if}
      </div>
    </div>

  <!-- ─── PREVIEW VIEW ─────────────────────────────────────────────────────── -->
  {:else if viewMode === 'preview'}
    <div class="preview-view">
      <div class="preview-phone">
        <div class="preview-screen">
          <div class="preview-header">
            {#if previewActive}
              <span class="preview-status preview-status--active">● Connected</span>
            {:else}
              <span class="preview-status preview-status--idle">○ Idle</span>
            {/if}
            <span class="preview-title">IVR Preview</span>
          </div>

          <div class="preview-log" role="log" aria-live="polite">
            {#if previewLog.length === 0}
              <div class="preview-idle">Press <strong>Call</strong> to simulate an incoming call</div>
            {:else}
              {#each previewLog as entry}
                <div class="log-entry log-entry--{entry.type}">
                  <span class="log-time">{entry.time}</span>
                  <span class="log-msg">{entry.msg}</span>
                </div>
              {/each}
            {/if}
          </div>
        </div>

        <!-- Dial pad for preview -->
        <div class="preview-pad">
          {#each [['1','2','3'],['4','5','6'],['7','8','9'],['*','0','#']] as row}
            <div class="preview-row">
              {#each row as d}
                <button
                  class="preview-key"
                  on:click={() => previewPress(d)}
                  disabled={!previewActive}
                >{d}</button>
              {/each}
            </div>
          {/each}
        </div>

        <div class="preview-actions">
          {#if !previewActive}
            <button class="btn btn--call" on:click={startPreview}>📞 Simulate Call</button>
          {:else}
            <button class="btn btn--hangup" on:click={stopPreview}>📵 End Call</button>
          {/if}
        </div>
      </div>

      <!-- Quick config summary -->
      <div class="preview-summary">
        <h4>Current Config</h4>
        <div class="summary-row"><span>Greeting</span><span class="summary-val">{greeting ? greeting.slice(0,60) + (greeting.length > 60 ? '…' : '') : '—'}</span></div>
        <div class="summary-row"><span>Options</span><span class="summary-val">{options.length} defined</span></div>
        <div class="summary-row"><span>Timeout</span><span class="summary-val">{ACTION_META[timeoutAction].icon} {ACTION_META[timeoutAction].label}{timeoutTarget ? `: ${timeoutTarget}` : ''}</span></div>
        <div class="summary-row"><span>Invalid</span><span class="summary-val">{ACTION_META[invalidAction].icon} {ACTION_META[invalidAction].label}{invalidTarget ? `: ${invalidTarget}` : ''}</span></div>
        <div class="summary-divider"></div>
        {#each options as opt}
          <div class="summary-row">
            <span class="summary-digit">[{opt.digit}] {opt.label}</span>
            <span class="summary-val">{ACTION_META[opt.action as ActionType]?.icon} {opt.target || opt.action}</span>
          </div>
        {/each}
      </div>
    </div>
  {/if}
</div>

<!-- ─── STYLES ──────────────────────────────────────────────────────────────── -->
<style>
  /* ── Layout ── */
  .ivr-wrap  { display:flex; flex-direction:column; gap:1rem; max-width:1100px; }
  .ivr-header{ display:flex; align-items:flex-start; justify-content:space-between; gap:1rem; flex-wrap:wrap; }
  .ivr-title { display:flex; align-items:center; gap:0.75rem; }
  .ivr-icon  { font-size:1.5rem; }
  .ivr-title h3 { margin:0; font-size:1rem; font-weight:700; color:var(--color-text,#1a1a1a); display:flex; align-items:center; gap:0.5rem; }
  .ivr-badge { background:var(--color-accent,#8b7355); color:#fff; font-size:0.65rem; padding:0.1rem 0.4rem; border-radius:4px; font-weight:700; letter-spacing:0.06em; }
  .ivr-subtitle { margin:0.15rem 0 0; font-size:0.8rem; color:var(--color-text-muted,#6b7280); }
  .ivr-header-actions { display:flex; align-items:center; gap:0.6rem; flex-wrap:wrap; }

  /* ── View toggle ── */
  .view-toggle { display:flex; border:1px solid var(--color-border,#e5e2dc); border-radius:8px; overflow:hidden; }
  .view-btn    { padding:0.35rem 0.8rem; background:none; border:none; font-size:0.8rem; font-weight:500; color:var(--color-text-muted,#6b7280); cursor:pointer; white-space:nowrap; transition:background 0.15s,color 0.15s; }
  .view-btn:hover { background:var(--color-bg,#faf9f7); }
  .view-btn--active { background:var(--color-accent,#8b7355); color:#fff; }

  /* ── Save state ── */
  .save-state { font-size:0.78rem; font-weight:600; color:var(--color-text-muted,#6b7280); }
  .save-state--saved { color:#22c55e; }

  /* ── Alerts ── */
  .alert { display:flex; align-items:center; justify-content:space-between; padding:0.6rem 0.9rem; border-radius:8px; font-size:0.85rem; }
  .alert--error { background:#fef2f2; color:#dc2626; border:1px solid #fecaca; }
  .alert-close  { background:none; border:none; cursor:pointer; font-size:0.9rem; color:inherit; margin-left:0.5rem; }

  /* ── Editor grid ── */
  .editor-grid { display:grid; grid-template-columns:340px 1fr; gap:1.5rem; align-items:start; }
  @media (max-width:768px) { .editor-grid { grid-template-columns:1fr; } }

  .editor-section { background:var(--color-surface,#fff); border:1px solid var(--color-border,#e5e2dc); border-radius:12px; padding:1.25rem; }
  .editor-section--options { min-height:320px; }

  .section-title { font-size:0.82rem; font-weight:700; text-transform:uppercase; letter-spacing:0.06em; color:var(--color-text-muted,#6b7280); margin:0 0 0.5rem; }
  .section-hint  { font-size:0.8rem; color:var(--color-text-muted,#6b7280); margin:0 0 0.75rem; }

  /* ── Greeting ── */
  .field { position:relative; }
  .greeting-input { width:100%; padding:0.6rem 0.75rem; border:1px solid var(--color-border,#e5e2dc); border-radius:8px; font-size:0.88rem; resize:vertical; background:var(--color-bg,#faf9f7); box-sizing:border-box; font-family:inherit; color:var(--color-text,#1a1a1a); }
  .greeting-input:focus { outline:2px solid var(--color-accent,#8b7355); outline-offset:2px; }
  .char-count { text-align:right; font-size:0.72rem; color:var(--color-text-muted,#6b7280); margin-top:0.25rem; }
  .char-count--warn { color:#f59e0b; }

  .checkbox-row { display:flex; align-items:center; gap:0.5rem; font-size:0.84rem; cursor:pointer; margin-top:0.75rem; color:var(--color-text,#1a1a1a); }

  /* ── Inline fields ── */
  .inline-fields { display:flex; gap:0.5rem; align-items:center; flex-wrap:wrap; }
  .select  { padding:0.4rem 0.6rem; border:1px solid var(--color-border,#e5e2dc); border-radius:6px; background:var(--color-bg,#faf9f7); font-size:0.84rem; color:var(--color-text,#1a1a1a); cursor:pointer; }
  .input   { padding:0.4rem 0.65rem; border:1px solid var(--color-border,#e5e2dc); border-radius:6px; background:var(--color-bg,#faf9f7); font-size:0.84rem; color:var(--color-text,#1a1a1a); flex:1; min-width:0; }
  .input:focus,.select:focus { outline:2px solid var(--color-accent,#8b7355); outline-offset:1px; }
  .input--invalid { border-color:#ef4444; }

  /* ── Options list ── */
  .options-header { display:flex; align-items:center; justify-content:space-between; margin-bottom:0.75rem; }
  .options-list   { display:flex; flex-direction:column; gap:0.35rem; }

  .option-row {
    display:grid;
    grid-template-columns: 20px 52px 20px 1fr 140px 120px 28px;
    gap:0.4rem;
    align-items:center;
    padding:0.45rem 0.6rem;
    background:var(--color-bg,#faf9f7);
    border:1px solid var(--color-border,#e5e2dc);
    border-radius:8px;
    transition:box-shadow 0.15s;
    cursor:grab;
  }
  .option-row:active { cursor:grabbing; }
  .option-row--dragging { opacity:0.4; }
  .option-row--dragover { box-shadow:0 0 0 2px var(--color-accent,#8b7355); }
  .option-row--error    { border-color:#ef4444; background:#fef2f2; }
  @media (max-width:640px) {
    .option-row { grid-template-columns:20px 44px 16px 1fr 28px; }
    .select--action,.input--target,.hangup-spacer { display:none; }
  }

  .drag-handle { color:var(--color-text-muted,#9ca3af); font-size:0.9rem; cursor:grab; user-select:none; }
  .select--digit { width:52px; font-weight:700; text-align:center; }
  .route-arrow   { color:var(--color-text-muted,#9ca3af); font-size:0.9rem; text-align:center; }
  .input--label  { font-weight:500; }
  .select--action{ width:140px; }
  .input--target { width:120px; }
  .hangup-spacer { color:var(--color-text-muted,#9ca3af); text-align:center; font-size:0.8rem; }

  .row-error { font-size:0.75rem; color:#dc2626; padding:0 0.6rem 0.2rem; margin-top:-0.2rem; }

  .btn-icon { background:none; border:none; cursor:pointer; font-size:0.85rem; padding:0.2rem; border-radius:4px; color:var(--color-text-muted,#9ca3af); transition:background 0.1s,color 0.1s; }
  .btn-icon--danger:hover { background:#fef2f2; color:#ef4444; }

  .drag-hint { font-size:0.72rem; color:var(--color-text-muted,#9ca3af); margin-top:0.75rem; text-align:right; }

  .empty-options { display:flex; flex-direction:column; align-items:center; padding:2.5rem 1rem; text-align:center; color:var(--color-text-muted,#6b7280); }
  .empty-icon    { font-size:2rem; margin-bottom:0.5rem; }
  .empty-options p { margin:0.1rem 0; font-size:0.88rem; }
  .empty-sub     { font-size:0.8rem; }

  /* ── Flow diagram ── */
  .flow-view    { padding:0.5rem 0; }
  .flow-diagram { display:flex; flex-direction:column; align-items:center; gap:0; }
  .flow-node    { display:flex; flex-direction:column; align-items:center; padding:0.75rem 1.5rem; border-radius:12px; background:var(--color-surface,#fff); border:1px solid var(--color-border,#e5e2dc); text-align:center; min-width:200px; box-shadow:0 2px 8px rgba(0,0,0,0.05); }
  .flow-node--caller  { border-color:var(--color-accent,#8b7355); background:color-mix(in oklch,var(--color-accent,#8b7355) 8%,#fff); }
  .flow-node--greeting{ border-color:#3b82f6; background:#eff6ff; }
  .flow-node--warn    { border-color:#ef4444; background:#fef2f2; color:#dc2626; }
  .flow-node-icon  { font-size:1.3rem; }
  .flow-node-title { font-weight:700; font-size:0.88rem; margin-top:0.25rem; }
  .flow-node-detail{ font-size:0.75rem; color:var(--color-text-muted,#6b7280); max-width:260px; word-break:break-word; margin-top:0.15rem; }
  .flow-connector  { width:2px; height:32px; background:var(--color-border,#e5e2dc); }
  .flow-fork-label { font-size:0.75rem; font-weight:600; color:var(--color-text-muted,#6b7280); text-transform:uppercase; letter-spacing:0.06em; margin-bottom:0.5rem; }
  .flow-options-grid { display:flex; flex-wrap:wrap; gap:0.5rem; justify-content:center; max-width:900px; }
  .flow-option-card { background:var(--color-surface,#fff); border:1px solid var(--color-border,#e5e2dc); border-radius:10px; padding:0.65rem 0.85rem; min-width:130px; max-width:170px; text-align:center; }
  .flow-option-card--fallback { border-style:dashed; opacity:0.8; }
  .flow-option-digit { font-family:monospace; font-weight:800; font-size:1.1rem; color:var(--color-accent,#8b7355); }
  .flow-option-label { font-size:0.82rem; font-weight:600; margin:0.2rem 0; }
  .flow-option-action{ display:flex; align-items:center; gap:0.25rem; font-size:0.72rem; color:var(--color-text-muted,#6b7280); justify-content:center; word-break:break-all; }
  .flow-action-icon  { flex-shrink:0; }

  /* ── Preview ── */
  .preview-view { display:flex; gap:1.5rem; align-items:flex-start; flex-wrap:wrap; }
  .preview-phone{ background:var(--color-surface,#fff); border:1px solid var(--color-border,#e5e2dc); border-radius:20px; padding:1rem; width:280px; flex-shrink:0; box-shadow:0 4px 20px rgba(0,0,0,0.08); }
  .preview-screen{ background:var(--color-bg,#faf9f7); border-radius:12px; padding:0.75rem; min-height:200px; margin-bottom:0.75rem; display:flex; flex-direction:column; gap:0; overflow:hidden; }
  .preview-header{ display:flex; align-items:center; justify-content:space-between; margin-bottom:0.5rem; }
  .preview-title { font-size:0.75rem; font-weight:600; color:var(--color-text-muted,#6b7280); }
  .preview-status{ font-size:0.72rem; font-weight:700; }
  .preview-status--active { color:#22c55e; }
  .preview-status--idle   { color:var(--color-text-muted,#9ca3af); }
  .preview-log { flex:1; overflow-y:auto; max-height:200px; display:flex; flex-direction:column; gap:0.25rem; }
  .preview-idle{ font-size:0.8rem; color:var(--color-text-muted,#9ca3af); text-align:center; padding:1rem 0; }
  .log-entry    { display:flex; gap:0.4rem; font-size:0.75rem; align-items:flex-start; }
  .log-time     { color:var(--color-text-muted,#9ca3af); flex-shrink:0; font-variant-numeric:tabular-nums; }
  .log-msg      { color:var(--color-text,#1a1a1a); word-break:break-word; }
  .log-entry--digit  .log-msg { color:var(--color-accent,#8b7355); font-weight:700; }
  .log-entry--action .log-msg { color:#3b82f6; }

  .preview-pad { display:flex; flex-direction:column; gap:0.3rem; margin-bottom:0.75rem; }
  .preview-row { display:flex; gap:0.3rem; justify-content:center; }
  .preview-key { flex:1; padding:0.55rem; background:var(--color-bg,#faf9f7); border:1px solid var(--color-border,#e5e2dc); border-radius:8px; font-size:1rem; font-weight:600; cursor:pointer; transition:background 0.1s; color:var(--color-text,#1a1a1a); }
  .preview-key:hover:not(:disabled) { background:#f3f0eb; }
  .preview-key:active:not(:disabled){ background:#e8e3db; transform:scale(0.97); }
  .preview-key:disabled { opacity:0.35; cursor:not-allowed; }
  .preview-actions { display:flex; justify-content:center; }

  .preview-summary { flex:1; min-width:260px; background:var(--color-surface,#fff); border:1px solid var(--color-border,#e5e2dc); border-radius:12px; padding:1rem 1.25rem; }
  .preview-summary h4 { margin:0 0 0.75rem; font-size:0.88rem; font-weight:700; }
  .summary-row  { display:flex; justify-content:space-between; gap:0.5rem; padding:0.3rem 0; font-size:0.82rem; border-bottom:1px solid var(--color-border,#e5e2dc); }
  .summary-row:last-child { border:none; }
  .summary-val  { color:var(--color-text-muted,#6b7280); text-align:right; max-width:60%; word-break:break-word; }
  .summary-digit{ font-family:monospace; font-weight:700; color:var(--color-accent,#8b7355); }
  .summary-divider{ border-top:2px solid var(--color-border,#e5e2dc); margin:0.5rem 0; }

  /* ── Buttons ── */
  .btn { padding:0.5rem 1rem; border-radius:7px; border:none; font-weight:600; font-size:0.88rem; cursor:pointer; transition:opacity 0.15s,background 0.15s; }
  .btn--primary  { background:var(--color-accent,#8b7355); color:#fff; }
  .btn--primary:hover:not(:disabled) { background:#7a6347; }
  .btn--primary:disabled { opacity:0.45; cursor:not-allowed; }
  .btn--ghost    { background:var(--color-bg,#faf9f7); border:1px solid var(--color-border,#e5e2dc); color:var(--color-text,#1a1a1a); }
  .btn--ghost:disabled { opacity:0.4; cursor:not-allowed; }
  .btn--sm       { padding:0.3rem 0.7rem; font-size:0.8rem; }
  .btn--call     { background:#22c55e; color:#fff; width:100%; }
  .btn--hangup   { background:#ef4444; color:#fff; width:100%; }

  /* ── Loading ── */
  .loading-row { display:flex; align-items:center; gap:0.5rem; padding:3rem; justify-content:center; color:var(--color-text-muted,#6b7280); }
  .spinner     { width:16px; height:16px; border:2px solid var(--color-border,#e5e2dc); border-top-color:var(--color-accent,#8b7355); border-radius:50%; animation:spin 0.7s linear infinite; flex-shrink:0; }
  @keyframes spin { to { transform:rotate(360deg); } }
</style>
