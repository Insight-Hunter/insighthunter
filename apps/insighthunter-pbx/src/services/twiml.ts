// apps/insighthunter-pbx/src/services/twiml.ts
// Builds Twilio Markup Language (TwiML) XML responses for all call flows.
// TwiML tells Twilio what to do with a call at each step.

import { IVRMenu, IVRAction, CallQueue, Extension, Voicemail } from '../types/index.js';
import Twilio from 'twilio';

const { twiml } = Twilio;

// ─── Inbound call routing ─────────────────────────────────────────────────────

/**
 * Route an inbound call based on the number's assignment.
 * Returns TwiML that handles: IVR, queue, extension, forward, voicemail.
 */
export function buildInboundCallTwiml(params: {
  assignedType?: string;
  assignedTo?: string;
  forwardTo?: string;
  orgId: string;
  publicUrl: string;
  callSid: string;
}): string {
  const response = new twiml.VoiceResponse();

  switch (params.assignedType) {
    case 'ivr':
      // Redirect to IVR handler
      response.redirect(`${params.publicUrl}/webhooks/voice/ivr?orgId=${params.orgId}&menuId=${params.assignedTo}`);
      break;

    case 'queue':
      // Redirect to queue handler
      response.redirect(`${params.publicUrl}/webhooks/voice/queue?orgId=${params.orgId}&queueId=${params.assignedTo}`);
      break;

    case 'extension':
      // Dial the extension directly
      response.redirect(`${params.publicUrl}/webhooks/voice/ring-extension?orgId=${params.orgId}&extensionId=${params.assignedTo}`);
      break;

    case 'forward':
      if (params.forwardTo) {
        const dial = response.dial({ timeout: 30, action: `${params.publicUrl}/webhooks/voice/no-answer?orgId=${params.orgId}` });
        dial.number(params.forwardTo);
      } else {
        response.say({ voice: 'Polly.Joanna' }, 'Sorry, this number is not configured. Goodbye.');
        response.hangup();
      }
      break;

    default:
      response.say({ voice: 'Polly.Joanna' }, 'Thank you for calling. No one is available right now. Goodbye.');
      response.hangup();
  }

  return response.toString();
}

// ─── IVR ─────────────────────────────────────────────────────────────────────

/**
 * Build TwiML for an IVR menu.
 * Plays the greeting and collects a digit.
 */
export function buildIVRMenuTwiml(
  menu: IVRMenu,
  publicUrl: string,
  orgId: string
): string {
  const response = new twiml.VoiceResponse();

  const gather = response.gather({
    numDigits: menu.numDigits,
    timeout: menu.timeout,
    action: `${publicUrl}/webhooks/voice/ivr-input?orgId=${orgId}&menuId=${menu.id}`,
    method: 'POST',
  });

  if (menu.greetingType === 'recording') {
    gather.play(menu.greeting);
  } else {
    gather.say({ voice: menu.greetingVoice as any }, menu.greeting);
  }

  // If no input: repeat the menu
  response.redirect(`${publicUrl}/webhooks/voice/ivr?orgId=${orgId}&menuId=${menu.id}`);

  return response.toString();
}

/**
 * Handle IVR digit input and route accordingly.
 */
export function buildIVRActionTwiml(
  action: IVRAction,
  publicUrl: string,
  orgId: string
): string {
  const response = new twiml.VoiceResponse();

  if (action.announcement) {
    response.say({ voice: 'Polly.Joanna' }, action.announcement);
  }

  switch (action.type) {
    case 'extension':
      response.redirect(`${publicUrl}/webhooks/voice/ring-extension?orgId=${orgId}&extensionId=${action.target}`);
      break;

    case 'queue':
      response.redirect(`${publicUrl}/webhooks/voice/queue?orgId=${orgId}&queueId=${action.target}`);
      break;

    case 'voicemail':
      response.redirect(`${publicUrl}/webhooks/voice/voicemail?orgId=${orgId}&extensionId=${action.target ?? ''}`);
      break;

    case 'submenu':
      response.redirect(`${publicUrl}/webhooks/voice/ivr?orgId=${orgId}&menuId=${action.target}`);
      break;

    case 'forward':
      if (action.target) {
        const dial = response.dial({ timeout: 30 });
        dial.number(action.target);
      }
      break;

    case 'hangup':
      response.say({ voice: 'Polly.Joanna' }, 'Thank you for calling. Goodbye.');
      response.hangup();
      break;

    case 'repeat':
      response.redirect(`${publicUrl}/webhooks/voice/ivr?orgId=${orgId}&menuId=${action.target}`);
      break;

    default:
      response.hangup();
  }

  return response.toString();
}

