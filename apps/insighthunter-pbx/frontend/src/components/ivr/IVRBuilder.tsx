// frontend/src/components/ivr/IVRBuilder.tsx
import { useState, useEffect } from 'react';
import { useApi } from '../../hooks/useSession';

interface IVROption {
  digit: string;
  label: string;
  action: { type: string; target?: string; announcement?: string };
}

interface IVRMenu {
  id: string;
  name: string;
  greeting: string;
  greetingType: 'tts' | 'recording';
  greetingVoice: string;
  timeout: number;
  numDigits: number;
  options: IVROption[];
  isDefault: boolean;
}

const ACTION_TYPES = [
  { value: 'extension', label: 'Ring Extension' },
  { value: 'queue', label: 'Call Queue' },
  { value: 'voicemail', label: 'Voicemail' },
  { value: 'submenu', label: 'Sub-Menu' },
  { value: 'forward', label: 'Forward to Number' },
  { value: 'hangup', label: 'Hang Up' },
  { value: 'repeat', label: 'Repeat Menu' },
];

const VOICES = [
  { value: 'Polly.Joanna', label: 'Joanna (US Female)' },
  { value: 'Polly.Matthew', label: 'Matthew (US Male)' },
  { value: 'Polly.Amy', label: 'Amy (UK Female)' },
  { value: 'Polly.Brian', label: 'Brian (UK Male)' },
  { value: 'alice', label: 'Alice (Classic)' },
];

