export type Language = 'de' | 'es';

export type Level = 'A1' | 'A2' | 'B1' | 'B2';

export const LEVELS: Level[] = ['A1', 'A2', 'B1', 'B2'];

/** One word or chunk of a phrase with its English gloss. */
export interface BreakdownItem {
  text: string;
  gloss: string;
  note?: string;
}

export interface Phrase {
  /** Stable id, e.g. "de-a1-03" — used as the IndexedDB key and store key. */
  id: string;
  language: Language;
  level: Level;
  /** The phrase in the target language. */
  text: string;
  /** English translation. */
  translation: string;
  breakdown: BreakdownItem[];
  pronunciationTips: string[];
}

export interface MasteredEntry {
  phraseId: string;
  masteredAt: number;
  /** Actual mime type of the stored recording (differs per browser). */
  recordingMime: string;
}

export type AppView = 'today' | 'library' | 'widget' | 'memorize' | 'practice' | 'podcast';

/** One spoken sentence of a podcast episode, with its translation. */
export interface PodcastLine {
  /** The sentence in the target language. */
  de: string;
  /** English translation. */
  en: string;
}

/** A glossary entry — the "new words" the episode deliberately repeats. */
export interface PodcastVocab {
  term: string;
  en: string;
}

/** A generated listening episode: one topic, one day, one level. */
export interface PodcastEpisode {
  /** `${language}-${level}-${dateISO}` — also the cache key. */
  id: string;
  title: string;
  /** English name of the topic, for the idle card. */
  topicEn: string;
  language: Language;
  level: Level;
  dateISO: string;
  lines: PodcastLine[];
  vocab: PodcastVocab[];
}

/** A word the learner tapped to study later. */
export interface VocabEntry {
  /** Normalized (lowercase) form — also the store key. */
  word: string;
  /** As it appeared in the text, for display. */
  display: string;
  /** Known when the word came from an episode glossary; empty otherwise. */
  translation: string;
  language: Language;
  savedAt: number;
  /** The sentence it was saved from, for context. */
  context: string;
}

export type RecorderStatus =
  | 'idle'
  | 'requesting'
  | 'recording'
  | 'reviewing'
  | 'denied'
  | 'unsupported'
  | 'error';