// ─── Ring Extension ───────────────────────────────────────────────────────────

/**
 * Ring a specific extension via WebRTC identity or SIP, with voicemail fallback.
 */
export function buildRingExtensionTwiml(params: {
  extension: Extension;
  publicUrl: string;
  orgId: string;
  callSid: string;
  recordEnabled: boolean;
}): string {
  const response = new twiml.VoiceResponse();

  if (params.extension.doNotDisturb) {
    response.redirect(`${params.publicUrl}/webhooks/voice/voicemail?orgId=${params.orgId}&extensionId=${params.extension.id}`);
    return response.toString();
  }

  if (params.recordEnabled) {
    response.record({
      action: `${params.publicUrl}/webhooks/voice/recording-complete?orgId=${params.orgId}`,
      playBeep: false,
      recordingStatusCallback: `${params.publicUrl}/webhooks/voice/recording-status?orgId=${params.orgId}`,
    });
  }

  const dial = response.dial({
    timeout: 20,
    action: `${params.publicUrl}/webhooks/voice/no-answer?orgId=${params.orgId}&extensionId=${params.extension.id}`,
    method: 'POST',
  });

  // Try WebRTC client first (browser/mobile softphone)
  dial.client(params.extension.twilioIdentity);

  // Also try SIP if configured
  // dial.sip(`sip:${params.extension.sipUsername}@${orgSlug}.sip.twilio.com`);

  return response.toString();
}

/**
 * Fallback when extension doesn't answer — try forward or go to voicemail.
 */
export function buildNoAnswerTwiml(params: {
  extension: Extension;
  publicUrl: string;
  orgId: string;
}): string {
  const response = new twiml.VoiceResponse();

  // Try external forward if configured
  if (params.extension.forwardTo) {
    const dial = response.dial({
      timeout: 25,
      action: `${params.publicUrl}/webhooks/voice/voicemail?orgId=${params.orgId}&extensionId=${params.extension.id}`,
    });
    dial.number(params.extension.forwardTo);
    return response.toString();
  }

  // Go straight to voicemail
  response.redirect(`${params.publicUrl}/webhooks/voice/voicemail?orgId=${params.orgId}&extensionId=${params.extension.id}`);
  return response.toString();
}

// ─── Call Queue ───────────────────────────────────────────────────────────────

/**
 * Build TwiML to place a caller in a queue.
 */
export function buildQueueEntryTwiml(params: {
  queue: CallQueue;
  publicUrl: string;
  orgId: string;
  position?: number;
}): string {
  const response = new twiml.VoiceResponse();

  // Position announcement
  if (params.position && params.position > 0) {
    response.say(
      { voice: 'Polly.Joanna' },
      `You are caller number ${params.position} in the queue. Please hold.`
    );
  }

  if (params.queue.holdAnnouncement) {
    response.say({ voice: 'Polly.Joanna' }, params.queue.holdAnnouncement);
  }

  const enqueue = response.enqueue({
    action: `${params.publicUrl}/webhooks/voice/queue-dequeue?orgId=${params.orgId}&queueId=${params.queue.id}`,
    method: 'POST',
    waitUrl: `${params.publicUrl}/webhooks/voice/queue-wait?orgId=${params.orgId}&queueId=${params.queue.id}`,
    waitUrlMethod: 'POST',
  });

  enqueue.task(JSON.stringify({
    orgId: params.orgId,
    queueId: params.queue.id,
    queueName: params.queue.name,
  }));

  return response.toString();
}

/**
 * Build TwiML for the queue hold experience (music + periodic announcements).
 */