export function IVRBuilder() {
  const { apiFetch } = useApi();
  const [menus, setMenus] = useState<IVRMenu[]>([]);
  const [editing, setEditing] = useState<IVRMenu | null>(null);
  const [extensions, setExtensions] = useState<any[]>([]);
  const [queues, setQueues] = useState<any[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    Promise.all([
      apiFetch('/api/ivr').then((d: any) => setMenus(d.data ?? [])),
      apiFetch('/api/extensions').then((d: any) => setExtensions(d.data ?? [])),
      apiFetch('/api/queues').then((d: any) => setQueues(d.data ?? [])),
    ]);
  }, []);

  function newMenu(): IVRMenu {
    return {
      id: '', name: 'Main Menu', greeting: 'Thank you for calling. Press 1 for sales, press 2 for support.',
      greetingType: 'tts', greetingVoice: 'Polly.Joanna', timeout: 5, numDigits: 1,
      options: [
        { digit: '1', label: 'Sales', action: { type: 'extension' } },
        { digit: '2', label: 'Support', action: { type: 'queue' } },
      ],
      isDefault: menus.length === 0,
    };
  }

  async function saveMenu() {
    if (!editing) return;
    setSaving(true);
    try {
      if (editing.id) {
        await apiFetch(`/api/ivr/${editing.id}`, { method: 'PUT', body: JSON.stringify(editing) });
      } else {
        const res: any = await apiFetch('/api/ivr', { method: 'POST', body: JSON.stringify(editing) });
        editing.id = res.id;
      }
      const data: any = await apiFetch('/api/ivr');
      setMenus(data.data ?? []);
      setEditing(null);
    } finally {
      setSaving(false);
    }
  }

  async function deleteMenu(id: string) {
    if (!confirm('Delete this IVR menu?')) return;
    await apiFetch(`/api/ivr/${id}`, { method: 'DELETE' });
    setMenus(prev => prev.filter(m => m.id !== id));
  }

  function updateOption(index: number, field: string, value: any) {
    if (!editing) return;
    const options = [...editing.options];
    if (field === 'action.type') {
      options[index] = { ...options[index]!, action: { type: value } };
    } else if (field === 'action.target') {
      options[index] = { ...options[index]!, action: { ...options[index]!.action, target: value } };
    } else {
      (options[index] as any)[field] = value;
    }
    setEditing({ ...editing, options });
  }

  function addOption() {
    if (!editing) return;
    const usedDigits = new Set(editing.options.map(o => o.digit));
    const nextDigit = ['1','2','3','4','5','6','7','8','9','0','*','#'].find(d => !usedDigits.has(d)) ?? '';
    setEditing({
      ...editing,
      options: [...editing.options, { digit: nextDigit, label: '', action: { type: 'extension' } }]
    });
  }

  function removeOption(index: number) {
    if (!editing) return;
    setEditing({ ...editing, options: editing.options.filter((_, i) => i !== index) });
  }

  function getTargetOptions(actionType: string) {
    if (actionType === 'extension') return extensions.map(e => ({ value: e.id, label: `Ext ${e.extension} — ${e.display_name}` }));
    if (actionType === 'queue') return queues.map(q => ({ value: q.id, label: q.name }));
    if (actionType === 'submenu') return menus.filter(m => m.id !== editing?.id).map(m => ({ value: m.id, label: m.name }));
    return [];
  }

  return (
    <div className="ivr-builder">
      {/* Menu List */}
      {!editing ? (
        <div className="ivr-list">
          <div className="ivr-list-header">
            <h2>IVR Menus</h2>
            <button className="btn-primary" onClick={() => setEditing(newMenu())}>+ New Menu</button>
          </div>

          {menus.length === 0 ? (
            <div className="ivr-empty">
              <div className="ivr-empty-icon">☎</div>
              <p>No IVR menus yet. Create one to set up your auto-attendant.</p>
              <button className="btn-primary" onClick={() => setEditing(newMenu())}>Create First Menu</button>
            </div>
          ) : menus.map(menu => (
            <div key={menu.id} className="ivr-menu-card">
              <div className="ivr-menu-info">
                <div className="ivr-menu-name">
                  {menu.name}
                  {menu.isDefault && <span className="ivr-default-badge">Default</span>}
                </div>
                <div className="ivr-menu-stats">
                  {menu.options.length} options • {menu.greetingType === 'tts' ? 'Text-to-speech' : 'Recording'}
                </div>
                <div className="ivr-menu-greeting">"{menu.greeting.slice(0, 80)}{menu.greeting.length > 80 ? '…' : ''}"</div>
              </div>
              <div className="ivr-menu-options-preview">
                {menu.options.slice(0, 4).map(opt => (
                  <span key={opt.digit} className="ivr-opt-chip">
                    {opt.digit} → {opt.label || opt.action.type}
                  </span>
                ))}
              </div>
              <div className="ivr-menu-actions">
                <button className="btn-secondary" onClick={() => setEditing({ ...menu })}>Edit</button>
                <button className="btn-danger-ghost" onClick={() => deleteMenu(menu.id)}>Delete</button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* Menu Editor */
        <div className="ivr-editor">
          <div className="ivr-editor-header">
            <button className="btn-back" onClick={() => setEditing(null)}>← Back</button>
            <h2>{editing.id ? 'Edit' : 'New'} IVR Menu</h2>
            <button className="btn-primary" onClick={saveMenu} disabled={saving}>
              {saving ? 'Saving…' : 'Save Menu'}
            </button>
          </div>

          <div className="ivr-editor-body">
            {/* Basic Settings */}
            <div className="ivr-section">
              <h3 className="ivr-section-title">Settings</h3>
              <div className="ivr-field-row">
                <div className="ivr-field">
                  <label>Menu Name</label>
                  <input value={editing.name} onChange={e => setEditing({ ...editing, name: e.target.value })} />
                </div>
                <div className="ivr-field">
                  <label>Voice</label>
                  <select value={editing.greetingVoice} onChange={e => setEditing({ ...editing, greetingVoice: e.target.value })}>
                    {VOICES.map(v => <option key={v.value} value={v.value}>{v.label}</option>)}
                  </select>
                </div>
              </div>
              <div className="ivr-field">
                <label>Greeting Message (Text-to-Speech)</label>
                <textarea
                  value={editing.greeting}
                  onChange={e => setEditing({ ...editing, greeting: e.target.value })}
                  rows={3}
                  placeholder="Thank you for calling. Press 1 for sales…"
                />
              </div>
              <div className="ivr-field-row">
                <div className="ivr-field">
                  <label>Input Timeout (seconds)</label>
                  <input type="number" min={3} max={30} value={editing.timeout} onChange={e => setEditing({ ...editing, timeout: parseInt(e.target.value) })} />
                </div>
                <div className="ivr-field checkbox-field">
                  <label>
                    <input type="checkbox" checked={editing.isDefault} onChange={e => setEditing({ ...editing, isDefault: e.target.checked })} />
                    Set as default menu
                  </label>
                </div>
              </div>
            </div>

            {/* Options */}
            <div className="ivr-section">
              <div className="ivr-section-header">
                <h3 className="ivr-section-title">Menu Options</h3>
                <button className="btn-secondary-sm" onClick={addOption}>+ Add Option</button>
              </div>

              <div className="ivr-options-list">
                {editing.options.map((opt, i) => (
                  <div key={i} className="ivr-option-row">
                    <div className="ivr-digit-badge">{opt.digit || '?'}</div>

                    <div className="ivr-option-fields">
                      <div className="ivr-option-top">
                        <select
                          className="ivr-digit-select"
                          value={opt.digit}
                          onChange={e => updateOption(i, 'digit', e.target.value)}
                        >
                          {['1','2','3','4','5','6','7','8','9','0','*','#'].map(d => (
                            <option key={d} value={d} disabled={editing.options.some((o, j) => j !== i && o.digit === d)}>{d}</option>
                          ))}
                        </select>
                        <input
                          placeholder="Label (e.g. Sales)"
                          value={opt.label}
                          onChange={e => updateOption(i, 'label', e.target.value)}
                          className="ivr-label-input"
                        />
                        <select value={opt.action.type} onChange={e => updateOption(i, 'action.type', e.target.value)}>
                          {ACTION_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                        </select>
                      </div>

                      {/* Target selector */}
                      {['extension', 'queue', 'submenu'].includes(opt.action.type) && (
                        <select value={opt.action.target ?? ''} onChange={e => updateOption(i, 'action.target', e.target.value)} className="ivr-target-select">
                          <option value="">— Select {opt.action.type} —</option>
                          {getTargetOptions(opt.action.type).map(t => (
                            <option key={t.value} value={t.value}>{t.label}</option>
                          ))}
                        </select>
                      )}
                      {opt.action.type === 'forward' && (
                        <input
                          placeholder="+1 555 123 4567"
                          value={opt.action.target ?? ''}
                          onChange={e => updateOption(i, 'action.target', e.target.value)}
                          className="ivr-target-input"
                        />
                      )}
                    </div>

                    <button className="ivr-remove-opt" onClick={() => removeOption(i)}>✕</button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
