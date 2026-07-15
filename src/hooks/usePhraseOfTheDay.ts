import { useCallback, useEffect } from 'react';
import type { Phrase } from '../lib/types';
import { getPhraseById, PHRASES } from '../data/phrases';
import { dailyPhraseIndex, localDateISO } from '../lib/dailyIndex';
import { useAppStore } from '../store/useAppStore';

const shuffleKey = (language: string, level: string) =>
  `${localDateISO()}:${language}:${level}`;

/**
 * Today's phrase for the active language + level; null during onboarding.
 *
 * The pick is PINNED for the whole day: once chosen it stays on screen (and
 * in the lockscreen widget) even after being mastered — only the "Change
 * phrase" button re-picks, by clearing the pin. Candidates are always drawn
 * from the phrases the user has NOT mastered, so a mastered phrase never
 * comes back on a later day or while cycling; if the whole pool is mastered
 * the full rotation returns rather than going blank.
 */
export function usePhraseOfTheDay(): Phrase | null {
  const language = useAppStore((state) => state.language);
  const level = useAppStore((state) =>
    state.language ? state.levels[state.language] : undefined,
  );
  const shuffle = useAppStore((state) => state.phraseShuffle);
  const mastered = useAppStore((state) => state.mastered);
  const dailyPick = useAppStore((state) => state.dailyPick);
  const setDailyPick = useAppStore((state) => state.setDailyPick);

  const key = language && level ? shuffleKey(language, level) : null;

  let selected: Phrase | null = null;
  if (language && level && key) {
    // Valid pin for today → the phrase is locked in, mastered or not.
    const pinned = dailyPick?.key === key ? getPhraseById(dailyPick.phraseId) : undefined;
    if (pinned) {
      selected = pinned;
    } else {
      const pool = PHRASES[language][level];
      const eligible = pool.filter((phrase) => !mastered[phrase.id]);
      const rotation = eligible.length > 0 ? eligible : pool;
      const base = dailyPhraseIndex(localDateISO(), `${language}:${level}`, rotation.length);
      // A manual "change phrase" click walks forward through the pool; the
      // offset is keyed to today, so stale offsets from other days are ignored.
      const offset = shuffle?.key === key ? shuffle.offset : 0;
      selected = rotation[(base + offset) % rotation.length];
    }
  }

  // Persist the pin so the pick survives mastering, reloads and the widget.
  const selectedId = selected?.id ?? null;
  useEffect(() => {
    if (key && selectedId && (dailyPick?.key !== key || dailyPick.phraseId !== selectedId)) {
      setDailyPick({ key, phraseId: selectedId });
    }
  }, [key, selectedId, dailyPick, setDailyPick]);

  return selected;
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
