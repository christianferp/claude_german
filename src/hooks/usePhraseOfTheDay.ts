import { useCallback } from 'react';
import type { Phrase } from '../lib/types';
import { PHRASES } from '../data/phrases';
import { dailyPhraseIndex, localDateISO } from '../lib/dailyIndex';
import { useAppStore } from '../store/useAppStore';

function overrideKey(language: string, level: string): string {
  return `${language}:${level}:${localDateISO()}`;
}

/**
 * Today's phrase for the active language + level; null during onboarding.
 * A shuffled pick (see useShufflePhrase) takes precedence over the
 * deterministic daily phrase for the rest of the day.
 */
export function usePhraseOfTheDay(): Phrase | null {
  const language = useAppStore((state) => state.language);
  const level = useAppStore((state) =>
    state.language ? state.levels[state.language] : undefined,
  );
  const overrideId = useAppStore((state) =>
    state.language && level
      ? state.phraseOverrides[overrideKey(state.language, level)]
      : undefined,
  );
  if (!language || !level) return null;
  const pool = PHRASES[language][level];

  const override = overrideId ? pool.find((phrase) => phrase.id === overrideId) : undefined;
  if (override) return override;

  const index = dailyPhraseIndex(localDateISO(), `${language}:${level}`, pool.length);
  return pool[index] ?? null;
}

/**
 * Returns a callback that swaps today's phrase for a random different one
 * from the same language + level pool ("don't like it? give me another").
 */
export function useShufflePhrase(current: Phrase | null): () => void {
  const setPhraseOverride = useAppStore((state) => state.setPhraseOverride);
  return useCallback(() => {
    if (!current) return;
    const pool = PHRASES[current.language][current.level];
    const others = pool.filter((phrase) => phrase.id !== current.id);
    if (others.length === 0) return;
    const next = others[Math.floor(Math.random() * others.length)]!;
    setPhraseOverride(overrideKey(current.language, current.level), next.id);
  }, [current, setPhraseOverride]);
}
