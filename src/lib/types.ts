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

export type AppView = 'today' | 'library' | 'widget';

export type RecorderStatus =
  | 'idle'
  | 'requesting'
  | 'recording'
  | 'reviewing'
  | 'denied'
  | 'unsupported'
  | 'error';
