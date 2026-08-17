import { useMemo } from 'react';
import { localDateISO } from '../lib/dailyIndex';
import { describeAge, intervalDays, pickDueChallenge, type DueChallenge } from '../lib/recall';
import { useAppStore } from '../store/useAppStore';

export interface RecallChallengeState {
  challenge: DueChallenge;
  /** "yesterday", "5 days ago" — when it was mastered. */
  learnedAgo: string;
  streak: number;
  pass: () => void;
  miss: () => void;
  dismissToday: () => void;
  /** Days until this phrase comes back after the pass just recorded. */
  nextIntervalDays: number;
}

/**
 * The recall challenge to show today, or null when there is nothing due,
 * it was already handled today, or onboarding isn't finished.
 */
export function useRecallChallenge(): RecallChallengeState | null {
  const language = useAppStore((state) => state.language);
  const mastered = useAppStore((state) => state.mastered);
  const recall = useAppStore((state) => state.recall);
  const recallDone = useAppStore((state) => state.recallDone);
  const dailyPick = useAppStore((state) => state.dailyPick);
  const passRecall = useAppStore((state) => state.passRecall);
  const missRecall = useAppStore((state) => state.missRecall);
  const dismissRecallToday = useAppStore((state) => state.dismissRecallToday);

  const today = localDateISO();
  const handledToday = recallDone?.date === today;

  const challenge = useMemo(() => {
    if (!language || handledToday) return null;
    // Never challenge the phrase already on screen as today's phrase.
    return pickDueChallenge(mastered, recall, language, dailyPick?.phraseId ?? null, Date.now());
  }, [language, handledToday, mastered, recall, dailyPick]);

  if (!challenge) return null;
  const streak = challenge.record?.streak ?? 0;

  return {
    challenge,
    learnedAgo: describeAge(challenge.entry.masteredAt, Date.now()),
    streak,
    nextIntervalDays: intervalDays(streak + 1),
    pass: () => passRecall(challenge.phrase.id, today),
    miss: () => missRecall(challenge.phrase.id),
    dismissToday: () => dismissRecallToday(challenge.phrase.id, today),
  };
}
