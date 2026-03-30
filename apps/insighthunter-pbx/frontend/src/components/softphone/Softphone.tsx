// frontend/src/components/softphone/Softphone.tsx
// Browser-based WebRTC softphone using Twilio Voice JS SDK.
// Appears as a persistent floating widget — always accessible from any page.

import { useState, useEffect, useRef, useCallback } from ‘react’;
import { Device, Call } from ‘@twilio/voice-sdk’;
import { useApi } from ‘../../hooks/useSession’;

type SoftphoneState = ‘idle’ | ‘connecting’ | ‘ringing’ | ‘in-call’ | ‘incoming’ | ‘error’;

interface SoftphoneProps {
extensionId: string;
extensionNumber: string;
orgNumbers: Array<{ id: string; number: string; friendlyName: string }>;
}

export function Softphone({ extensionId, extensionNumber, orgNumbers }: SoftphoneProps) {
const { apiFetch } = useApi();
const deviceRef = useRef<Device | null>(null);
const callRef = useRef<Call | null>(null);

const [state, setState] = useState<SoftphoneState>(‘idle’);
const [dialInput, setDialInput] = useState(’’);
const [callDuration, setCallDuration] = useState(0);
const [callerInfo, setCallerInfo] = useState<{ number: string; name?: string } | null>(null);
const [isMuted, setIsMuted] = useState(false);
const [isOnHold, setIsOnHold] = useState(false);
const [selectedFromNumber, setSelectedFromNumber] = useState(orgNumbers[0]?.number ?? ‘’);
const [isExpanded, setIsExpanded] = useState(false);
const [error, setError] = useState<string | null>(null);
const durationInterval = useRef<ReturnType<typeof setInterval> | null>(null);

// Initialize Twilio Device
useEffect(() => {
let device: Device;

...
async function init() {
  try {
    const data: any = await apiFetch(`/api/extensions/${extensionId}/token`);
    const { token } = data.data;

    device = new Device(token, {
      logLevel: 'warn',
      codecPreferences: [Call.Codec.Opus, Call.Codec.PCMU],
      enableImprovedSignalingErrorPrecision: true,
    });

    device.on('registered', () => {
      setState('idle');
      setError(null);
    });

    device.on('error', (err) => {
      console.error('Twilio Device error:', err);
      setError(err.message);
      setState('error');
    });

    device.on('incoming', (call: Call) => {
      callRef.current = call;
      setCallerInfo({ number: call.parameters.From });
      setState('incoming');

      call.on('disconnect', () => handleCallEnd());
      call.on('cancel', () => handleCallEnd());
    });

    device.on('tokenWillExpire', async () => {
      const refreshed: any = await apiFetch(`/api/extensions/${extensionId}/token`);
      device.updateToken(refreshed.data.token);
    });

    await device.register();
    deviceRef.current = device;

  } catch (err) {
    console.error('Softphone init failed:', err);
    setError('Failed to initialize softphone');
    setState('error');
  }
}

init();

return () => {
  device?.destroy();
};
...

}, [extensionId]);

const handleCallEnd = useCallback(() => {
callRef.current = null;
setState(‘idle’);
setCallerInfo(null);
setIsMuted(false);
setIsOnHold(false);
setCallDuration(0);
if (durationInterval.current) {
clearInterval(durationInterval.current);
durationInterval.current = null;
}
}, []);

const startTimer = useCallback(() => {
setCallDuration(0);
durationInterval.current = setInterval(() => {
setCallDuration(d => d + 1);
}, 1000);
}, []);

const dial = useCallback(async () => {
if (!deviceRef.current || !dialInput) return;
setState(‘connecting’);

...
try {
  const call = await deviceRef.current.connect({
    params: {
      To: dialInput,
      From: selectedFromNumber,
      ExtensionId: extensionId,
    },
  });

  callRef.current = call;

  call.on('ringing', () => setState('ringing'));
  call.on('accept', () => { setState('in-call'); startTimer(); });
  call.on('disconnect', () => handleCallEnd());
  call.on('error', (err: Error) => {
    setError(err.message);
    handleCallEnd();
  });

} catch (err) {
  setError('Call failed to connect');
  setState('idle');
}
...

}, [dialInput, selectedFromNumber, extensionId, handleCallEnd, startTimer]);

const answerCall = useCallback(() => {
if (!callRef.current) return;
callRef.current.accept();
setState(‘in-call’);
startTimer();
}, [startTimer]);

const rejectCall = useCallback(() => {
callRef.current?.reject();
handleCallEnd();
}, [handleCallEnd]);

const hangup = useCallback(() => {
callRef.current?.disconnect();
handleCallEnd();
}, [handleCallEnd]);

const toggleMute = useCallback(() => {
if (!callRef.current) return;
const newMuted = !isMuted;
callRef.current.mute(newMuted);
setIsMuted(newMuted);
}, [isMuted]);

const sendDTMF = useCallback((digit: string) => {
callRef.current?.sendDigits(digit);
if (state === ‘idle’) setDialInput(d => d + digit);
}, [state]);

const formatDuration = (s: number) => {
const m = Math.floor(s / 60).toString().padStart(2, ‘0’);
const sec = (s % 60).toString().padStart(2, ‘0’);
return `${m}:${sec}`;
};

const stateColors: Record<SoftphoneState, string> = {
idle: ‘#10B981’, connecting: ‘#F59E0B’, ringing: ‘#F59E0B’,
‘in-call’: ‘#3B82F6’, incoming: ‘#8B5CF6’, error: ‘#EF4444’,
};

const DIALPAD = [‘1’,‘2’,‘3’,‘4’,‘5’,‘6’,‘7’,‘8’,‘9’,’*’,‘0’,’#’];
const DIALPAD_LABELS: Record<string, string> = {
‘1’: ‘’, ‘2’: ‘ABC’, ‘3’: ‘DEF’, ‘4’: ‘GHI’,
‘5’: ‘JKL’, ‘6’: ‘MNO’, ‘7’: ‘PQRS’, ‘8’: ‘TUV’,
‘9’: ‘WXYZ’, ’*’: ‘’, ‘0’: ‘+’, ‘#’: ‘’,
};

return (
<div className={`softphone ${isExpanded ? 'expanded' : 'collapsed'}`}>
{/* Header / Toggle */}
<div className=“sp-header” onClick={() => setIsExpanded(e => !e)}>
<div className=“sp-status-dot” style={{ background: stateColors[state] }} />
<span className="sp-ext">Ext {extensionNumber}</span>
{state === ‘in-call’ && (
<span className="sp-duration">{formatDuration(callDuration)}</span>
)}
{state === ‘incoming’ && (
<span className="sp-incoming-badge">Incoming</span>
)}
<span className="sp-chevron">{isExpanded ? ‘▾’ : ‘▴’}</span>
</div>

...
  {isExpanded && (
    <div className="sp-body">
      {/* Error */}
      {error && (
        <div className="sp-error">{error}</div>
      )}

      {/* Incoming call */}
      {state === 'incoming' && (
        <div className="sp-incoming">
          <div className="sp-caller-number">{callerInfo?.number}</div>
          <div className="sp-caller-label">Incoming Call</div>
          <div className="sp-incoming-actions">
            <button className="sp-btn sp-answer" onClick={answerCall}>Answer</button>
            <button className="sp-btn sp-reject" onClick={rejectCall}>Decline</button>
          </div>
        </div>
      )}

      {/* In-call controls */}
      {state === 'in-call' && (
        <div className="sp-incall">
          <div className="sp-call-info">
            <div className="sp-call-number">{callerInfo?.number ?? dialInput}</div>
            <div className="sp-call-timer">{formatDuration(callDuration)}</div>
          </div>
          <div className="sp-call-controls">
            <button
              className={`sp-ctrl-btn ${isMuted ? 'active' : ''}`}
              onClick={toggleMute}
              title={isMuted ? 'Unmute' : 'Mute'}
            >🎙</button>
            <button className="sp-ctrl-btn hangup" onClick={hangup} title="Hang up">📵</button>
          </div>
        </div>
      )}

      {/* Dialer — shown when idle, connecting, or ringing */}
      {(state === 'idle' || state === 'connecting' || state === 'ringing') && (
        <>
          {/* From number selector */}
          {orgNumbers.length > 1 && (
            <select
              className="sp-from-select"
              value={selectedFromNumber}
              onChange={e => setSelectedFromNumber(e.target.value)}
            >
              {orgNumbers.map(n => (
                <option key={n.id} value={n.number}>{n.friendlyName}</option>
              ))}
            </select>
          )}

          {/* Dial input */}
          <div className="sp-dial-display">
            <span className="sp-dial-number">{dialInput || (state !== 'idle' ? 'Connecting…' : '')}</span>
            {dialInput && (
              <button className="sp-backspace" onClick={() => setDialInput(d => d.slice(0, -1))}>⌫</button>
            )}
          </div>

          {/* Dialpad */}
          <div className="sp-dialpad">
            {DIALPAD.map(digit => (
              <button key={digit} className="sp-digit" onClick={() => sendDTMF(digit)}>
                <span className="sp-digit-num">{digit}</span>
                {DIALPAD_LABELS[digit] && (
                  <span className="sp-digit-letters">{DIALPAD_LABELS[digit]}</span>
                )}
              </button>
            ))}
          </div>

          {/* Call/Hangup button */}
          {state === 'idle' ? (
            <button
              className="sp-btn sp-call"
              onClick={dial}
              disabled={!dialInput}
            >
              📞 Call
            </button>
          ) : (
            <button className="sp-btn sp-reject" onClick={hangup}>
              📵 Cancel
            </button>
          )}
        </>
      )}
    </div>
  )}
</div>
...

);
}
