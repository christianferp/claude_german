/**
 * Pronunciation check: transcribe a recorded take with Gemini, then align the
 * transcript against the expected phrase word by word.
 *
 * Honest scope: this measures word recall/intelligibility *as heard by the
 * transcriber* — a badly pronounced word usually transcribes wrong, which is
 * exactly the per-word signal we surface.
 */

import { blobToBase64, transcodeToWav16kMono } from '../lib/audio';
import { LANGUAGES } from '../lib/languages';
import { levenshtein, normalizeWord, stripDiacritics, wordsOf } from '../lib/textTokens';
import type { Phrase } from '../lib/types';
import { useAppStore } from '../store/useAppStore';
import { GEMINI_BASE_URL } from './gemini';

const GEMINI_STT_MODEL = 'gemini-2.5-flash';
const NO_SPEECH_MARKER = '[no speech]';

export type WordVerdict = 'match' | 'close' | 'missed';

export interface PronunciationResult {
  transcript: string;
  /** One entry per expected word, in phrase order. */
  words: { expected: string; heard: string | null; verdict: WordVerdict }[];
  /** Heard words that didn't align to any expected word. */
  extraWordCount: number;
  /** 0..1 — matches count fully, close matches half. */
  score: number;
}

export type CheckErrorKind = 'auth' | 'quota' | 'network' | 'no-speech' | 'decode' | 'other';

export class PronunciationCheckError extends Error {
  kind: CheckErrorKind;
  constructor(kind: CheckErrorKind, message: string) {
    super(message);
    this.kind = kind;
  }
}

function classifyPair(expected: string, heard: string): WordVerdict {
  if (expected === heard) return 'match';
  if (stripDiacritics(expected) === stripDiacritics(heard)) return 'close';
  const length = expected.length;
  const distance = levenshtein(expected, heard);
  if (length >= 8 && distance <= 2) return 'close';
  if (length >= 5 && distance <= 1) return 'close';
  return 'missed';
}

/**
 * Word-level alignment (Needleman–Wunsch style) so a dropped word doesn't
 * cascade red across the rest of the phrase.
 */
export function comparePronunciation(expectedText: string, transcript: string): PronunciationResult {
  const expectedRaw = wordsOf(expectedText);
  const expected = expectedRaw.map(normalizeWord);
  const heardRaw = wordsOf(transcript);
  const heard = heardRaw.map(normalizeWord);

  const n = expected.length;
  const m = heard.length;
  const GAP = 1;
  const cost = (i: number, j: number) => {
    const verdict = classifyPair(expected[i], heard[j]);
    return verdict === 'match' ? 0 : verdict === 'close' ? 0.4 : 1;
  };

  // dp[i][j] = min cost aligning expected[0..i) with heard[0..j)
  const dp: number[][] = Array.from({ length: n + 1 }, () => new Array<number>(m + 1).fill(0));
  for (let i = 1; i <= n; i++) dp[i][0] = i * GAP;
  for (let j = 1; j <= m; j++) dp[0][j] = j * GAP;
  for (let i = 1; i <= n; i++) {
    for (let j = 1; j <= m; j++) {
      dp[i][j] = Math.min(
        dp[i - 1][j - 1] + cost(i - 1, j - 1),
        dp[i - 1][j] + GAP, // expected word unspoken
        dp[i][j - 1] + GAP, // extra heard word
      );
    }
  }

  // Backtrack.
  const words: PronunciationResult['words'] = [];
  let extraWordCount = 0;
  let i = n;
  let j = m;
  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && dp[i][j] === dp[i - 1][j - 1] + cost(i - 1, j - 1)) {
      words.unshift({
        expected: expectedRaw[i - 1],
        heard: heardRaw[j - 1],
        verdict: classifyPair(expected[i - 1], heard[j - 1]),
      });
      i--;
      j--;
    } else if (i > 0 && dp[i][j] === dp[i - 1][j] + GAP) {
      words.unshift({ expected: expectedRaw[i - 1], heard: null, verdict: 'missed' });
      i--;
    } else {
      extraWordCount++;
      j--;
    }
  }

  const matches = words.filter((w) => w.verdict === 'match').length;
  const closes = words.filter((w) => w.verdict === 'close').length;
  return {
    transcript: transcript.trim(),
    words,
    extraWordCount,
    score: n === 0 ? 0 : (matches + 0.5 * closes) / n,
  };
}

async function transcribe(blob: Blob, phrase: Phrase, signal?: AbortSignal): Promise<string> {
  const languageName = LANGUAGES[phrase.language].name;
  const prompt =
    `The audio contains a language learner speaking ${languageName}. ` +
    `Transcribe exactly what you hear, verbatim, in ${languageName} — including mistakes, ` +
    `repetitions and mispronounced words rendered as the closest ${languageName} spelling. ` +
    `Do not correct, complete or translate anything. Output only the transcription with no ` +
    `quotes or commentary. If there is no discernible speech, output exactly: ${NO_SPEECH_MARKER}`;

  let response: Response;
  try {
    response = await fetch(`${GEMINI_BASE_URL}/models/${GEMINI_STT_MODEL}:generateContent`, {
      method: 'POST',
      signal,
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': useAppStore.getState().geminiApiKey,
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              { text: prompt },
              { inlineData: { mimeType: 'audio/wav', data: await blobToBase64(blob) } },
            ],
          },
        ],
        generationConfig: { temperature: 0 },
      }),
    });
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') throw err;
    throw new PronunciationCheckError('network', 'Could not reach Gemini.');
  }

  if (!response.ok) {
    if (response.status === 429) throw new PronunciationCheckError('quota', 'Quota exhausted.');
    if ([400, 401, 403].includes(response.status)) {
      throw new PronunciationCheckError('auth', `Key rejected (HTTP ${response.status}).`);
    }
    throw new PronunciationCheckError('other', `Transcription failed (HTTP ${response.status}).`);
  }

  const payload = (await response.json()) as {
    candidates?: { content?: { parts?: { text?: string }[] } }[];
  };
  const transcript = (payload.candidates?.[0]?.content?.parts ?? [])
    .map((part) => part.text ?? '')
    .join('')
    .trim();
  if (!transcript || transcript === NO_SPEECH_MARKER) {
    throw new PronunciationCheckError('no-speech', 'No discernible speech in the recording.');
  }
  return transcript;
}

export async function checkPronunciation(
  blob: Blob,
  phrase: Phrase,
  signal?: AbortSignal,
): Promise<PronunciationResult> {
  let wav: Blob;
  try {
    wav = await transcodeToWav16kMono(blob);
  } catch {
    throw new PronunciationCheckError('decode', 'Could not decode the recording.');
  }
  const transcript = await transcribe(wav, phrase, signal);
  return comparePronunciation(phrase.text, transcript);
}
