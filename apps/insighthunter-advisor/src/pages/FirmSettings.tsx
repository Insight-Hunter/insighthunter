import React, { useEffect, useState } from 'react';
import type { FirmMember } from '../types';
import { api } from '../api';

interface Props {
  firmId: string;
  currentUserId: string;
}

export function FirmSettings({ firmId, currentUserId }: Props) {
  const [members, setMembers] = useState<FirmMember[]>([]);
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<'admin' | 'staff' | 'viewer'>('staff');
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.get<{ members: FirmMember[] }>(`/api/firms/${firmId}/members`)
      .then(r => setMembers(r.members))
      .catch(console.error);
  }, [firmId]);

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    setStatus('sending');
    setError(null);
    try {
      await api.post(`/api/firms/${firmId}/members/invite`, { email, role });
      setStatus('sent');
      setEmail('');
    } catch (err) {
      setError((err as Error).message);
      setStatus('error');
    }
  }

  async function handleRemove(userId: string) {
    if (!confirm('Remove this team member?')) return;
    await api.del(`/api/firms/${firmId}/members/${userId}`).catch(console.error);
    setMembers(prev => prev.filter(m => m.user_id !== userId));
  }

  return (
    <div className="firm-settings">
      <h1>Firm Settings</h1>

      <section className="settings-section">
        <h2>Team Members</h2>
        <ul role="list" className="members-list">
          {members.map(m => (
            <li key={m.id} className="member-row">
              <span className="member-avatar">{m.user_id.slice(0, 2).toUpperCase()}</span>
              <div className="member-info">
                <span className="member-id">{m.user_id}</span>
                <span className={`role-badge role-${m.role}`}>{m.role}</span>
              </div>
              {m.user_id !== currentUserId && m.role !== 'owner' && (
                <button
                  className="btn btn-ghost btn-sm danger"
                  onClick={() => handleRemove(m.user_id)}
                  aria-label={`Remove ${m.user_id}`}
                >
                  Remove
                </button>
              )}
            </li>
          ))}
        </ul>
      </section>

      <section className="settings-section">
        <h2>Invite Staff</h2>
        <form onSubmit={handleInvite} className="invite-form">
          <div className="form-row">
            <label htmlFor="invite-email">Email address</label>
            <input
              id="invite-email"
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="colleague@firm.com"
              required
              autoComplete="email"
            />
          </div>
          <div className="form-row">
            <label htmlFor="invite-role">Role</label>
            <select
              id="invite-role"
              value={role}
              onChange={e => setRole(e.target.value as typeof role)}
            >
              <option value="admin">Admin</option>
              <option value="staff">Staff</option>
              <option value="viewer">Viewer</option>
            </select>
          </div>
          <button
            type="submit"
            className="btn btn-primary"
            disabled={status === 'sending'}
          >
            {status === 'sending' ? 'Sending…' : 'Send Invite'}
          </button>
          {status === 'sent' && <p className="success-msg">✓ Invite sent</p>}
          {error && <p className="error-msg">{error}</p>}
        </form>
      </section>
    </div>
  );
}
