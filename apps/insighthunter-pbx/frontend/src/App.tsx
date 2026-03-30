// frontend/src/App.tsx
import { useState, useEffect } from ‘react’;
import { useSession } from ‘./hooks/useSession’;
import { Softphone } from ‘./components/softphone/Softphone’;
import { Sidebar } from ‘./components/dashboard/Sidebar’;

type Page = ‘dashboard’ | ‘calls’ | ‘sms’ | ‘voicemail’ | ‘numbers’ | ‘extensions’ | ‘ivr’ | ‘queues’ | ‘conferences’ | ‘settings’;

export default function App() {
const { session, loading } = useSession();
const [page, setPage] = useState<Page>(‘dashboard’);
const [orgNumbers, setOrgNumbers] = useState<any[]>([]);
const [myExtension, setMyExtension] = useState<any>(null);
const [unreadVM, setUnreadVM] = useState(0);

useEffect(() => {
if (!session) return;
// Load numbers and find user’s extension
Promise.all([
fetch(’/api/numbers’, { headers: getHeaders() }).then(r => r.json()),
fetch(’/api/extensions’, { headers: getHeaders() }).then(r => r.json()),
fetch(’/api/voicemail?unread=true’, { headers: getHeaders() }).then(r => r.json()),
]).then(([nums, exts, vms]: any[]) => {
setOrgNumbers(nums.data ?? []);
const myExt = (exts.data ?? []).find((e: any) => e.user_id === session.userId) ?? exts.data?.[0];
setMyExtension(myExt);
setUnreadVM(vms.data?.length ?? 0);
}).catch(() => {});
}, [session]);

function getHeaders() {
return {
‘Authorization’: `Bearer ${localStorage.getItem('ih_token') ?? ''}`,
‘X-IH-User’: JSON.stringify(session),
‘X-Internal-Secret’: localStorage.getItem(‘ih_internal_secret’) ?? ‘’,
};
}

if (loading) return <Splash />;
if (!session) {
window.location.href = `https://auth.insighthunter.app/login?redirect=${encodeURIComponent(window.location.href)}`;
return null;
}

return (
<div className="app-shell">
<Sidebar currentPage={page} onNavigate={setPage} unreadVM={unreadVM} />
<main className="main-content">
<PageRouter page={page} orgNumbers={orgNumbers} />
</main>
{myExtension && (
<Softphone
extensionId={myExtension.id}
extensionNumber={myExtension.extension}
orgNumbers={orgNumbers}
/>
)}
</div>
);
}

