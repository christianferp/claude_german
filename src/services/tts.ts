/**
 * Text-to-speech service abstraction.
 *
 * Two engines behind one `TtsService` interface:
 *  - Gemini TTS (Google AI Studio, free tier) when the user has saved an
 *    API key in Settings — natural AI voices in any language.
 *  - Browser speech synthesis as the zero-setup fallback, also used when
 *    a Gemini request fails (offline, quota exhausted, bad key).
 */

import { base64ToBytes, pcm16ToWavBlob } from '../lib/audio';
import { useAppStore } from '../store/useAppStore';
import { GEMINI_BASE_URL } from './gemini';

export interface TtsOptions {
  /** BCP-47 tag, e.g. 'de-DE' or 'es-ES'. */
  lang: string;
  /** Speech rate; slightly slow (0.9) suits learners. */
  rate?: number;
}

export interface TtsService {
  /** Resolves when playback finishes; resolves early if interrupted. */
  speak(text: string, opts: TtsOptions): Promise<void>;
  stop(): void;
  /** Whether the engine can (probably) produce audio for this language. */
  isAvailable(lang: string): boolean;
  /** Warm the audio for a text so a later speak() starts instantly. */
  prefetch(text: string, opts: TtsOptions): void;
}

function createWebSpeechTts(): TtsService {
  const supported = typeof window !== 'undefined' && 'speechSynthesis' in window;
  let voices: SpeechSynthesisVoice[] = [];
  // Keep a reference to the active utterance — Chrome garbage-collects
  // utterances mid-speech otherwise, which silently cuts audio off.
  const active: { utterance: SpeechSynthesisUtterance | null } = { utterance: null };

  if (supported) {
    const loadVoices = () => {
      voices = window.speechSynthesis.getVoices();
    };
    loadVoices(); // may be empty on first call…
    window.speechSynthesis.addEventListener('voiceschanged', loadVoices); // …filled async
  }

  // Engines expose several voices per language and list the worst ones
  // first (e.g. Apple's "Compact"/"Eloquence", eSpeak on Linux). Rank all
  // matches and pick the best instead of the first.
  const HIGH_QUALITY = /natural|neural|premium|enhanced|google|siri|online/i;
  const LOW_QUALITY = /compact|eloquence|espeak|novelty|whisper|zarvox|albert|jester|junior|kathy|ralph|trinoids|bahh|bells|boing|bubbles|cellos|organ|superstar|wobble/i;

  const pickVoice = (lang: string): SpeechSynthesisVoice | undefined => {
    const norm = (tag: string) => tag.replace('_', '-').toLowerCase();
    const target = norm(lang);
    const prefix = target.slice(0, 2);

    const score = (v: SpeechSynthesisVoice): number => {
      const vLang = norm(v.lang);
      let s = 0;
      if (vLang === target) s += 8;
      else if (vLang.startsWith(prefix)) s += 4;
      else return -1; // wrong language entirely
      if (HIGH_QUALITY.test(v.name)) s += 4;
      if (LOW_QUALITY.test(v.name)) s -= 6;
      // Cloud voices (Chrome's Google voices) beat most bundled local ones.
      if (!v.localService) s += 2;
      if (v.default) s += 1;
      return s;
    };

    let best: SpeechSynthesisVoice | undefined;
    let bestScore = 0;
    for (const v of voices) {
      const s = score(v);
      if (s > bestScore) {
        best = v;
        bestScore = s;
      }
    }
    return best;
  };

  return {
    speak(text, { lang, rate = 0.9 }) {
      if (!supported) {
        return Promise.reject(new Error('Speech synthesis is not supported in this browser.'));
      }
      return new Promise<void>((resolve, reject) => {
        // Chrome queues utterances; cancel anything pending first.
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = lang;
        utterance.rate = rate;
        utterance.pitch = 1;
        utterance.volume = 1;
        const voice = pickVoice(lang);
        if (voice) utterance.voice = voice;
        utterance.onend = () => {
          active.utterance = null;
          resolve();
        };
        utterance.onerror = (event) => {
          active.utterance = null;
          // A user-triggered stop() is not a failure.
          if (event.error === 'interrupted' || event.error === 'canceled') resolve();
          else reject(new Error(`Speech failed: ${event.error}`));
        };
        active.utterance = utterance;
        window.speechSynthesis.speak(utterance);
      });
    },
    stop() {
      if (supported) window.speechSynthesis.cancel();
      active.utterance = null;
    },
    prefetch() {
      /* speech synthesis has nothing to warm up */
    },
    isAvailable(lang) {
      if (!supported) return false;
      // Voices may not have loaded yet — stay optimistic until we know.
      if (voices.length === 0) return true;
      return pickVoice(lang) !== undefined;
    },
  };
}

// ── Gemini TTS ─────────────────────────────────────────────────────────────

const GEMINI_TTS_VOICE = 'Kore';
/** Replaying a phrase must not burn free-tier quota. */
const CACHE_LIMIT = 24;

const LANGUAGE_NAMES: Record<string, string> = { de: 'German', es: 'Spanish' };

interface GeminiTts extends TtsService {
  /** Synthesize into the cache without playing, so Listen is instant. */
  prefetch(text: string, opts: TtsOptions): Promise<void>;
}

