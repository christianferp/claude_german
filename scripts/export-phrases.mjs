/**
 * Emits the two data files the iOS widget extension needs, so the widget can
 * never drift from the app:
 *
 *   phrases.json  — id/text/translation per language+level, the minimum the
 *                   widget renders. Generated from src/data/phrases.ts, which
 *                   stays the single source of truth.
 *   hash-vectors.json — golden (dateISO, seedKey, poolSize) → index triples
 *                   from dailyPhraseIndex(). The widget reimplements that hash
 *                   in Swift; these let an XCTest prove the two agree instead
 *                   of assuming it. See the Int32 note below.
 *
 * Run via `npm run export-phrases` (part of `npm run ios:sync`).
 */

import { build } from 'esbuild';
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const outDir = join(root, 'ios/App/DailyPhraseWidget/Generated');
const tmpDir = join(root, 'node_modules/.cache/export-phrases');

/** Transpile a TS module and import it — the data lives in TypeScript. */
async function loadModule(entry, name) {
  mkdirSync(tmpDir, { recursive: true });
  const outfile = join(tmpDir, `${name}.mjs`);
  await build({
    entryPoints: [join(root, entry)],
    outfile,
    bundle: true,
    format: 'esm',
    platform: 'node',
    logLevel: 'silent',
  });
  return import(`${outfile}?t=${Date.now()}`);
}

const { PHRASES } = await loadModule('src/data/phrases.ts', 'phrases');
const { dailyPhraseIndex } = await loadModule('src/lib/dailyIndex.ts', 'dailyIndex');

// ── phrases.json ───────────────────────────────────────────────────────────
// Only the fields the widget draws. Breakdown and pronunciation tips are
// app-only, and keeping them out keeps the extension's bundle small.
const pools = {};
let phraseCount = 0;
for (const [language, levels] of Object.entries(PHRASES)) {
  pools[language] = {};
  for (const [level, phrases] of Object.entries(levels)) {
    pools[language][level] = phrases.map((phrase) => ({
      id: phrase.id,
      text: phrase.text,
      translation: phrase.translation,
    }));
    phraseCount += phrases.length;
  }
}

// ── hash-vectors.json ──────────────────────────────────────────────────────
// dailyPhraseIndex multiplies by 31 and coerces with `| 0` on every character,
// i.e. it wraps at 32 bits. Swift must use Int32 with &* / &+ to match; plain
// Int silently diverges once the running value exceeds 32 bits, which happens
// well inside a normal seed length. These vectors cover several months, both
// languages, all four levels, and pool sizes that exercise the modulo.
const vectors = [];
for (const language of Object.keys(PHRASES)) {
  for (const level of Object.keys(PHRASES[language])) {
    const poolSize = PHRASES[language][level].length;
    for (let dayOffset = 0; dayOffset < 40; dayOffset++) {
      // A fixed start date keeps this file stable across runs (no Date.now()).
      const date = new Date(Date.UTC(2026, 0, 1) + dayOffset * 86400000);
      const dateISO = date.toISOString().slice(0, 10);
      const seedKey = `${language}:${level}`;
      vectors.push({
        dateISO,
        seedKey,
        poolSize,
        expected: dailyPhraseIndex(dateISO, seedKey, poolSize),
      });
    }
  }
}

mkdirSync(outDir, { recursive: true });
writeFileSync(join(outDir, 'phrases.json'), `${JSON.stringify(pools, null, 2)}\n`);
writeFileSync(join(outDir, 'hash-vectors.json'), `${JSON.stringify(vectors, null, 2)}\n`);
rmSync(tmpDir, { recursive: true, force: true });

console.log(
  `export-phrases: ${phraseCount} phrases, ${vectors.length} hash vectors → ios/App/DailyPhraseWidget/Generated/`,
);
