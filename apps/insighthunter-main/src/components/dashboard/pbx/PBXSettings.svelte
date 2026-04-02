<!-- apps/insighthunter-main/src/components/dashboard/pbx/PBXSettings.svelte -->
<script lang="ts">
  import { onMount } from 'svelte';
  import { pbxClient, type PBXSettings } from '../../../lib/pbx-client';

  // ─── Types ───────────────────────────────────────────────────────────────────
  type DayKey = 'sun' | 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat';
  type AfterHoursAction = 'voicemail' | 'forward' | 'message' | 'ivr' | 'hangup';
  type RecordingMode   = 'off' | 'inbound' | 'outbound' | 'all';
  type SettingsTab     = 'hours' | 'caller' | 'voicemail' | 'recording' | 'advanced';

  interface DaySchedule { enabled: boolean; open: string; close: string; }
  interface HolidayEntry { id: string; date: string; name: string; action: AfterHoursAction; target: string; }

  const DAY_LABELS: Record<DayKey, string> = {
    sun:'Sunday', mon:'Monday', tue:'Tuesday', wed:'Wednesday',
    thu:'Thursday', fri:'Friday', sat:'Saturday',
  };

  const DAY_ORDER: DayKey[] = ['sun','mon','tue','wed','thu','fri','sat'];

  const AFTER_HOURS_META: Record<AfterHoursAction, { label: string; icon: string; hasTarget: boolean; placeholder: string }> = {
    voicemail: { label:'Send to Voicemail', icon:'📬', hasTarget:false, placeholder:'' },
    forward:   { label:'Forward to Number', icon:'📞', hasTarget:true,  placeholder:'+14045550100' },
    message:   { label:'Play Message',      icon:'🔊', hasTarget:true,  placeholder:'We are closed. Please call back during business hours.' },
    ivr:       { label:'Route to IVR',      icon:'🌐', hasTarget:false, placeholder:'' },
    hangup:    { label:'Hang Up',           icon:'📵', hasTarget:false, placeholder:'' },
  };

  const TIMEZONES = [
    'America/New_York','America/Chicago','America/Denver',
    'America/Los_Angeles','America/Anchorage','America/Honolulu',
    'America/Phoenix','America/Puerto_Rico','Europe/London',
    'Europe/Paris','Europe/Berlin','Asia/Tokyo','Asia/Singapore',
    'Australia/Sydney','Pacific/Auckland',
  ];

  const RECORDING_MODES: { value: RecordingMode; label: string; desc: string }[] = [
    { value:'off',      label:'Disabled',         desc:'No calls recorded' },
    { value:'inbound',  label:'Inbound only',      desc:'Record all incoming calls' },
    { value:'outbound', label:'Outbound only',     desc:'Record all outgoing calls' },
    { value:'all',      label:'All calls',         desc:'Record every call in both directions' },
  ];

  const DEFAULT_HOURS: Record<DayKey, DaySchedule> = {
    sun:{ enabled:false, open:'09:00', close:'17:00' },
    mon:{ enabled:true,  open:'09:00', close:'17:00' },
    tue:{ enabled:true,  open:'09:00', close:'17:00' },
    wed:{ enabled:true,  open:'09:00', close:'17:00' },
    thu:{ enabled:true,  open:'09:00', close:'17:00' },
    fri:{ enabled:true,  open:'09:00', close:'17:00' },
    sat:{ enabled:false, open:'09:00', close:'17:00' },
  };

  // ─── State ───────────────────────────────────────────────────────────────────
  let activeTab: SettingsTab = 'hours';
  let loading = true;
  let saving = false;
  let saved = false;
  let isDirty = false;
  let error = '';

  // Business hours
  let timezone = 'America/New_York';
  let businessHours: Record<DayKey, DaySchedule> = { ...DEFAULT_HOURS };
  let afterHoursAction: AfterHoursAction = 'voicemail';
  let afterHoursTarget = '';
  let holidays: HolidayEntry[] = [];
  let showHolidayForm = false;
  let newHoliday: Omit<HolidayEntry, 'id'> = { date:'', name:'', action:'voicemail', target:'' };

  // Caller ID
  let callerIdName = '';
  let callerIdNumber = '';
  let holdMusicUrl = '';
  let holdMusicType: 'default' | 'custom' | 'none' = 'default';

  // Voicemail
  let vmTranscription = true;
  let vmEmailNotify = true;
  let vmEmailAddress = '';
  let vmGreeting = '';
  let vmMaxDuration = 120;
  let vmDeleteAfterEmail = false;

  // Recording
  let recordingMode: RecordingMode = 'off';
  let recordingNotice = true;    // play beep / legal notice
  let recordingRetentionDays = 90;
  let recordingEmailCopy = false;

  // Advanced
  let sipDomain = '';
  let maxConcurrentCalls = 5;
  let ringTimeout = 30;
  let musicOnHoldVolume = 80;

  // ─── Helpers ─────────────────────────────────────────────────────────────────
  function uid() { return Math.random().toString(36).slice(2); }
  function markDirty() { isDirty = true; saved = false; }

  function copyHoursToAll(day: DayKey) {
    const src = businessHours[day];
    DAY_ORDER.forEach(d => {
      if (businessHours[d].enabled) {
        businessHours[d] = { ...businessHours[d], open: src.open, close: src.close };
      }
    });
    businessHours = { ...businessHours };
    markDirty();
  }

  function addHoliday() {
    if (!newHoliday.date || !newHoliday.name.trim()) return;
    holidays = [...holidays, { ...newHoliday, id: uid() }];
    newHoliday = { date:'', name:'', action:'voicemail', target:'' };
    showHolidayForm = false;
    markDirty();
  }

  function removeHoliday(id: string) {
    holidays = holidays.filter(h => h.id !== id);
    markDirty();
  }

  function formatTime(t: string): string {
    const [h, m] = t.split(':').map(Number);
    const ampm = h >= 12 ? 'PM' : 'AM';
    const h12 = h % 12 || 12;
    return `${h12}:${m.toString().padStart(2,'0')} ${ampm}`;
  }

  function openDaysCount(): number {
    return DAY_ORDER.filter(d => businessHours[d].enabled).length;
  }

  // ─── Load / Save ─────────────────────────────────────────────────────────────
  async function load() {
    loading = true; error = '';
    try {
      const { data } = await pbxClient.getSettings();
      if (data) applySettings(data);
    } catch (e) { error = (e as Error).message; }
    finally { loading = false; isDirty = false; }
  }

  function applySettings(d: PBXSettings & Record<string, unknown>) {
    timezone             = (d.timezone as string)              ?? 'America/New_York';
    businessHours        = (d.businessHours as typeof businessHours) ?? DEFAULT_HOURS;
    afterHoursAction     = (d.afterHoursAction as AfterHoursAction) ?? 'voicemail';
    afterHoursTarget     = (d.afterHoursTarget as string)       ?? '';
    holidays             = (d.holidays as HolidayEntry[])       ?? [];
    callerIdName         = (d.callerIdName as string)           ?? '';
    callerIdNumber       = (d.callerIdNumber as string)         ?? '';
    holdMusicType        = (d.holdMusicType as typeof holdMusicType) ?? 'default';
    holdMusicUrl         = (d.holdMusicUrl as string)           ?? '';
    vmTranscription      = (d.vmTranscription as boolean)       ?? true;
    vmEmailNotify        = (d.vmEmailNotify as boolean)         ?? true;
    vmEmailAddress       = (d.vmEmailAddress as string)         ?? '';
    vmGreeting           = (d.vmGreeting as string)             ?? '';
    vmMaxDuration        = (d.vmMaxDuration as number)          ?? 120;
    vmDeleteAfterEmail   = (d.vmDeleteAfterEmail as boolean)    ?? false;
    recordingMode        = (d.recordingMode as RecordingMode)   ?? 'off';
    recordingNotice      = (d.recordingNotice as boolean)       ?? true;
    recordingRetentionDays = (d.recordingRetentionDays as number) ?? 90;
    recordingEmailCopy   = (d.recordingEmailCopy as boolean)    ?? false;
    sipDomain            = (d.sipDomain as string)              ?? '';
    maxConcurrentCalls   = (d.maxConcurrentCalls as number)     ?? 5;
    ringTimeout          = (d.ringTimeout as number)            ?? 30;
    musicOnHoldVolume    = (d.musicOnHoldVolume as number)      ?? 80;
  }

  async function save() {
    saving = true; error = '';
    try {
      const payload = {
        timezone, businessHours, afterHoursAction, afterHoursTarget, holidays,
        callerIdName, callerIdNumber, holdMusicType, holdMusicUrl,
        vmTranscription, vmEmailNotify, vmEmailAddress, vmGreeting,
        vmMaxDuration, vmDeleteAfterEmail,
        recordingMode, recordingNotice, recordingRetentionDays, recordingEmailCopy,
        sipDomain, maxConcurrentCalls, ringTimeout, musicOnHoldVolume,
      };
      await pbxClient.saveSettings(payload as PBXSettings);
      saved = true; isDirty = false;
      setTimeout(() => { saved = false; }, 3000);
    } catch (e) { error = (e as Error).message; }
    finally { saving = false; }
  }

  onMount(load);