export function buildQueueWaitTwiml(params: {
  queue: CallQueue;
  queuePosition: number;
  averageWaitTime: number;
}): string {
  const response = new twiml.VoiceResponse();

  // Periodic position announcement
  if (params.queuePosition > 0) {
    response.say(
      { voice: 'Polly.Joanna' },
      `You are number ${params.queuePosition} in the queue. Estimated wait time is approximately ${Math.ceil(params.averageWaitTime / 60)} minutes.`
    );
  }

  // Hold music
  if (params.queue.holdMusic) {
    response.play({ loop: 10 }, params.queue.holdMusic);
  } else {
    // Default: Twilio hold music
    response.play({ loop: 10 }, 'https://com.twilio.sounds.music.s3.amazonaws.com/MARKOVICHAMP-Borghestral.mp3');
  }

  return response.toString();
}

// ─── Voicemail ────────────────────────────────────────────────────────────────

/**
 * Build TwiML to capture voicemail.
 */
export function buildVoicemailTwiml(params: {
  extensionName: string;
  publicUrl: string;
  orgId: string;
  extensionId: string;
  transcribe: boolean;
}): string {
  const response = new twiml.VoiceResponse();

  response.say(
    { voice: 'Polly.Joanna' },
    `You have reached the voicemail of ${params.extensionName}. Please leave a message after the tone.`
  );

  response.record({
    action: `${params.publicUrl}/webhooks/voice/voicemail-complete?orgId=${params.orgId}&extensionId=${params.extensionId}`,
    method: 'POST',
    maxLength: 120,
    playBeep: true,
    transcribe: params.transcribe,
    transcribeCallback: params.transcribe
      ? `${params.publicUrl}/webhooks/voice/transcription?orgId=${params.orgId}&extensionId=${params.extensionId}`
      : undefined,
  });

  response.say({ voice: 'Polly.Joanna' }, 'I did not receive your message. Goodbye.');
  response.hangup();

  return response.toString();
}

// ─── Conference ───────────────────────────────────────────────────────────────

/**
 * Build TwiML to connect a caller into a conference bridge.
 */
export function buildConferenceTwiml(params: {
  conferenceName: string;
  accessCode: string;
  muted?: boolean;
  record?: boolean;
  publicUrl: string;
  orgId: string;
  conferenceId: string;
}): string {
  const response = new twiml.VoiceResponse();

  response.say({ voice: 'Polly.Joanna' }, 'Connecting you to the conference. Please wait.');

  const dial = response.dial();
  dial.conference(params.conferenceName, {
    muted: params.muted ?? false,
    beep: 'true',
    startConferenceOnEnter: true,
    endConferenceOnExit: false,
    record: params.record ? 'record-from-start' : 'do-not-record',
    statusCallback: `${params.publicUrl}/webhooks/voice/conference-status?orgId=${params.orgId}&conferenceId=${params.conferenceId}`,
    statusCallbackEvent: ['start', 'end', 'join', 'leave', 'mute'],
    statusCallbackMethod: 'POST',
  });

  return response.toString();
}

// ─── Outbound dial connect ────────────────────────────────────────────────────

/**
 * TwiML for the outbound call leg that connects to the destination.
 */
export function buildOutboundConnectTwiml(params: {
  to: string;
  publicUrl: string;
  orgId: string;
  recordEnabled: boolean;
}): string {
  const response = new twiml.VoiceResponse();

  const dial = response.dial({
    record: params.recordEnabled ? 'record-from-answer' : 'do-not-record',
    recordingStatusCallback: `${params.publicUrl}/webhooks/voice/recording-status?orgId=${params.orgId}`,
    action: `${params.publicUrl}/webhooks/voice/status?orgId=${params.orgId}`,
  });

  dial.number(params.to);
  return response.toString();
}

// ─── WebRTC client call ───────────────────────────────────────────────────────

/**
 * TwiML for an outbound call initiated from the browser softphone.
 * Extracts the destination from call parameters.
 */
export function buildClientCallTwiml(params: {
  to: string;
  from: string;
  publicUrl: string;
  orgId: string;
  extensionId: string;
  recordEnabled: boolean;
}): string {
  const response = new twiml.VoiceResponse();

  const dial = response.dial({
    callerId: params.from,
    record: params.recordEnabled ? 'record-from-answer' : 'do-not-record',
    recordingStatusCallback: `${params.publicUrl}/webhooks/voice/recording-status?orgId=${params.orgId}`,
  });

  // If calling another extension (starts with 'client:')
  if (params.to.startsWith('client:')) {
    dial.client(params.to.replace('client:', ''));
  } else {
    dial.number(params.to);
  }

  return response.toString();
}
