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

// ── Text generation ────────────────────────────────────────────────────────

/**
 * Model names churn as Google retires generations, so never hardcode one:
 * try the stable alias first and walk the list on 404. The first model that
 * answers is remembered for the rest of the session.
 */
const TEXT_MODEL_CANDIDATES = ['gemini-flash-latest', 'gemini-2.5-flash', 'gemini-flash-lite-latest'];
let textModelIndex = 0;

export type GeminiErrorKind = 'auth' | 'quota' | 'network' | 'other';

export class GeminiError extends Error {
  kind: GeminiErrorKind;
  constructor(kind: GeminiErrorKind, message: string) {
    super(message);
    this.kind = kind;
  }
}

/** A single `parts` entry of a generateContent request. */
export type GeminiPart =
  | { text: string }
  | { inlineData: { mimeType: string; data: string } };

interface GeminiTextOptions {
  /** Ask for a JSON object back (sets responseMimeType). */
  json?: boolean;
  temperature?: number;
  /**
   * Output budget. Worth setting generously for long replies: on thinking
   * models the reasoning tokens are drawn from the same budget, so a modest
   * cap can end the response before any text is produced.
   */
  maxOutputTokens?: number;
  signal?: AbortSignal;
}

/** Thrown when the model stopped before finishing (usually the token cap). */
export class GeminiTruncatedError extends GeminiError {
  constructor(reason: string) {
    super('other', `The model stopped early (${reason}).`);
  }
}

/**
 * Call a Gemini text model and return the concatenated text response.
 * Shared by the pronunciation transcriber and the podcast generator so the
 * model-churn handling and error mapping live in exactly one place.
 *
 * The API key is passed in rather than read from the store: the store
 * imports this module for DEFAULT_GEMINI_TTS_MODEL at init time, so
 * importing it back here would form a cycle that can crash on startup.
 */
export async function callGeminiText(
  apiKey: string,
  parts: GeminiPart[],
  { json = false, temperature, maxOutputTokens, signal }: GeminiTextOptions = {},
): Promise<string> {
  const fullConfig: Record<string, unknown> = {};
  if (temperature !== undefined) fullConfig.temperature = temperature;
  if (json) fullConfig.responseMimeType = 'application/json';
  if (maxOutputTokens !== undefined) fullConfig.maxOutputTokens = maxOutputTokens;

  // Generation options are the most version-sensitive part of the request, so
  // keep a plain fallback: some models reject responseMimeType (or an
  // unexpected field) with a 400 that has nothing to do with the prompt.
  const configs: Record<string, unknown>[] =
    Object.keys(fullConfig).length > 0
      ? [fullConfig, temperature !== undefined ? { temperature } : {}]
      : [{}];

  let response: Response | null = null;
  let lastDetail = '';

  for (const generationConfig of configs) {
    response = null;
    while (textModelIndex < TEXT_MODEL_CANDIDATES.length) {
      const model = TEXT_MODEL_CANDIDATES[textModelIndex];
      try {
        response = await fetch(`${GEMINI_BASE_URL}/models/${model}:generateContent`, {
          method: 'POST',
          signal,
          headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
          body: JSON.stringify({ contents: [{ parts }], generationConfig }),
        });
      } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') throw err;
        throw new GeminiError('network', 'Could not reach Gemini.');
      }
      // A 404 means this model name no longer exists — quietly try the next.
      if (response.status !== 404) break;
      textModelIndex++;
      response = null;
    }
    if (!response) throw new GeminiError('other', 'No available Gemini text model.');
    if (response.ok) break;

    const body = await response.text().catch(() => '');
    lastDetail = /"message"\s*:\s*"([^"]+)"/.exec(body)?.[1] ?? '';
    if (response.status === 429) throw new GeminiError('quota', 'Quota exhausted.');
    if ([401, 403].includes(response.status) || (response.status === 400 && /api key/i.test(lastDetail))) {
      throw new GeminiError('auth', `Key rejected (HTTP ${response.status}).`);
    }
    // Only a rejected config is worth retrying; anything else is terminal.
    if (response.status !== 400) {
      throw new GeminiError('other', `HTTP ${response.status}${lastDetail ? ` — ${lastDetail}` : ''}`);
    }
    console.warn(`Gemini: config rejected (${lastDetail || 'HTTP 400'}) — retrying simpler`);
  }

  if (!response || !response.ok) {
    throw new GeminiError('other', `HTTP 400${lastDetail ? ` — ${lastDetail}` : ''}`);
  }

  const payload = (await response.json()) as {
    candidates?: { content?: { parts?: { text?: string }[] }; finishReason?: string }[];
  };
  const candidate = payload.candidates?.[0];
  const text = (candidate?.content?.parts ?? [])
    .map((part) => part.text ?? '')
    .join('')
    .trim();

  // A truncated reply is worth naming: it looks like a broken response
  // otherwise, and the fix (a bigger budget or a shorter ask) is different.
  if (!text && candidate?.finishReason && candidate.finishReason !== 'STOP') {
    throw new GeminiTruncatedError(candidate.finishReason);
  }
  return text;
}

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
