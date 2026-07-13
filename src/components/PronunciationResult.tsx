import { tokenize } from '../lib/textTokens';
import type { Phrase } from '../lib/types';
import type { PronunciationResult as Result, WordVerdict } from '../services/pronunciationCheck';

const VERDICT_CLASSES: Record<WordVerdict, string> = {
  match: 'text-sage-700',
  close: 'text-amber-600 underline decoration-dotted underline-offset-4',
  missed: 'text-blush-600 underline decoration-dotted underline-offset-4',
};

function headline(result: Result): string {
  const clear = result.words.filter((w) => w.verdict !== 'missed').length;
  if (result.score >= 0.99) return 'Perfect — every word came through!';
  if (result.score >= 0.7) return `Nearly there — ${clear} of ${result.words.length} words clear.`;
  return `Keep practicing — ${clear} of ${result.words.length} words clear.`;
}

/** The expected phrase re-rendered with per-word verdict colors. */
export function PronunciationResultCard({ phrase, result }: { phrase: Phrase; result: Result }) {
  return (
    <div className="rounded-2xl bg-cream-100 p-4">
      <p className="text-sm font-bold text-slate-700">{headline(result)}</p>
      <p className="mt-2 text-lg font-bold leading-snug">
        {tokenize(phrase.text).map((token, i) => {
          if (!token.isWord) return <span key={i} className="text-slate-800">{token.raw}</span>;
          const verdict = result.words[token.wordIndex]?.verdict ?? 'missed';
          return (
            <span key={i} className={VERDICT_CLASSES[verdict]}>
              {token.raw}
            </span>
          );
        })}
      </p>
      <p className="mt-2 text-xs text-slate-400">
        We heard: “{result.transcript}”
        {result.extraWordCount > 0 &&
          ` — plus ${result.extraWordCount} extra ${result.extraWordCount === 1 ? 'word' : 'words'}`}
      </p>
    </div>
  );
}
