/**
 * Shared Gemini API plumbing: base URL, the TTS model registry backing the
 * Settings picker, and API-key verification.
 */

export const GEMINI_BASE_URL = 'https://generativelanguage.googleapis.com/v1beta';

export interface GeminiTtsModelOption {
  id: string;
  /** Short label for the Settings segmented control. */
  label: string;
  /** One-line description shown under the picker. */
  hint: string;
}

export const GEMINI_TTS_MODELS: GeminiTtsModelOption[] = [
  {
    id: 'gemini-2.5-flash-preview-tts',
    label: 'Flash',
    hint: 'Fast and generous free quota — the default.',
  },
  {
    id: 'gemini-2.5-pro-preview-tts',
    label: 'Pro',
    hint: 'Highest quality voice, but a much smaller free quota.',
  },
  {
    id: 'gemini-3.1-flash-tts-preview',
    label: '3.1 Flash',
    hint: 'Newest preview model — most expressive, may change.',
  },
];

export const DEFAULT_GEMINI_TTS_MODEL = GEMINI_TTS_MODELS[0].id;

export type KeyVerification = 'unchecked' | 'checking' | 'valid' | 'invalid' | 'network-error';

/**
 * Confirm a key is accepted by listing models — a free call that spends no
 * generation quota. 200 → valid; 400/401/403 → rejected key.
 */
export async function verifyGeminiKey(key: string): Promise<KeyVerification> {
  try {
    const response = await fetch(`${GEMINI_BASE_URL}/models?pageSize=1`, {
      headers: { 'x-goog-api-key': key },
    });
    if (response.ok) return 'valid';
    if ([400, 401, 403].includes(response.status)) return 'invalid';
    return 'network-error';
  } catch {
    return 'network-error';
  }
}
