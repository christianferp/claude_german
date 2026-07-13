/**
 * Word-level tokenization shared by the memorization wizard (word masking)
 * and the pronunciation check (transcript comparison). Words keep their
 * umlauts/accents/ñ; punctuation (including Spanish ¿¡) and whitespace come
 * out as non-word tokens so they can always stay visible.
 */

export interface Token {
  /** Exact slice of the original text. */
  raw: string;
  isWord: boolean;
  /** 0-based index among word tokens only; -1 for non-word tokens. */
  wordIndex: number;
}

const WORD_PATTERN = /\p{L}[\p{L}\p{M}\p{N}'’-]*/gu;

export function tokenize(text: string): Token[] {
  const tokens: Token[] = [];
  let cursor = 0;
  let wordIndex = 0;
  for (const match of text.matchAll(WORD_PATTERN)) {
    const start = match.index;
    if (start > cursor) {
      tokens.push({ raw: text.slice(cursor, start), isWord: false, wordIndex: -1 });
    }
    tokens.push({ raw: match[0], isWord: true, wordIndex: wordIndex++ });
    cursor = start + match[0].length;
  }
  if (cursor < text.length) {
    tokens.push({ raw: text.slice(cursor), isWord: false, wordIndex: -1 });
  }
  return tokens;
}

export function wordsOf(text: string): string[] {
  return tokenize(text)
    .filter((token) => token.isWord)
    .map((token) => token.raw);
}

/** Lowercase, NFC, edge punctuation stripped, curly apostrophe normalized. */
export function normalizeWord(word: string): string {
  return word
    .normalize('NFC')
    .toLowerCase()
    .replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, '')
    .replace(/’/g, "'");
}

/** "für"→"fur", "años"→"anos", "ß"→"ss" — for sound-alike spelling matches. */
export function stripDiacritics(word: string): string {
  return word.replace(/ß/g, 'ss').normalize('NFD').replace(/\p{M}/gu, '');
}

/** Plain character-level edit distance. */
export function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  const m = a.length;
  const n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;
  let prev = Array.from({ length: n + 1 }, (_, j) => j);
  for (let i = 1; i <= m; i++) {
    const current = [i, ...new Array<number>(n)];
    for (let j = 1; j <= n; j++) {
      current[j] = Math.min(
        prev[j] + 1,
        current[j - 1] + 1,
        prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1),
      );
    }
    prev = current;
  }
  return prev[n];
}
