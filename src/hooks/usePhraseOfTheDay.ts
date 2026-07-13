import type { Phrase } from '../lib/types';
import { PHRASES } from '../data/phrases';
import { dailyPhraseIndex, localDateISO } from '../lib/dailyIndex';
import { useAppStore } from '../store/useAppStore';

/** Today's phrase for the active language + level; null during onboarding. */
export function usePhraseOfTheDay(): Phrase | null {
  const language = useAppStore((state) => state.language);
  const level = useAppStore((state) =>
    state.language ? state.levels[state.language] : undefined,
  );
  if (!language || !level) return null;
  const pool = PHRASES[language][level];
  const index = dailyPhraseIndex(localDateISO(), `${language}:${level}`, pool.length);
  return pool[index];
}