function Splash() {
return (
<div style={{ minHeight: ‘100vh’, display: ‘flex’, alignItems: ‘center’, justifyContent: ‘center’, background: ‘#0A0B0E’, flexDirection: ‘column’, gap: 16 }}>
<div style={{ width: 48, height: 48, background: ‘linear-gradient(135deg, #3B82F6, #8B5CF6)’, borderRadius: 12, display: ‘flex’, alignItems: ‘center’, justifyContent: ‘center’, fontWeight: 800, color: ‘white’, fontSize: 14, letterSpacing: 1 }}>IH</div>
<div style={{ width: 20, height: 20, border: ‘2px solid rgba(255,255,255,0.1)’, borderTopColor: ‘#3B82F6’, borderRadius: ‘50%’, animation: ‘spin 0.8s linear infinite’ }} />
</div>
);
}

// Lazy page router
function PageRouter({ page, orgNumbers }: { page: Page; orgNumbers: any[] }) {
const { apiFetch } = useApi();
const [data, setData] = useState<any>({});
const [loading, setLoading] = useState(false);

useEffect(() => {
loadPageData();
}, [page]);

async function loadPageData() {
setLoading(true);
try {
switch(page) {
case ‘dashboard’: {
const [stats, calls, vms] = await Promise.all([
apiFetch(’/api/calls/stats?period=today’),
apiFetch(’/api/calls?pageSize=5’),
apiFetch(’/api/voicemail?unread=true’),
]);
setData({ stats: (stats as any).data, calls: (calls as any).data, vms: (vms as any).data });
break;
}
case ‘calls’: {
const calls = await apiFetch(’/api/calls?pageSize=50’);
setData({ calls: (calls as any).data, pagination: (calls as any).pagination });
break;
}
case ‘voicemail’: {
const vms = await apiFetch(’/api/voicemail’);
setData({ vms: (vms as any).data });
break;
}
case ‘extensions’: {
const exts = await apiFetch(’/api/extensions’);
setData({ extensions: (exts as any).data });
break;
}
case ‘numbers’: {
const nums = await apiFetch(’/api/numbers’);
setData({ numbers: (nums as any).data });
break;
}
case ‘queues’: {
const [queues, exts] = await Promise.all([
apiFetch(’/api/queues’),
apiFetch(’/api/extensions’),
]);
setData({ queues: (queues as any).data, extensions: (exts as any).data });
break;
}
case ‘conferences’: {
const confs = await apiFetch(’/api/conferences’);
setData({ conferences: (confs as any).data });
break;
}
}
} finally {
setLoading(false);
}
}

if (loading) return <div className="page-loading">Loading…</div>;

return (
<PageContent page={page} data={data} orgNumbers={orgNumbers} onRefresh={loadPageData} />
);
}

function PageContent({ page, data, orgNumbers, onRefresh }: any) {
switch(page) {
case ‘dashboard’: return <DashboardPage data={data} />;
case ‘calls’: return <CallsPage data={data} />;
case ‘sms’: return <SMSPage orgNumbers={orgNumbers} />;
case ‘voicemail’: return <VoicemailPage data={data} onRefresh={onRefresh} />;
case ‘numbers’: return <NumbersPage data={data} orgNumbers={orgNumbers} onRefresh={onRefresh} />;
case ‘extensions’: return <ExtensionsPage data={data} onRefresh={onRefresh} />;
case ‘ivr’: return <IVRPage />;
case ‘queues’: return <QueuesPage data={data} onRefresh={onRefresh} />;
case ‘conferences’: return <ConferencesPage data={data} onRefresh={onRefresh} />;
case ‘settings’: return <SettingsPage />;
default: return null;
}
}

// Import actual components
import { useApi } from ‘./hooks/useSession’;
import { SMSInbox } from ‘./components/sms/SMSInbox’;
import { IVRBuilder } from ‘./components/ivr/IVRBuilder’;

function DashboardPage({ data }: any) {
const s = data.stats ?? {};
return (
<div className="page">
<div className="page-header">
<h1>PBX Dashboard</h1>
<p className="page-subtitle">{new Date().toLocaleDateString(‘en-US’, { weekday: ‘long’, month: ‘long’, day: ‘numeric’ })}</p>
</div>
<div className="stat-grid">
{[
{ label: ‘Total Calls Today’, value: s.total_calls ?? 0, icon: ‘📞’, color: ‘#3B82F6’ },
{ label: ‘Inbound’, value: s.inbound_calls ?? 0, icon: ‘📲’, color: ‘#10B981’ },
{ label: ‘Outbound’, value: s.outbound_calls ?? 0, icon: ‘📤’, color: ‘#6366F1’ },
{ label: ‘Missed’, value: s.missed_calls ?? 0, icon: ‘📵’, color: ‘#EF4444’ },
{ label: ‘Answer Rate’, value: `${s.answerRate ?? 0}%`, icon: ‘✓’, color: ‘#10B981’ },
{ label: ‘Avg Duration’, value: s.avg_duration ? `${Math.round(s.avg_duration)}s` : ‘—’, icon: ‘⏱’, color: ‘#F59E0B’ },
].map(stat => (
<div key={stat.label} className="stat-card">
<div className=“stat-icon” style={{ color: stat.color }}>{stat.icon}</div>
<div className=“stat-value” style={{ color: stat.color }}>{stat.value}</div>
<div className="stat-label">{stat.label}</div>
</div>
))}
</div>

...
  {(data.vms ?? []).length > 0 && (
    <div className="dashboard-section">
      <h2 className="section-title">🔴 Unread Voicemails</h2>
      {(data.vms ?? []).slice(0, 5).map((vm: any) => (
        <div key={vm.id} className="vm-row">
          <span className="vm-from">{vm.from_number}</span>
          <span className="vm-duration">{vm.duration}s</span>
          <span className="vm-time">{new Date(vm.created_at).toLocaleString()}</span>
          {vm.transcription && <span className="vm-transcript">{vm.transcription.slice(0, 80)}…</span>}
        </div>
      ))}
    </div>
  )}

  <div className="dashboard-section">
    <h2 className="section-title">Recent Calls</h2>
    <CallTable calls={data.calls ?? []} />
  </div>
</div>
...

);
}

function CallsPage({ data }: any) {
return (
<div className="page">
<div className="page-header"><h1>Call History</h1></div>
<CallTable calls={data.calls ?? []} showPagination pagination={data.pagination} />
</div>
);
}

function CallTable({ calls, showPagination, pagination }: any) {
const statusColors: Record<string, string> = { completed: ‘#10B981’, ‘in-progress’: ‘#3B82F6’, ‘no-answer’: ‘#EF4444’, busy: ‘#F59E0B’, failed: ‘#EF4444’ };
return (
<div className="table-wrap">
<table className="data-table">
<thead><tr><th>Direction</th><th>From</th><th>To</th><th>Duration</th><th>Status</th><th>Time</th><th>Recording</th></tr></thead>
<tbody>
{calls.map((call: any) => (
<tr key={call.id}>
<td><span className={`dir-badge ${call.direction}`}>{call.direction}</span></td>
<td className="mono">{call.from_number}</td>
<td className="mono">{call.to_number}</td>
<td className="mono">{call.duration > 0 ? `${call.duration}s` : ‘—’}</td>
<td><span className=“status-dot” style={{ color: statusColors[call.status] ?? ‘#6B7280’ }}>{call.status}</span></td>
<td className="time-cell">{new Date(call.created_at).toLocaleString()}</td>
<td>{call.recording_url ? <a href={call.recording_url} target="_blank" rel="noreferrer" className="rec-link">▶ Play</a> : ‘—’}</td>
</tr>
))}
</tbody>
</table>
{calls.length === 0 && <div className="empty-state">No calls found</div>}
</div>
);
}

function SMSPage({ orgNumbers }: any) {
return (
<div className="page page-full">
<SMSInbox orgNumbers={orgNumbers} />
</div>
);
}

function VoicemailPage({ data, onRefresh }: any) {
const { apiFetch } = useApi();
async function markListened(id: string) {
await apiFetch(`/api/voicemail/${id}/listened`, { method: ‘PATCH’ });
onRefresh();
}
async function deleteVM(id: string) {
await apiFetch(`/api/voicemail/${id}`, { method: ‘DELETE’ });
onRefresh();
}
return (
<div className="page">
<div className="page-header"><h1>Voicemail</h1></div>
{(data.vms ?? []).length === 0 ? <div className="empty-state">No voicemails</div> :
(data.vms ?? []).map((vm: any) => (
<div key={vm.id} className={`vm-card ${!vm.listened ? 'unread' : ''}`}>
<div className="vm-meta">
<span className="vm-from">{vm.from_number}</span>
<span className="vm-dur">{vm.duration}s</span>
<span className="vm-ts">{new Date(vm.created_at).toLocaleString()}</span>
{!vm.listened && <span className="vm-new-badge">New</span>}
</div>
{vm.transcription && <p className="vm-transcript">”{vm.transcription}”</p>}
<div className="vm-actions">
<audio controls src={vm.recording_url} onPlay={() => !vm.listened && markListened(vm.id)} />
{!vm.listened && <button className=“btn-sm” onClick={() => markListened(vm.id)}>Mark Read</button>}
<button className=“btn-sm btn-danger-ghost” onClick={() => deleteVM(vm.id)}>Delete</button>
</div>
</div>
))
}
</div>
);
}

function NumbersPage({ data, orgNumbers, onRefresh }: any) {
const { apiFetch } = useApi();
const [searching, setSearching] = useState(false);
const [searchResults, setSearchResults] = useState<any[]>([]);
const [areaCode, setAreaCode] = useState(’’);

async function searchNumbers() {
setSearching(true);
const res: any = await apiFetch(`/api/numbers/search?type=local${areaCode ? `&areaCode=${areaCode}` : ''}`);
setSearchResults(res.data ?? []);
setSearching(false);
}

async function purchase(phoneNumber: string) {
await apiFetch(’/api/numbers/purchase’, { method: ‘POST’, body: JSON.stringify({ phoneNumber }) });
setSearchResults([]);
onRefresh();
}

return (
<div className="page">
<div className="page-header"><h1>Phone Numbers</h1></div>

...
  <div className="numbers-search">
    <h3>Search Available Numbers</h3>
    <div className="search-row">
      <input placeholder="Area code (e.g. 415)" value={areaCode} onChange={e => setAreaCode(e.target.value)} className="area-input" />
      <button className="btn-primary" onClick={searchNumbers} disabled={searching}>
        {searching ? 'Searching…' : 'Search'}
      </button>
    </div>
    {searchResults.length > 0 && (
      <div className="search-results">
        {searchResults.map(n => (
          <div key={n.phoneNumber} className="search-result-row">
            <span className="mono">{n.phoneNumber}</span>
            <span>{n.locality}, {n.region}</span>
            <button className="btn-sm btn-primary" onClick={() => purchase(n.phoneNumber)}>Purchase</button>
          </div>
        ))}
      </div>
    )}
  </div>

  <h3>Your Numbers</h3>
  <div className="numbers-list">
    {(data.numbers ?? []).map((num: any) => (
      <div key={num.id} className="number-card">
        <div className="number-main">
          <span className="number-value mono">{num.number}</span>
          <span className="number-name">{num.friendly_name}</span>
        </div>
        <div className="number-caps">
          {JSON.parse(num.capabilities ?? '[]').map((c: string) => <span key={c} className="cap-badge">{c}</span>)}
        </div>
        <div className="number-assign">
          {num.assigned_type ? <span className="assign-badge">{num.assigned_type}: {num.assigned_to}</span> : <span className="unassigned">Unassigned</span>}
        </div>
      </div>
    ))}
  </div>
</div>
...

);
}

function ExtensionsPage({ data, onRefresh }: any) {
const { apiFetch } = useApi();
const [creating, setCreating] = useState(false);
const [form, setForm] = useState({ extension: ‘’, displayName: ‘’, email: ‘’ });

const statusColors: Record<string, string> = { available: ‘#10B981’, busy: ‘#EF4444’, away: ‘#F59E0B’, offline: ‘#6B7280’ };

async function createExtension() {
await apiFetch(’/api/extensions’, { method: ‘POST’, body: JSON.stringify(form) });
setCreating(false);
setForm({ extension: ‘’, displayName: ‘’, email: ‘’ });
onRefresh();
}

return (
<div className="page">
<div className="page-header">
<h1>Extensions</h1>
<button className=“btn-primary” onClick={() => setCreating(true)}>+ Add Extension</button>
</div>

...
  {creating && (
    <div className="modal-overlay">
      <div className="modal">
        <h3>New Extension</h3>
        <div className="form-field"><label>Extension Number</label><input placeholder="101" value={form.extension} onChange={e => setForm({...form, extension: e.target.value})} /></div>
        <div className="form-field"><label>Display Name</label><input placeholder="Jane Smith" value={form.displayName} onChange={e => setForm({...form, displayName: e.target.value})} /></div>
        <div className="form-field"><label>Email</label><input type="email" placeholder="jane@company.com" value={form.email} onChange={e => setForm({...form, email: e.target.value})} /></div>
        <div className="modal-actions">
          <button className="btn-secondary" onClick={() => setCreating(false)}>Cancel</button>
          <button className="btn-primary" onClick={createExtension}>Create</button>
        </div>
      </div>
    </div>
  )}

  <div className="ext-grid">
    {(data.extensions ?? []).map((ext: any) => (
      <div key={ext.id} className="ext-card">
        <div className="ext-header">
          <div className="ext-avatar">{ext.display_name.charAt(0)}</div>
          <div>
            <div className="ext-name">{ext.display_name}</div>
            <div className="ext-email">{ext.email}</div>
          </div>
          <div className="ext-status" style={{ color: statusColors[ext.status] }}>
            ● {ext.status}
          </div>
        </div>
        <div className="ext-details">
          <div className="ext-number">Ext <strong>{ext.extension}</strong></div>
          <div className="ext-sip mono">{ext.sip_username}</div>
          {ext.do_not_disturb && <span className="dnd-badge">DND</span>}
        </div>
      </div>
    ))}
  </div>
</div>
...

);
}

function IVRPage() {
return (
<div className="page page-full">
<IVRBuilder />
</div>
);
}

function QueuesPage({ data, onRefresh }: any) {
return (
<div className="page">
<div className="page-header"><h1>Call Queues</h1></div>
<div className="queues-list">
{(data.queues ?? []).length === 0 ? <div className="empty-state">No queues configured</div> :
(data.queues ?? []).map((q: any) => (
<div key={q.id} className="queue-card">
<div className="queue-name">{q.name}</div>
<div className="queue-meta">
<span>{q.strategy}</span>
<span>{q.members?.length ?? 0} agents</span>
<span>Max wait: {q.max_wait_time}s</span>
</div>
</div>
))
}
</div>
</div>
);
}

function ConferencesPage({ data, onRefresh }: any) {
const { apiFetch } = useApi();
async function createConf() {
const name = prompt(‘Conference name:’);
if (!name) return;
await apiFetch(’/api/conferences’, { method: ‘POST’, body: JSON.stringify({ name }) });
onRefresh();
}

return (
<div className="page">
<div className="page-header">
<h1>Conference Bridges</h1>
<button className="btn-primary" onClick={createConf}>+ New Conference</button>
</div>
<div className="conf-list">
{(data.conferences ?? []).map((conf: any) => (
<div key={conf.id} className="conf-card">
<div className="conf-name">{conf.name}</div>
<div className="conf-code">Access Code: <strong className="mono">{conf.access_code}</strong></div>
<div className=“conf-status” style={{ color: conf.status === ‘active’ ? ‘#10B981’ : ‘#6B7280’ }}>● {conf.status}</div>
</div>
))}
{(data.conferences ?? []).length === 0 && <div className="empty-state">No conference bridges</div>}
</div>
</div>
);
}

function SettingsPage() {
return (
<div className="page">
<div className="page-header"><h1>Settings</h1></div>
<div className="settings-placeholder">
<p>PBX settings including SIP domain, recording retention, and Twilio subaccount details.</p>
</div>
</div>
);
}
