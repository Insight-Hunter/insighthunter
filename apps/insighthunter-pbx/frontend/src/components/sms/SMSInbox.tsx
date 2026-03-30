// frontend/src/components/sms/SMSInbox.tsx
import { useState, useEffect, useRef } from ‘react’;
import { useApi } from ‘../../hooks/useSession’;

interface Thread {
id: string;
our_number: string;
contact_number: string;
contact_name?: string;
last_message: string;
last_message_at: string;
unread_count: number;
}

interface Message {
id: string;
from_number: string;
to_number: string;
body: string;
media_urls: string[];
direction: ‘inbound’ | ‘outbound’;
status: string;
created_at: string;
}

interface SMSInboxProps {
orgNumbers: Array<{ id: string; number: string; friendlyName: string }>;
}

export function SMSInbox({ orgNumbers }: SMSInboxProps) {
const { apiFetch } = useApi();
const [threads, setThreads] = useState<Thread[]>([]);
const [activeThread, setActiveThread] = useState<Thread | null>(null);
const [messages, setMessages] = useState<Message[]>([]);
const [composeTo, setComposeTo] = useState(’’);
const [composeBody, setComposeBody] = useState(’’);
const [fromNumber, setFromNumber] = useState(orgNumbers[0]?.number ?? ‘’);
const [sending, setSending] = useState(false);
const [showCompose, setShowCompose] = useState(false);
const messagesEndRef = useRef<HTMLDivElement>(null);

useEffect(() => {
loadThreads();
const poll = setInterval(loadThreads, 10000);
return () => clearInterval(poll);
}, []);

useEffect(() => {
messagesEndRef.current?.scrollIntoView({ behavior: ‘smooth’ });
}, [messages]);

async function loadThreads() {
const data: any = await apiFetch(’/api/messages/threads’);
setThreads(data.data ?? []);
}

async function openThread(thread: Thread) {
setActiveThread(thread);
const data: any = await apiFetch(`/api/messages/threads/${thread.id}`);
setMessages(data.data ?? []);
setThreads(prev => prev.map(t => t.id === thread.id ? { …t, unread_count: 0 } : t));
}

async function sendMessage() {
if (!composeBody.trim()) return;
const to = showCompose ? composeTo : activeThread?.contact_number;
const from = showCompose ? fromNumber : activeThread?.our_number;
if (!to || !from) return;

...
setSending(true);
try {
  await apiFetch('/api/messages/send', {
    method: 'POST',
    body: JSON.stringify({ from, to, body: composeBody }),
  });
  setComposeBody('');
  setShowCompose(false);
  if (activeThread) {
    const data: any = await apiFetch(`/api/messages/threads/${activeThread.id}`);
    setMessages(data.data ?? []);
  }
  loadThreads();
} finally {
  setSending(false);
}
...

}

const totalUnread = threads.reduce((s, t) => s + t.unread_count, 0);

return (
<div className="sms-inbox">
{/* Thread List */}
<div className="sms-threads">
<div className="sms-threads-header">
<h3>Messages {totalUnread > 0 && <span className="sms-unread-badge">{totalUnread}</span>}</h3>
<button className=“sms-compose-btn” onClick={() => setShowCompose(true)}>+ New</button>
</div>

...
    {threads.length === 0 ? (
      <div className="sms-empty">No messages yet</div>
    ) : threads.map(thread => (
      <div
        key={thread.id}
        className={`sms-thread-item ${activeThread?.id === thread.id ? 'active' : ''} ${thread.unread_count > 0 ? 'unread' : ''}`}
        onClick={() => openThread(thread)}
      >
        <div className="sms-thread-avatar">
          {(thread.contact_name ?? thread.contact_number).slice(0, 2).toUpperCase()}
        </div>
        <div className="sms-thread-info">
          <div className="sms-thread-contact">
            {thread.contact_name ?? thread.contact_number}
          </div>
          <div className="sms-thread-preview">{thread.last_message}</div>
        </div>
        <div className="sms-thread-meta">
          <div className="sms-thread-time">
            {new Date(thread.last_message_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </div>
          {thread.unread_count > 0 && (
            <div className="sms-thread-badge">{thread.unread_count}</div>
          )}
        </div>
      </div>
    ))}
  </div>

  {/* Message View */}
  <div className="sms-conversation">
    {showCompose ? (
      <div className="sms-compose">
        <div className="sms-compose-header">
          <h3>New Message</h3>
          <button className="sms-close-compose" onClick={() => setShowCompose(false)}>✕</button>
        </div>
        <div className="sms-compose-fields">
          <div className="sms-field">
            <label>From</label>
            <select value={fromNumber} onChange={e => setFromNumber(e.target.value)}>
              {orgNumbers.map(n => <option key={n.id} value={n.number}>{n.friendlyName} ({n.number})</option>)}
            </select>
          </div>
          <div className="sms-field">
            <label>To</label>
            <input
              type="tel"
              value={composeTo}
              onChange={e => setComposeTo(e.target.value)}
              placeholder="+1 555 123 4567"
            />
          </div>
          <textarea
            className="sms-compose-body"
            value={composeBody}
            onChange={e => setComposeBody(e.target.value)}
            placeholder="Type a message…"
            rows={4}
          />
          <div className="sms-compose-footer">
            <span className="sms-char-count">{composeBody.length}/160</span>
            <button className="sms-send-btn" onClick={sendMessage} disabled={sending || !composeBody || !composeTo}>
              {sending ? 'Sending…' : 'Send'}
            </button>
          </div>
        </div>
      </div>
    ) : activeThread ? (
      <>
        <div className="sms-convo-header">
          <div className="sms-convo-contact">
            <div className="sms-convo-avatar">
              {(activeThread.contact_name ?? activeThread.contact_number).slice(0, 2).toUpperCase()}
            </div>
            <div>
              <div className="sms-convo-name">{activeThread.contact_name ?? activeThread.contact_number}</div>
              <div className="sms-convo-number">via {activeThread.our_number}</div>
            </div>
          </div>
        </div>

        <div className="sms-messages">
          {messages.map(msg => (
            <div key={msg.id} className={`sms-bubble-wrap ${msg.direction}`}>
              <div className={`sms-bubble ${msg.direction}`}>
                {msg.body && <p>{msg.body}</p>}
                {msg.media_urls.map((url, i) => (
                  <img key={i} src={url} alt="MMS" className="sms-media" />
                ))}
                <div className="sms-bubble-time">
                  {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  {msg.direction === 'outbound' && (
                    <span className="sms-status">{msg.status === 'delivered' ? ' ✓✓' : ' ✓'}</span>
                  )}
                </div>
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>

        <div className="sms-reply-bar">
          <textarea
            className="sms-reply-input"
            value={composeBody}
            onChange={e => setComposeBody(e.target.value)}
            placeholder="Reply…"
            rows={2}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
          />
          <button className="sms-send-btn" onClick={sendMessage} disabled={sending || !composeBody}>
            {sending ? '…' : '↑'}
          </button>
        </div>
      </>
    ) : (
      <div className="sms-select-prompt">
        <div className="sms-select-icon">💬</div>
        <p>Select a conversation or start a new message</p>
      </div>
    )}
  </div>
</div>
...

);
}