</script>

<!-- ─── Root ──────────────────────────────────────────────────────────────────── -->
<div class="pbx-settings">

  <!-- Header -->
  <div class="settings-header">
    <div class="settings-title">
      <span class="settings-icon">⚙️</span>
      <div>
        <h3>PBX Settings</h3>
        <p class="settings-subtitle">Business hours, caller ID, voicemail, and recording</p>
      </div>
    </div>
    <div class="header-actions">
      {#if isDirty || saved}
        <span class="save-state" class:save-state--saved={saved}>
          {saved ? '✓ Saved' : '● Unsaved changes'}
        </span>
      {/if}
      <button class="btn btn--ghost btn--sm" on:click={load} disabled={saving}>↺ Reset</button>
      <button class="btn btn--primary" on:click={save} disabled={saving || !isDirty}>
        {saving ? 'Saving…' : 'Save Settings'}
      </button>
    </div>
  </div>

  {#if error}
    <div class="alert alert--error" role="alert">
      ⚠️ {error}
      <button class="alert-close" on:click={() => (error = '')}>✕</button>
    </div>
  {/if}

  {#if loading}
    <div class="loading-state"><span class="spinner"></span> Loading settings…</div>
  {:else}

    <!-- Tab nav -->
    <nav class="tab-nav" role="tablist">
      {#each [
        ['hours',     '🕐', 'Business Hours'],
        ['caller',    '📞', 'Caller ID & Music'],
        ['voicemail', '📬', 'Voicemail'],
        ['recording', '⏺',  'Call Recording'],
        ['advanced',  '🔧', 'Advanced'],
      ] as [tab, icon, label]}
        <button
          class="tab-btn"
          class:tab-btn--active={activeTab === tab}
          role="tab"
          aria-selected={activeTab === tab}
          on:click={() => (activeTab = tab as SettingsTab)}
        >
          <span class="tab-icon">{icon}</span>
          <span class="tab-label">{label}</span>
        </button>
      {/each}
    </nav>

    <!-- ── TAB: BUSINESS HOURS ────────────────────────────────────────────── -->
    {#if activeTab === 'hours'}
      <div class="tab-content">
        <div class="section-row">
          <label class="field-label">Timezone</label>
          <select class="select" bind:value={timezone} on:change={markDirty}>
            {#each TIMEZONES as tz}
              <option value={tz}>{tz.replace('_',' ')}</option>
            {/each}
          </select>
        </div>

        <div class="section-divider"></div>

        <p class="section-hint">
          <strong>{openDaysCount()}</strong> days open ·
          Calls outside these hours follow the <em>after-hours</em> rule below
        </p>

        <!-- Day schedule table -->
        <div class="hours-table">
          {#each DAY_ORDER as day}
            <div class="hours-row" class:hours-row--closed={!businessHours[day].enabled}>
              <label class="day-toggle">
                <input
                  type="checkbox"
                  bind:checked={businessHours[day].enabled}
                  on:change={markDirty}
                />
                <span class="day-name">{DAY_LABELS[day]}</span>
              </label>

              {#if businessHours[day].enabled}
                <div class="time-pair">
                  <input
                    type="time"
                    class="input input--time"
                    bind:value={businessHours[day].open}
                    on:change={markDirty}
                  />
                  <span class="time-sep">→</span>
                  <input
                    type="time"
                    class="input input--time"
                    bind:value={businessHours[day].close}
                    on:change={markDirty}
                  />
                  <span class="time-display">
                    {formatTime(businessHours[day].open)} – {formatTime(businessHours[day].close)}
                  </span>
                </div>
                <button
                  class="btn-link"
                  title="Apply these hours to all open days"
                  on:click={() => copyHoursToAll(day)}
                >Copy to all</button>
              {:else}
                <span class="closed-label">Closed</span>
              {/if}
            </div>
          {/each}
        </div>

        <div class="section-divider"></div>

        <!-- After-hours action -->
        <div class="subsection">
          <h4 class="subsection-title">After-Hours Action</h4>
          <p class="section-hint">Applied when a call arrives outside business hours or on holidays.</p>
          <div class="inline-fields">
            <select class="select" bind:value={afterHoursAction} on:change={markDirty}>
              {#each Object.entries(AFTER_HOURS_META) as [k, v]}
                <option value={k}>{v.icon} {v.label}</option>
              {/each}
            </select>
            {#if AFTER_HOURS_META[afterHoursAction].hasTarget}
              <input
                class="input flex-1"
                bind:value={afterHoursTarget}
                placeholder={AFTER_HOURS_META[afterHoursAction].placeholder}
                on:input={markDirty}
              />
            {/if}
          </div>
        </div>

        <div class="section-divider"></div>

        <!-- Holidays -->
        <div class="subsection">
          <div class="subsection-header">
            <h4 class="subsection-title">Holidays</h4>
            <button class="btn btn--sm btn--ghost" on:click={() => (showHolidayForm = !showHolidayForm)}>
              {showHolidayForm ? '✕ Cancel' : '+ Add Holiday'}
            </button>
          </div>

          {#if showHolidayForm}
            <div class="holiday-form">
              <input type="date"  class="input"  bind:value={newHoliday.date} />
              <input type="text"  class="input"  bind:value={newHoliday.name}   placeholder="Holiday name (e.g. Thanksgiving)" />
              <select class="select" bind:value={newHoliday.action}>
                {#each Object.entries(AFTER_HOURS_META) as [k, v]}
                  <option value={k}>{v.icon} {v.label}</option>
                {/each}
              </select>
              {#if AFTER_HOURS_META[newHoliday.action].hasTarget}
                <input class="input" bind:value={newHoliday.target}
                  placeholder={AFTER_HOURS_META[newHoliday.action].placeholder} />
              {/if}
              <button class="btn btn--primary btn--sm" on:click={addHoliday}
                disabled={!newHoliday.date || !newHoliday.name.trim()}>Add</button>
            </div>
          {/if}

          {#if holidays.length === 0 && !showHolidayForm}
            <p class="empty-hint">No holidays configured — calls will follow regular after-hours rules.</p>
          {:else if holidays.length > 0}
            <div class="holiday-list">
              {#each holidays.sort((a,b) => a.date.localeCompare(b.date)) as h (h.id)}
                <div class="holiday-row">
                  <span class="holiday-date">{h.date}</span>
                  <span class="holiday-name">{h.name}</span>
                  <span class="holiday-action">
                    {AFTER_HOURS_META[h.action].icon}
                    {AFTER_HOURS_META[h.action].label}
                    {h.target ? `· ${h.target}` : ''}
                  </span>
                  <button class="btn-icon btn-icon--danger" on:click={() => removeHoliday(h.id)}
                    aria-label="Remove">✕</button>
                </div>
              {/each}
            </div>
          {/if}
        </div>
      </div>

    <!-- ── TAB: CALLER ID & MUSIC ─────────────────────────────────────────── -->
    {:else if activeTab === 'caller'}
      <div class="tab-content">
        <div class="form-grid">
          <div class="field-group">
            <label class="field-label" for="callerIdName">Caller ID Name</label>
            <p class="field-hint">Displayed on outbound calls (max 15 chars, NANP)</p>
            <input id="callerIdName" class="input" maxlength={15}
              bind:value={callerIdName} on:input={markDirty}
              placeholder="Acme Corp" />
            <div class="char-count">{callerIdName.length}/15</div>
          </div>

          <div class="field-group">
            <label class="field-label" for="callerIdNumber">Caller ID Number</label>
            <p class="field-hint">E.164 format — must match a verified DID</p>
            <input id="callerIdNumber" class="input"
              bind:value={callerIdNumber} on:input={markDirty}
              placeholder="+14045550100" />
          </div>
        </div>

        <div class="section-divider"></div>

        <h4 class="subsection-title">Hold Music</h4>
        <div class="radio-group">
          {#each [['default','🎵 Default hold music (royalty-free)'],['custom','🎶 Custom audio URL'],['none','🔇 Silence']] as [val, lbl]}
            <label class="radio-row">
              <input type="radio" name="holdMusic" value={val}
                bind:group={holdMusicType} on:change={markDirty} />
              <span>{lbl}</span>
            </label>
          {/each}
        </div>

        {#if holdMusicType === 'custom'}
          <div class="inline-fields" style="margin-top:0.5rem">
            <input class="input flex-1"
              bind:value={holdMusicUrl}
              on:input={markDirty}
              placeholder="https://your-cdn.com/hold-music.mp3" />
            {#if holdMusicUrl}
              <audio controls src={holdMusicUrl} class="audio-preview">
                <track kind="captions" />
              </audio>
            {/if}
          </div>
          <p class="field-hint">MP3 or WAV · R2 URLs recommended for reliability</p>
        {/if}

        <div class="section-divider"></div>

        <div class="field-group">
          <label class="field-label" for="holdVolume">
            Hold Music Volume — <strong>{musicOnHoldVolume}%</strong>
          </label>
          <input id="holdVolume" type="range" min="0" max="100" step="5"
            class="range-input"
            bind:value={musicOnHoldVolume}
            on:input={markDirty} />
          <div class="range-labels"><span>0%</span><span>50%</span><span>100%</span></div>
        </div>
      </div>

    <!-- ── TAB: VOICEMAIL ─────────────────────────────────────────────────── -->
    {:else if activeTab === 'voicemail'}
      <div class="tab-content">
        <div class="toggle-card">
          <div class="toggle-info">
            <span class="toggle-title">AI Transcription</span>
            <span class="toggle-desc">Transcribes voicemails using Whisper — stored in D1, searchable from inbox</span>
          </div>
          <label class="toggle-switch">
            <input type="checkbox" bind:checked={vmTranscription} on:change={markDirty} />
            <span class="toggle-track"></span>
          </label>
        </div>

        <div class="toggle-card">
          <div class="toggle-info">
            <span class="toggle-title">Email Notifications</span>
            <span class="toggle-desc">Send email when a new voicemail arrives (with audio attachment)</span>
          </div>
          <label class="toggle-switch">
            <input type="checkbox" bind:checked={vmEmailNotify} on:change={markDirty} />
            <span class="toggle-track"></span>
          </label>
        </div>

        {#if vmEmailNotify}
          <div class="field-group indent">
            <label class="field-label" for="vmEmail">Notification Email</label>
            <input id="vmEmail" class="input" type="email"
              bind:value={vmEmailAddress} on:input={markDirty}
              placeholder="alerts@yourbusiness.com" />
          </div>

          <div class="toggle-card indent">
            <div class="toggle-info">
              <span class="toggle-title">Delete after email delivery</span>
              <span class="toggle-desc">Remove from R2 once email with attachment is sent</span>
            </div>
            <label class="toggle-switch">
              <input type="checkbox" bind:checked={vmDeleteAfterEmail} on:change={markDirty} />
              <span class="toggle-track"></span>
            </label>
          </div>
        {/if}

        <div class="section-divider"></div>

        <div class="field-group">
          <label class="field-label" for="vmGreeting">Custom Voicemail Greeting</label>
          <p class="field-hint">Played before the beep. Leave blank to use default system greeting.</p>
          <textarea id="vmGreeting" class="textarea"
            bind:value={vmGreeting} on:input={markDirty}
            rows={3}
            placeholder="You've reached Acme Corp. We're unavailable right now. Please leave a message after the beep and we'll call you back shortly."
            maxlength={400}
          ></textarea>
          <div class="char-count">{vmGreeting.length}/400</div>
        </div>

        <div class="field-group">
          <label class="field-label" for="vmDuration">
            Max Voicemail Duration — <strong>{vmMaxDuration}s ({Math.floor(vmMaxDuration/60)}m {vmMaxDuration%60}s)</strong>
          </label>
          <input id="vmDuration" type="range" min="30" max="300" step="30"
            class="range-input"
            bind:value={vmMaxDuration} on:input={markDirty} />
          <div class="range-labels"><span>30s</span><span>2.5m</span><span>5m</span></div>
        </div>
      </div>

    <!-- ── TAB: CALL RECORDING ────────────────────────────────────────────── -->
    {:else if activeTab === 'recording'}
      <div class="tab-content">
        <div class="alert alert--warning" role="note">
          ⚖️ <strong>Legal notice:</strong> Recording laws vary by state and country. Consult legal counsel before enabling call recording. Enabling the recording notice below plays a beep / consent announcement.
        </div>

        <div class="section-divider"></div>

        <h4 class="subsection-title">Recording Mode</h4>
        <div class="recording-cards">
          {#each RECORDING_MODES as mode}
            <label class="recording-card" class:recording-card--active={recordingMode === mode.value}>
              <input type="radio" name="recMode" value={mode.value}
                bind:group={recordingMode} on:change={markDirty} class="sr-only" />
              <span class="rec-label">{mode.label}</span>
              <span class="rec-desc">{mode.desc}</span>
            </label>
          {/each}
        </div>

        {#if recordingMode !== 'off'}
          <div class="section-divider"></div>

          <div class="toggle-card">
            <div class="toggle-info">
              <span class="toggle-title">Recording Announcement</span>
              <span class="toggle-desc">Play a beep + "This call may be recorded" at call start</span>
            </div>
            <label class="toggle-switch">
              <input type="checkbox" bind:checked={recordingNotice} on:change={markDirty} />
              <span class="toggle-track"></span>
            </label>
          </div>

          <div class="toggle-card">
            <div class="toggle-info">
              <span class="toggle-title">Email Copy of Recordings</span>
              <span class="toggle-desc">Send audio attachment to caller ID email after each call</span>
            </div>
            <label class="toggle-switch">
              <input type="checkbox" bind:checked={recordingEmailCopy} on:change={markDirty} />
              <span class="toggle-track"></span>
            </label>
          </div>

          <div class="field-group" style="margin-top:1rem">
            <label class="field-label" for="retention">
              Retention Period — <strong>{recordingRetentionDays} days</strong>
            </label>
            <p class="field-hint">Recordings are auto-deleted from R2 after this period.</p>
            <input id="retention" type="range" min="7" max="365" step="7"
              class="range-input"
              bind:value={recordingRetentionDays} on:input={markDirty} />
            <div class="range-labels"><span>7d</span><span>6mo</span><span>1yr</span></div>
          </div>
        {/if}
      </div>

    <!-- ── TAB: ADVANCED ──────────────────────────────────────────────────── -->
    {:else if activeTab === 'advanced'}
      <div class="tab-content">
        <div class="alert alert--info" role="note">
          🔧 These settings affect SIP connectivity and call behavior. Changes take effect on the next call.
        </div>

        <div class="form-grid">
          <div class="field-group">
            <label class="field-label" for="sipDomain">SIP Domain Override</label>
            <p class="field-hint">Leave blank to use Telnyx default SIP credentials</p>
            <input id="sipDomain" class="input"
              bind:value={sipDomain} on:input={markDirty}
              placeholder="sip.yourdomain.com" />
          </div>

          <div class="field-group">
            <label class="field-label" for="maxCalls">Max Concurrent Calls</label>
            <p class="field-hint">Hard cap on simultaneous inbound + outbound calls</p>
            <div class="number-field">
              <button class="num-btn" on:click={() => { if(maxConcurrentCalls>1){maxConcurrentCalls--;markDirty();} }}>−</button>
              <input id="maxCalls" class="input input--number" type="number"
                min="1" max="50"
                bind:value={maxConcurrentCalls} on:input={markDirty} />
              <button class="num-btn" on:click={() => { if(maxConcurrentCalls<50){maxConcurrentCalls++;markDirty();} }}>+</button>
            </div>
          </div>

          <div class="field-group">
            <label class="field-label" for="ringTimeout">Ring Timeout (seconds)</label>
            <p class="field-hint">Time before an unanswered call routes to voicemail/fallback</p>
            <div class="number-field">
              <button class="num-btn" on:click={() => { if(ringTimeout>5){ringTimeout-=5;markDirty();} }}>−</button>
              <input id="ringTimeout" class="input input--number" type="number"
                min="5" max="120" step="5"
                bind:value={ringTimeout} on:input={markDirty} />
              <button class="num-btn" on:click={() => { if(ringTimeout<120){ringTimeout+=5;markDirty();} }}>+</button>
            </div>
          </div>
        </div>

        <div class="section-divider"></div>

        <!-- Config summary / export -->
        <div class="config-export">
          <h4 class="subsection-title">Config Snapshot</h4>
          <p class="field-hint">Read-only view of the current saved state (JSON).</p>
          <pre class="config-pre">{JSON.stringify({
  timezone, afterHoursAction, openDays: openDaysCount(),
  holdMusicType, vmTranscription, vmEmailNotify, recordingMode,
  maxConcurrentCalls, ringTimeout
}, null, 2)}</pre>
        </div>
      </div>
    {/if}

  {/if}<!-- /loading -->
</div>

<style>
  /* ── Shell ── */
  .pbx-settings { display:flex; flex-direction:column; gap:0.75rem; max-width:900px; }

  /* ── Header ── */
  .settings-header { display:flex; align-items:flex-start; justify-content:space-between; flex-wrap:wrap; gap:0.75rem; }
  .settings-title  { display:flex; align-items:center; gap:0.75rem; }
  .settings-icon   { font-size:1.5rem; }
  .settings-title h3 { margin:0; font-size:1rem; font-weight:700; color:var(--color-text,#1a1a1a); }
  .settings-subtitle { margin:0.15rem 0 0; font-size:0.8rem; color:var(--color-text-muted,#6b7280); }
  .header-actions  { display:flex; align-items:center; gap:0.5rem; flex-wrap:wrap; }
  .save-state      { font-size:0.78rem; font-weight:600; color:var(--color-text-muted,#6b7280); }
  .save-state--saved { color:#22c55e; }

  /* ── Tabs ── */
  .tab-nav  { display:flex; gap:0; border-bottom:1px solid var(--color-border,#e5e2dc); overflow-x:auto; }
  .tab-btn  { display:flex; align-items:center; gap:0.35rem; padding:0.55rem 0.85rem; background:none; border:none; border-bottom:2px solid transparent; font-size:0.82rem; font-weight:500; color:var(--color-text-muted,#6b7280); cursor:pointer; white-space:nowrap; transition:color 0.15s,border-color 0.15s; margin-bottom:-1px; }
  .tab-btn:hover { color:var(--color-text,#1a1a1a); }
  .tab-btn--active { color:var(--color-accent,#8b7355); border-bottom-color:var(--color-accent,#8b7355); font-weight:700; }
  .tab-icon { font-size:0.9rem; }
  @media(max-width:600px) { .tab-label { display:none; } .tab-icon { font-size:1.1rem; } }

  /* ── Tab content ── */
  .tab-content { background:var(--color-surface,#fff); border:1px solid var(--color-border,#e5e2dc); border-radius:12px; padding:1.25rem; display:flex; flex-direction:column; gap:0.85rem; }

  /* ── Shared form ── */
  .field-label { display:block; font-size:0.8rem; font-weight:700; color:var(--color-text,#1a1a1a); margin-bottom:0.3rem; text-transform:uppercase; letter-spacing:0.05em; }
  .field-hint  { font-size:0.77rem; color:var(--color-text-muted,#6b7280); margin:0 0 0.4rem; }
  .field-group { display:flex; flex-direction:column; gap:0; }
  .indent      { margin-left:1.5rem; }
  .form-grid   { display:grid; grid-template-columns:repeat(auto-fill,minmax(260px,1fr)); gap:1rem; }
  .section-row { display:flex; align-items:center; gap:0.75rem; flex-wrap:wrap; }
  .section-divider { border:none; border-top:1px solid var(--color-border,#e5e2dc); }
  .section-hint { font-size:0.82rem; color:var(--color-text-muted,#6b7280); margin:0; }
  .subsection-header { display:flex; align-items:center; justify-content:space-between; }
  .subsection-title  { font-size:0.82rem; font-weight:700; text-transform:uppercase; letter-spacing:0.06em; color:var(--color-text-muted,#6b7280); margin:0; }
  .char-count { font-size:0.72rem; color:var(--color-text-muted,#9ca3af); text-align:right; margin-top:0.2rem; }

  .input   { padding:0.45rem 0.7rem; border:1px solid var(--color-border,#e5e2dc); border-radius:7px; background:var(--color-bg,#faf9f7); font-size:0.86rem; color:var(--color-text,#1a1a1a); font-family:inherit; }
  .input:focus { outline:2px solid var(--color-accent,#8b7355); outline-offset:2px; }
  .input--time   { width:120px; }
  .input--number { width:70px; text-align:center; }
  .select  { padding:0.45rem 0.6rem; border:1px solid var(--color-border,#e5e2dc); border-radius:7px; background:var(--color-bg,#faf9f7); font-size:0.86rem; cursor:pointer; color:var(--color-text,#1a1a1a); }
  .select:focus { outline:2px solid var(--color-accent,#8b7355); outline-offset:2px; }
  .textarea{ padding:0.5rem 0.7rem; border:1px solid var(--color-border,#e5e2dc); border-radius:7px; background:var(--color-bg,#faf9f7); font-size:0.86rem; font-family:inherit; resize:vertical; color:var(--color-text,#1a1a1a); width:100%; box-sizing:border-box; }
  .textarea:focus { outline:2px solid var(--color-accent,#8b7355); outline-offset:2px; }
  .flex-1  { flex:1; min-width:0; }
  .inline-fields { display:flex; align-items:center; gap:0.5rem; flex-wrap:wrap; }

  /* ── Range ── */
  .range-input { width:100%; accent-color:var(--color-accent,#8b7355); cursor:pointer; margin:0.3rem 0 0.1rem; }
  .range-labels{ display:flex; justify-content:space-between; font-size:0.7rem; color:var(--color-text-muted,#9ca3af); }

  /* ── Business hours table ── */
  .hours-table { display:flex; flex-direction:column; gap:0.3rem; }
  .hours-row   { display:grid; grid-template-columns:160px 1fr auto; gap:0.6rem; align-items:center; padding:0.5rem 0.75rem; background:var(--color-bg,#faf9f7); border:1px solid var(--color-border,#e5e2dc); border-radius:8px; }
  .hours-row--closed { opacity:0.55; }
  @media(max-width:600px) { .hours-row { grid-template-columns:1fr; gap:0.4rem; } .time-display,.btn-link { display:none; } }
  .day-toggle { display:flex; align-items:center; gap:0.5rem; cursor:pointer; font-size:0.85rem; font-weight:600; }
  .day-name   { color:var(--color-text,#1a1a1a); }
  .time-pair  { display:flex; align-items:center; gap:0.4rem; flex-wrap:wrap; }
  .time-sep   { color:var(--color-text-muted,#9ca3af); }
  .time-display{ font-size:0.75rem; color:var(--color-text-muted,#6b7280); min-width:130px; }
  .closed-label{ font-size:0.8rem; color:var(--color-text-muted,#9ca3af); font-style:italic; }
  .btn-link    { background:none; border:none; cursor:pointer; font-size:0.75rem; color:var(--color-accent,#8b7355); text-decoration:underline; white-space:nowrap; padding:0; }

  /* ── Holidays ── */
  .holiday-form{ display:flex; flex-wrap:wrap; gap:0.4rem; align-items:flex-end; background:var(--color-bg,#faf9f7); border:1px solid var(--color-border,#e5e2dc); border-radius:8px; padding:0.75rem; }
  .holiday-list{ display:flex; flex-direction:column; gap:0.3rem; }
  .holiday-row { display:grid; grid-template-columns:100px 1fr auto auto; gap:0.5rem; align-items:center; padding:0.4rem 0.6rem; background:var(--color-bg,#faf9f7); border:1px solid var(--color-border,#e5e2dc); border-radius:7px; font-size:0.82rem; }
  .holiday-date{ font-variant-numeric:tabular-nums; color:var(--color-text-muted,#6b7280); }
  .holiday-name{ font-weight:600; }
  .holiday-action{ color:var(--color-text-muted,#6b7280); font-size:0.78rem; }
  .empty-hint  { font-size:0.8rem; color:var(--color-text-muted,#9ca3af); font-style:italic; }

  /* ── Toggles ── */
  .toggle-card  { display:flex; align-items:center; justify-content:space-between; gap:1rem; padding:0.75rem 1rem; background:var(--color-bg,#faf9f7); border:1px solid var(--color-border,#e5e2dc); border-radius:9px; }
  .toggle-info  { display:flex; flex-direction:column; gap:0.15rem; }
  .toggle-title { font-size:0.88rem; font-weight:600; color:var(--color-text,#1a1a1a); }
  .toggle-desc  { font-size:0.77rem; color:var(--color-text-muted,#6b7280); }
  .toggle-switch{ position:relative; display:inline-block; width:40px; height:22px; flex-shrink:0; }
  .toggle-switch input { opacity:0; width:0; height:0; position:absolute; }
  .toggle-track { position:absolute; inset:0; border-radius:99px; background:var(--color-border,#d1d5db); transition:background 0.2s; cursor:pointer; }
  .toggle-track::after { content:''; position:absolute; top:3px; left:3px; width:16px; height:16px; border-radius:50%; background:#fff; transition:transform 0.2s; box-shadow:0 1px 3px rgba(0,0,0,0.2); }
  .toggle-switch input:checked + .toggle-track { background:var(--color-accent,#8b7355); }
  .toggle-switch input:checked + .toggle-track::after { transform:translateX(18px); }

  /* ── Radio ── */
  .radio-group { display:flex; flex-direction:column; gap:0.4rem; }
  .radio-row   { display:flex; align-items:center; gap:0.5rem; font-size:0.86rem; cursor:pointer; color:var(--color-text,#1a1a1a); }

  /* ── Recording cards ── */
  .recording-cards { display:grid; grid-template-columns:repeat(auto-fill,minmax(160px,1fr)); gap:0.5rem; }
  .recording-card  { display:flex; flex-direction:column; gap:0.2rem; padding:0.75rem; background:var(--color-bg,#faf9f7); border:1px solid var(--color-border,#e5e2dc); border-radius:9px; cursor:pointer; transition:border-color 0.15s,background 0.15s; }
  .recording-card--active { border-color:var(--color-accent,#8b7355); background:color-mix(in oklch,var(--color-accent,#8b7355) 8%,#fff); }
  .rec-label { font-size:0.86rem; font-weight:700; color:var(--color-text,#1a1a1a); }
  .rec-desc  { font-size:0.75rem; color:var(--color-text-muted,#6b7280); }

  /* ── Number field ── */
  .number-field { display:flex; align-items:center; gap:0.35rem; }
  .num-btn { width:30px; height:30px; border:1px solid var(--color-border,#e5e2dc); border-radius:6px; background:var(--color-bg,#faf9f7); font-size:1rem; line-height:1; cursor:pointer; color:var(--color-text,#1a1a1a); display:flex; align-items:center; justify-content:center; transition:background 0.1s; }
  .num-btn:hover { background:var(--color-surface-offset,#f0ece5); }

  /* ── Config pre ── */
  .config-pre { background:var(--color-bg,#faf9f7); border:1px solid var(--color-border,#e5e2dc); border-radius:8px; padding:0.75rem 1rem; font-size:0.78rem; overflow-x:auto; font-family:monospace; color:var(--color-text-muted,#374151); margin:0; }

  /* ── Audio ── */
  .audio-preview { height:32px; max-width:200px; }

  /* ── Alerts ── */
  .alert       { display:flex; align-items:flex-start; gap:0.6rem; padding:0.65rem 0.9rem; border-radius:8px; font-size:0.83rem; }
  .alert--error  { background:#fef2f2; color:#dc2626; border:1px solid #fecaca; }
  .alert--warning{ background:#fffbeb; color:#b45309; border:1px solid #fde68a; }
  .alert--info   { background:#eff6ff; color:#1d4ed8; border:1px solid #bfdbfe; }
  .alert-close   { background:none; border:none; cursor:pointer; margin-left:auto; font-size:0.9rem; color:inherit; }

  /* ── Buttons ── */
  .btn         { padding:0.45rem 0.95rem; border-radius:7px; border:none; font-weight:600; font-size:0.86rem; cursor:pointer; transition:opacity 0.15s,background 0.15s; }
  .btn--primary{ background:var(--color-accent,#8b7355); color:#fff; }
  .btn--primary:hover:not(:disabled) { background:#7a6347; }
  .btn--primary:disabled { opacity:0.45; cursor:not-allowed; }
  .btn--ghost  { background:var(--color-bg,#faf9f7); border:1px solid var(--color-border,#e5e2dc); color:var(--color-text,#1a1a1a); }
  .btn--ghost:disabled { opacity:0.4; cursor:not-allowed; }
  .btn--sm     { padding:0.3rem 0.65rem; font-size:0.8rem; }
  .btn-icon    { background:none; border:none; cursor:pointer; font-size:0.85rem; padding:0.2rem 0.4rem; border-radius:4px; color:var(--color-text-muted,#9ca3af); }
  .btn-icon--danger:hover { background:#fef2f2; color:#ef4444; }
  .sr-only     { position:absolute; width:1px; height:1px; overflow:hidden; clip:rect(0,0,0,0); white-space:nowrap; }

  /* ── Loading ── */
  .loading-state { display:flex; align-items:center; gap:0.5rem; padding:3rem; justify-content:center; color:var(--color-text-muted,#6b7280); font-size:0.88rem; }
  .spinner { width:16px; height:16px; border:2px solid var(--color-border,#e5e2dc); border-top-color:var(--color-accent,#8b7355); border-radius:50%; animation:spin 0.7s linear infinite; flex-shrink:0; }
  @keyframes spin { to { transform:rotate(360deg); } }
</style>
