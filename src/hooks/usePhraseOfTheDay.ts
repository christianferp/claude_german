import { useCallback } from 'react';
import type { Phrase } from '../lib/types';
import { PHRASES } from '../data/phrases';
import { dailyPhraseIndex, localDateISO } from '../lib/dailyIndex';
import { useAppStore } from '../store/useAppStore';

const shuffleKey = (language: string, level: string) =>
  `${localDateISO()}:${language}:${level}`;

/**
 * Today's phrase for the active language + level; null during onboarding.
 *
 * Mastered phrases are retired from the rotation immediately — the moment a
 * phrase is marked as mastered (on this device or synced from another), the
 * next unmastered one takes its place. If the whole pool is mastered, the
 * full rotation returns rather than going blank.
 */
export function usePhraseOfTheDay(): Phrase | null {
  const language = useAppStore((state) => state.language);
  const level = useAppStore((state) =>
    state.language ? state.levels[state.language] : undefined,
  );
  const shuffle = useAppStore((state) => state.phraseShuffle);
  const mastered = useAppStore((state) => state.mastered);
  if (!language || !level) return null;

  const today = localDateISO();
  const pool = PHRASES[language][level];
  const eligible = pool.filter((phrase) => !mastered[phrase.id]);
  const rotation = eligible.length > 0 ? eligible : pool;

  const base = dailyPhraseIndex(today, `${language}:${level}`, rotation.length);
  // A manual "change phrase" click walks forward through the pool; the
  // offset is keyed to today, so stale offsets from other days are ignored.
  const offset = shuffle?.key === shuffleKey(language, level) ? shuffle.offset : 0;
  return rotation[(base + offset) % rotation.length];
}

/** Swap today's phrase for the next one in the pool. No-op before onboarding. */
export function useChangePhrase(): () => void {
  const language = useAppStore((state) => state.language);
  const level = useAppStore((state) =>
    state.language ? state.levels[state.language] : undefined,
  );
  const shufflePhrase = useAppStore((state) => state.shufflePhrase);
  return useCallback(() => {
    if (language && level) shufflePhrase(shuffleKey(language, level));
  }, [language, level, shufflePhrase]);
}
