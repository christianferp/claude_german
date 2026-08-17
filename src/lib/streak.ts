/**
 * Daily practice streak, with "freeze" protections so a single missed day
 * doesn't erase weeks of progress. Pure functions only — the store holds the
 * record, the UI holds the presentation (see StreakBanner.tsx).
 */

export interface DailyStreak {
  /** Consecutive days practiced, as of `lastDate`. */
  current: number;
  best: number;
  /** Local YYYY-MM-DD of the last day counted; null before the first day. */
  lastDate: string | null;
  /** Banked "skip a day for free" tokens. */
  freezes: number;
}

export const INITIAL_STREAK: DailyStreak = { current: 0, best: 0, lastDate: null, freezes: 0 };

const MAX_FREEZES = 2;
const FREEZE_EVERY_DAYS = 10;

/** Integer day difference b − a for two local YYYY-MM-DD dates. */
function daysBetween(a: string, b: string): number {
  const toTime = (d: string) => new Date(`${d}T00:00:00`).getTime();
  return Math.round((toTime(b) - toTime(a)) / (24 * 60 * 60 * 1000));
}

/**
 * Record that the user practiced on `today` (a recall challenge or a
 * Practice-tab drill was answered, correctly or not — showing up is what
 * counts). Idempotent within a day.
 *
 * A gap of missed days is covered by spending one freeze per missed day, if
 * enough are banked; otherwise the streak resets to 1. A freeze is earned
 * every 10th consecutive day, capped at two banked at once.
 */
export function recordPracticeDay(streak: DailyStreak, today: string): DailyStreak {
  if (streak.lastDate === today) return streak;

  let current: number;
  let freezes = streak.freezes;

  if (streak.lastDate === null) {
    current = 1;
  } else {
    const missedDays = daysBetween(streak.lastDate, today) - 1;
    if (missedDays <= 0) {
      current = streak.current + 1;
    } else if (freezes >= missedDays) {
      freezes -= missedDays;
      current = streak.current + 1;
    } else {
      current = 1;
    }
  }

  if (current > 0 && current % FREEZE_EVERY_DAYS === 0 && freezes < MAX_FREEZES) {
    freezes += 1;
  }

  return { current, best: Math.max(streak.best, current), lastDate: today, freezes };
}

export interface StreakStatus {
  /** What the banner should show as "the streak" — 0 once it has lapsed. */
  current: number;
  /** Whether the streak is still alive (has not lapsed beyond its freezes). */
  alive: boolean;
  /** Alive, but today hasn't been practiced yet — the "don't lose it" moment. */
  atRisk: boolean;
  freezes: number;
}

/**
 * Merge streak records synced from two devices: whichever was updated more
 * recently wins outright (local wins ties, to avoid needless churn) — dates
 * compare lexicographically since they're YYYY-MM-DD.
 */
export function mergeDailyStreak(local: DailyStreak, remote: DailyStreak): DailyStreak {
  if (!remote.lastDate) return local;
  if (!local.lastDate) return remote;
  return remote.lastDate > local.lastDate ? remote : local;
}

/**
 * Display-only read of the streak as of `today` — never mutates anything.
 * If the gap since `lastDate` already exceeds the banked freezes, this
 * reports the streak as lapsed even though `recordPracticeDay` hasn't
 * formally reset it yet (that happens the next time it's called).
 */
export function streakStatus(streak: DailyStreak, today: string): StreakStatus {
  if (streak.lastDate === null) {
    return { current: 0, alive: false, atRisk: false, freezes: streak.freezes };
  }
  if (streak.lastDate === today) {
    return { current: streak.current, alive: true, atRisk: false, freezes: streak.freezes };
  }
  const missedDays = daysBetween(streak.lastDate, today) - 1;
  const alive = missedDays <= streak.freezes;
  return {
    current: alive ? streak.current : 0,
    alive,
    atRisk: alive,
    freezes: streak.freezes,
  };
}
