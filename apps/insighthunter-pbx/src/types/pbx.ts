export interface PbxNumber {
  id: string;
  user_id: string;
  phone_number: string;
  friendly_name: string;
  twilio_sid: string;
  status: 'active' | 'released';
  created_at: string;
  updated_at?: string;
}

export interface PbxCall {
  id: string;
  user_id: string;
  direction: 'inbound' | 'outbound';
  from_number: string;
  to_number: string;
  call_sid: string;
  status: string;
  created_at: string;
}

export interface PbxVoicemail {
  id: string;
  user_id: string;
  from_number: string;
  recording_url: string;
  recording_sid: string;
  duration: number;
  transcription?: string;
  listened: 0 | 1;
  created_at: string;
}

export interface PbxSms {
  id: string;
  user_id: string;
  direction: 'inbound' | 'outbound';
  from_number: string;
  to_number: string;
  body: string;
  twilio_sid?: string;
  status: 'received' | 'sent' | 'failed';
  opt_keyword?: 'START' | 'STOP' | 'HELP';
  created_at: string;
}

export interface PbxRoute {
  id: string;
  user_id: string;
  label: string;
  forward_to: string;
  description?: string;
  created_at: string;
}

export interface IvrConfig {
  greeting: string;
  routes: Record<string, string>; // e.g. { '1': 'sales', '2': 'support' }
  voicemail_enabled: boolean;
}

export interface SmsConsent {
    id: string;
    user_id: string;
    phone_number: string;
    status: 'active' | 'opted_out';
    consent_type: 'web_form' | 'import' | 'sms_keyword';
    message_type: 'transactional' | 'promotional' | 'mixed';
    program_name?: string;
    opt_in_message?: string;
    consented_at: string;
    created_at: string;
}
