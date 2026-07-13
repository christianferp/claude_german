/** Local calendar date as YYYY-MM-DD (sv-SE locale formats exactly that way). */
export function localDateISO(now: Date = new Date()): string {
  return now.toLocaleDateString('sv-SE');
}

/**
 * Deterministic "phrase of the day" index: same date + language/level seed
 * always yields the same phrase, so it is stable across refreshes and flips
 * at the user's local midnight. Different levels/languages get different
 * phrases on the same day.
 */
export function dailyPhraseIndex(dateISO: string, seedKey: string, poolSize: number): number {
  const seed = `${dateISO}:${seedKey}`;
  let h = 0;
  for (let i = 0; i < seed.length; i++) {
    h = (h * 31 + seed.charCodeAt(i)) | 0;
  }
  return Math.abs(h) % poolSize;
}
