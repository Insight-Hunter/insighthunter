// apps/insighthunter-main/src/lib/pbx-client.ts
const PBX_BASE = import.meta.env.PUBLIC_PBX_API_URL ?? 'https://pbx-api.insighthunter.app';

function getToken(): string {
  return typeof window !== 'undefined' ? (localStorage.getItem('ih:token') ?? '') : '';
}

async function api<T>(path: string, opts: RequestInit = {}): Promise<T> {
  const res = await fetch(`${PBX_BASE}${path}`, {
    ...opts,
    headers: {
      'Authorization': `Bearer ${getToken()}`,
      'Content-Type': 'application/json',
      ...(opts.headers as Record<string, string> ?? {}),
    },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error((err as { error?: string }).error ?? `HTTP ${res.status}`);
  }
  return res.json() as Promise<T>;
}

export interface Extension {
  id: string; number: string; name: string;
  voicemail_enabled: number; forward_to: string | null; created_at: string;
}
export interface PhoneNumber { id: string; did: string; friendly_name: string; assigned_to: string | null; created_at: string; }
export interface CallLog {
  id: string; direction: 'inbound' | 'outbound'; from_number: string; to_number: string;
  started_at: string; ended_at: string | null; duration: number | null; status: string;
}
export interface Voicemail {
  id: string; extension_id: string; from_number: string; received_at: string;
  duration: number; transcription: string | null; read: number;
}
export interface IVROption { digit: string; label: string; action: string; target: string; }
export interface IVRConfig { greeting: string; options: IVROption[]; }

export const pbxClient = {
  // Extensions
  listExtensions: () => api<{ data: Extension[] }>('/api/extensions'),
  createExtension: (b: Partial<Extension>) => api<{ data: Extension }>('/api/extensions', { method: 'POST', body: JSON.stringify(b) }),
  updateExtension: (id: string, b: Partial<Extension>) => api<{ ok: boolean }>(`/api/extensions/${id}`, { method: 'PUT', body: JSON.stringify(b) }),
  deleteExtension: (id: string) => api<{ ok: boolean }>(`/api/extensions/${id}`, { method: 'DELETE' }),

  // Phone Numbers
  listNumbers: () => api<{ data: PhoneNumber[] }>('/api/numbers'),
  searchNumbers: (area_code?: string) => api<unknown>('/api/numbers/search', { method: 'POST', body: JSON.stringify({ area_code }) }),
  provisionNumber: (phone_number: string, friendly_name: string) =>
    api<{ data: PhoneNumber }>('/api/numbers/provision', { method: 'POST', body: JSON.stringify({ phone_number, friendly_name }) }),
  releaseNumber: (id: string) => api<{ ok: boolean }>(`/api/numbers/${id}`, { method: 'DELETE' }),

  // Call Logs
  listCallLogs: (page = 1) => api<{ data: CallLog[]; total: number; page: number }>(`/api/call-logs?page=${page}`),
  callStats: () => api<{ data: { status: string; count: number; total_seconds: number }[] }>('/api/call-logs/stats'),

  // Voicemail
  listVoicemail: () => api<{ data: Voicemail[] }>('/api/voicemail'),
  getVoicemailAudioUrl: (id: string) => `${PBX_BASE}/api/voicemail/${id}/audio`,
  markRead: (id: string) => api<{ ok: boolean }>(`/api/voicemail/${id}/read`, { method: 'PUT' }),
  deleteVoicemail: (id: string) => api<{ ok: boolean }>(`/api/voicemail/${id}`, { method: 'DELETE' }),

  // IVR
  getIVR: () => api<{ data: IVRConfig | null }>('/api/ivr'),
  saveIVR: (config: IVRConfig) => api<{ ok: boolean }>('/api/ivr', { method: 'PUT', body: JSON.stringify(config) }),

  // ─── Additions to apps/insighthunter-main/src/lib/pbx-client.ts ──────────────
// Append below IVRConfig types

export interface PBXSettings {
  // Business hours
  timezone:          string;
  businessHours:     Record<string, { enabled: boolean; open: string; close: string }>;
  afterHoursAction:  'voicemail' | 'forward' | 'message' | 'ivr' | 'hangup';
  afterHoursTarget?: string;
  holidays?:         Array<{ id: string; date: string; name: string; action: string; target: string }>;

  // Caller ID
  callerIdName?:     string;
  callerIdNumber?:   string;
  holdMusicType?:    'default' | 'custom' | 'none';
  holdMusicUrl?:     string;
  musicOnHoldVolume?: number;

  // Voicemail
  vmTranscription?:    boolean;
  vmEmailNotify?:      boolean;
  vmEmailAddress?:     string;
  vmGreeting?:         string;
  vmMaxDuration?:      number;
  vmDeleteAfterEmail?: boolean;

  // Recording
  recordingMode?:           'off' | 'inbound' | 'outbound' | 'all';
  recordingNotice?:         boolean;
  recordingRetentionDays?:  number;
  recordingEmailCopy?:      boolean;

  // Advanced
  sipDomain?:            string;
  maxConcurrentCalls?:   number;
  ringTimeout?:          number;
}
// ─── Methods to add to PBXClient class ───────────────────────────────────────

// GET /api/pbx/settings
  async getSettings(): Promise<{ data: PBXSettings | null }> {
  return this.request<{ data: PBXSettings | null }>('/api/pbx/settings');
}

// PUT /api/pbx/settings
async saveSettings(settings: PBXSettings): Promise<{ ok: boolean }> {
  return this.request<{ ok: boolean }>('/api/pbx/settings', {
    method: 'PUT',
    body: JSON.stringify(settings),
  });
}

  // Settings
  getSettings: () => api<{ data: Record<string, string> }>('/api/settings'),
  saveSettings: (s: Record<string, string>) => api<{ ok: boolean }>('/api/settings', { method: 'PUT', body: JSON.stringify(s) }),

  // WebRTC
  getWebRTCToken: () => api<{ token: string }>('/api/webrtc-token'),

  // WebSocket
  connectWS(onEvent: (e: Record<string, unknown>) => void): WebSocket {
    const token = getToken();
    const wsBase = PBX_BASE.replace('https://', 'wss://').replace('http://', 'ws://');
    const ws = new WebSocket(`${wsBase}/ws?token=${token}`);
    ws.onmessage = (e) => { try { onEvent(JSON.parse(e.data as string)); } catch { /**/ } };
    ws.onopen = () => ws.send('ping');
    const hb = setInterval(() => ws.readyState === 1 && ws.send('ping'), 25_000);
    ws.onclose = () => clearInterval(hb);
    return ws;
  },
};
