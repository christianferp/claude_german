import { useCallback } from 'react';
import type { Phrase } from '../lib/types';
import { PHRASES } from '../data/phrases';
import { dailyPhraseIndex, localDateISO } from '../lib/dailyIndex';
import { useAppStore } from '../store/useAppStore';

const shuffleKey = (language: string, level: string) =>
  `${localDateISO()}:${language}:${level}`;

/** Today's phrase for the active language + level; null during onboarding. */
export function usePhraseOfTheDay(): Phrase | null {
  const language = useAppStore((state) => state.language);
  const level = useAppStore((state) =>
    state.language ? state.levels[state.language] : undefined,
  );
  const shuffle = useAppStore((state) => state.phraseShuffle);
  if (!language || !level) return null;
  const pool = PHRASES[language][level];
  const base = dailyPhraseIndex(localDateISO(), `${language}:${level}`, pool.length);
  // A manual "change phrase" click walks forward through the pool; the
  // offset is keyed to today, so stale offsets from other days are ignored.
  const offset = shuffle?.key === shuffleKey(language, level) ? shuffle.offset : 0;
  return pool[(base + offset) % pool.length];
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
