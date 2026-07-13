/**
 * Text-to-speech service abstraction.
 *
 * The UI only ever talks to the `TtsService` interface, so swapping the
 * browser speech-synthesis placeholder for a real AI voice later is a
 * one-line change at the bottom of this file:
 *
 *   // ELEVENLABS / OPENAI TTS — future swap point.
 *   // export function createRemoteTts(endpoint: string): TtsService {
 *   //   speak(): POST { text, lang } → audio blob → play via HTMLAudioElement,
 *   //   resolve on 'ended'. stop(): pause + discard the element.
 *   // }
 */

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

  const pickVoice = (lang: string): SpeechSynthesisVoice | undefined => {
    const norm = (tag: string) => tag.replace('_', '-').toLowerCase();
    return (
      voices.find((v) => norm(v.lang) === norm(lang)) ??
      voices.find((v) => norm(v.lang).startsWith(lang.slice(0, 2).toLowerCase()))
    );
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
    isAvailable(lang) {
      if (!supported) return false;
      // Voices may not have loaded yet — stay optimistic until we know.
      if (voices.length === 0) return true;
      return pickVoice(lang) !== undefined;
    },
  };
}

export const tts: TtsService = createWebSpeechTts();