function createGeminiTts(getApiKey: () => string, getModel: () => string): GeminiTts {
  const cache = new Map<string, Blob>();
  /** In-flight requests, so prefetch + speak of the same text share one call. */
  const pending = new Map<string, Promise<Blob>>();
  // Bumped by stop(): a speak() that was still synthesizing simply doesn't play.
  let playToken = 0;
  let audio: HTMLAudioElement | null = null;
  let objectUrl: string | null = null;

  const stopPlayback = () => {
    playToken++;
    if (audio) {
      audio.pause();
      audio.src = '';
      audio = null;
    }
    if (objectUrl) {
      URL.revokeObjectURL(objectUrl);
      objectUrl = null;
    }
  };

  const synthesize = async (text: string, lang: string): Promise<Blob> => {
    const languageName = LANGUAGE_NAMES[lang.slice(0, 2).toLowerCase()];
    const prompt = languageName
      ? `Say the following short ${languageName} phrase slowly and clearly: ${text}`
      : `Say the following short phrase slowly and clearly: ${text}`;

    const response = await fetch(`${GEMINI_BASE_URL}/models/${getModel()}:generateContent`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': getApiKey(),
      },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          responseModalities: ['AUDIO'],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: GEMINI_TTS_VOICE } },
          },
        },
      }),
    });
    if (!response.ok) throw new Error(`Gemini TTS request failed: HTTP ${response.status}`);

    const payload = (await response.json()) as {
      candidates?: { content?: { parts?: { inlineData?: { mimeType?: string; data?: string } }[] } }[];
    };
    const inline = payload.candidates?.[0]?.content?.parts?.find((p) => p.inlineData?.data)?.inlineData;
    if (!inline?.data) throw new Error('Gemini TTS response contained no audio.');

    const sampleRate = Number(/rate=(\d+)/.exec(inline.mimeType ?? '')?.[1] ?? 24000);
    return pcm16ToWavBlob(base64ToBytes(inline.data), sampleRate);
  };

  /** Cached blob, the in-flight request for it, or a fresh request. */
  const getBlob = (text: string, lang: string): Promise<Blob> => {
    const cacheKey = `${getModel()}:${GEMINI_TTS_VOICE}:${lang}:${text}`;
    const hit = cache.get(cacheKey);
    if (hit) return Promise.resolve(hit);
    let request = pending.get(cacheKey);
    if (!request) {
      request = synthesize(text, lang)
        .then((blob) => {
          if (cache.size >= CACHE_LIMIT) {
            const oldest = cache.keys().next().value;
            if (oldest !== undefined) cache.delete(oldest);
          }
          cache.set(cacheKey, blob);
          pending.delete(cacheKey);
          return blob;
        })
        .catch((err: unknown) => {
          pending.delete(cacheKey);
          throw err;
        });
      pending.set(cacheKey, request);
    }
    return request;
  };

  return {
    async prefetch(text, { lang }) {
      await getBlob(text, lang);
    },
    async speak(text, { lang }) {
      stopPlayback();
      const token = playToken;
      const blob = await getBlob(text, lang);
      // stop() was tapped while we were synthesizing — don't start playing.
      if (token !== playToken) return;

      await new Promise<void>((resolve, reject) => {
        objectUrl = URL.createObjectURL(blob);
        audio = new Audio(objectUrl);
        // pause() via stop() also fires nothing rejectable — resolve on both
        // natural end and manual pause so interruption mirrors web speech.
        audio.onended = () => resolve();
        audio.onpause = () => resolve();
        audio.onerror = () => reject(new Error('Audio playback failed.'));
        audio.play().catch(reject);
      }).finally(() => {
        if (objectUrl) {
          URL.revokeObjectURL(objectUrl);
          objectUrl = null;
        }
        audio = null;
      });
    },
    stop: stopPlayback,
    isAvailable: () => true,
  };
}

// ── Dispatcher ─────────────────────────────────────────────────────────────

const getGeminiKey = () => useAppStore.getState().geminiApiKey;
const getGeminiModel = () => useAppStore.getState().geminiTtsModel;
const webSpeechTts = createWebSpeechTts();
const geminiTts = createGeminiTts(getGeminiKey, getGeminiModel);

/** Gemini AI voice when the user has saved an API key in Settings; browser
    speech synthesis otherwise, and as the fallback when Gemini errors. */
export const tts: TtsService = {
  async speak(text, opts) {
    if (!getGeminiKey()) return webSpeechTts.speak(text, opts);
    try {
      await geminiTts.speak(text, opts);
    } catch {
      // Offline, quota exhausted, bad key… still make a sound.
      await webSpeechTts.speak(text, opts);
    }
  },
  stop() {
    geminiTts.stop();
    webSpeechTts.stop();
  },
  isAvailable(lang) {
    return getGeminiKey() ? true : webSpeechTts.isAvailable(lang);
  },
  prefetch(text, opts) {
    // Fire-and-forget warm-up; failures will be retried by speak() itself.
    if (getGeminiKey()) void geminiTts.prefetch(text, opts).catch(() => {});
  },
};
