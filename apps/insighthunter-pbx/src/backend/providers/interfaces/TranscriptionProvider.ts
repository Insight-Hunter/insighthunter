// Provider-neutral speech-to-text contract, for voicemail transcription and
// the AI receptionist (docs/insight-pbx-master-prompt.md §4.8).
// TODO(ai-receptionist): planning stub only — no implementation exists yet.
// Select a vendor (or use Cloudflare Workers AI) and wire into
// services/aiReceptionistService.ts and voicemail transcription once that
// phase begins.

export interface TranscribeParams {
  audioUrl: string;
  languageHint?: string;
}

export interface TranscriptionResult {
  text: string;
  confidence: number | null;
}

export interface TranscriptionProvider {
  transcribe(params: TranscribeParams): Promise<TranscriptionResult>;
}
