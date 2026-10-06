// apps/insighthunter-pbx/src/backend/utils/phone.ts
//
// Minimal E.164 phone-number helpers. Real implementation (not a stub) —
// used wherever numbers are normalized/displayed. Intentionally does not
// depend on a full phone-number library (e.g. libphonenumber) to keep the
// Worker bundle small; this covers normalization for already-mostly-valid
// North American/E.164 input, not full international validation.

const E164_PATTERN = /^\+[1-9]\d{1,14}$/;

export function isE164(value: string): boolean {
  return E164_PATTERN.test(value);
}

/**
 * Best-effort normalization to E.164. Returns null if the input cannot be
 * confidently normalized (callers should treat that as a validation error,
 * not silently drop the number).
 */
export function normalizeToE164(raw: string): string | null {
  const trimmed = raw.trim();
  if (isE164(trimmed)) return trimmed;

  const digits = trimmed.replace(/[^\d]/g, "");
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
  return null;
}

export function formatForDisplay(e164: string): string {
  if (!isE164(e164)) return e164;
  const digits = e164.slice(1);
  if (digits.length === 11 && digits.startsWith("1")) {
    const national = digits.slice(1);
    return `+1 (${national.slice(0, 3)}) ${national.slice(3, 6)}-${national.slice(6)}`;
  }
  return e164;
}
