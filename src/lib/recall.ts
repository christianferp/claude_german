/**
 * Spaced repetition for the "Do you still remember?" challenge.
 *
 * Mastering a phrase used to be one-shot; this brings phrases back on a
 * widening schedule so they actually stick. Pure functions only — the store
 * holds the records, the UI holds the presentation.
 */

import type { Language, MasteredEntry, Phrase } from './types';
import { PHRASES } from '../data/phrases';

export interface RecallRecord {
  /** Consecutive successful recalls; reset to 0 on a miss. */
  streak: number;
  lastRecallAt: number;
  nextDueAt: number;
}

const DAY_MS = 24 * 60 * 60 * 1000;

/** Days until the next challenge, indexed by the streak just achieved. */
const INTERVALS_DAYS = [1, 3, 7, 16, 35];

/** Interval after reaching `streak` successful recalls (last value repeats). */
export function intervalDays(streak: number): number {
  if (streak <= 0) return 1;
  return INTERVALS_DAYS[Math.min(streak, INTERVALS_DAYS.length) - 1];
}

export function afterPass(existing: RecallRecord | undefined, now: number): RecallRecord {
  const streak = (existing?.streak ?? 0) + 1;
  return { streak, lastRecallAt: now, nextDueAt: now + intervalDays(streak) * DAY_MS };
}

export function afterMiss(now: number): RecallRecord {
  return { streak: 0, lastRecallAt: now, nextDueAt: now + DAY_MS };
}

/**
 * When a phrase first becomes challengeable: a day after it was mastered.
 * So the phrase you learned most recently is the first one to come back.
 */
function dueAt(entry: MasteredEntry, record: RecallRecord | undefined): number {
  return record ? record.nextDueAt : entry.masteredAt + DAY_MS;
}

export interface DueChallenge {
  phrase: Phrase;
  entry: MasteredEntry;
  record: RecallRecord | undefined;
}

/**
 * The phrase to challenge right now: the most overdue one, tie-broken by
 * most recently mastered. Only the active language, never the phrase already
 * on screen as today's phrase. Null when nothing is due.
 */
export function pickDueChallenge(
  mastered: Record<string, MasteredEntry>,
  recall: Record<string, RecallRecord>,
  language: Language,
  excludePhraseId: string | null,
  now: number,
): DueChallenge | null {
  const byId = new Map(
    Object.values(PHRASES[language])
      .flat()
      .map((phrase) => [phrase.id, phrase] as const),
  );

  let best: (DueChallenge & { due: number }) | null = null;
  for (const entry of Object.values(mastered)) {
    if (entry.phraseId === excludePhraseId) continue;
    const phrase = byId.get(entry.phraseId);
    if (!phrase) continue; // other language, or an id no longer in the pool
    const record = recall[entry.phraseId];
    const due = dueAt(entry, record);
    if (due > now) continue;
    if (
      !best ||
      due < best.due ||
      (due === best.due && entry.masteredAt > best.entry.masteredAt)
    ) {
      best = { phrase, entry, record, due };
    }
  }
  return best ? { phrase: best.phrase, entry: best.entry, record: best.record } : null;
}

/** "today" / "yesterday" / "5 days ago" — the challenge card's subtitle. */
export function describeAge(timestamp: number, now: number): string {
  const days = Math.floor((now - timestamp) / DAY_MS);
  if (days <= 0) return 'today';
  if (days === 1) return 'yesterday';
  if (days < 30) return `${days} days ago`;
  const months = Math.round(days / 30);
  return months <= 1 ? 'a month ago' : `${months} months ago`;
}
