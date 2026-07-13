/**
 * Deterministic word-hiding for the memorization wizard. Seeded by phrase id
 * so Back/Next and re-entering the wizard always hide the same words.
 */

import { tokenize } from './textTokens';

/** FNV-1a 32-bit. */
export function seedFromString(input: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

/** Tiny seeded PRNG — good enough for shuffling a dozen words. */
export function mulberry32(seed: number): () => number {
  let state = seed;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Pick ~40% of the words (≥3 letters preferred, never all of them) to hide
 * in the cloze stage. Returns word indices as produced by tokenize().
 */
export function pickHiddenWordIndices(text: string, phraseId: string): Set<number> {
  const words = tokenize(text).filter((token) => token.isWord);
  let candidates = words.filter((token) => [...token.raw].length >= 3);
  if (candidates.length === 0) candidates = words;

  const count = Math.min(
    Math.max(1, Math.round(candidates.length * 0.4)),
    Math.max(1, candidates.length - 1),
  );

  const random = mulberry32(seedFromString(phraseId));
  const shuffled = [...candidates];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return new Set(shuffled.slice(0, count).map((token) => token.wordIndex));
}

/** "Ärztin" → "Ä·····" (unicode-aware length). */
export function firstLetterMask(word: string): string {
  const chars = [...word];
  return chars[0] + '·'.repeat(Math.max(0, chars.length - 1));
}
