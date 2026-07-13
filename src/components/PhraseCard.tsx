import { useState } from 'react';
import type { Phrase } from '../lib/types';

export function PhraseCard({ phrase }: { phrase: Phrase }) {
  const [breakdownOpen, setBreakdownOpen] = useState(false);

  return (
    <section className="rounded-3xl bg-white p-6 shadow-sm">
      <p className="text-[1.7rem] font-bold leading-snug text-slate-800">{phrase.text}</p>
      <p className="mt-2 text-base text-slate-500">{phrase.translation}</p>

      {/* Conceptual / word-by-word breakdown */}
      <button
        onClick={() => setBreakdownOpen((open) => !open)}
        className="mt-4 flex items-center gap-1 text-sm font-semibold text-sage-600 active:text-sage-700"
        aria-expanded={breakdownOpen}
      >
        <span
          className={`inline-block transition-transform duration-150 ${breakdownOpen ? 'rotate-90' : ''}`}
        >
          ›
        </span>
        Word by word
      </button>
      {breakdownOpen && (
        <ul className="mt-3 space-y-2 border-l-2 border-sage-100 pl-4">
          {phrase.breakdown.map((item) => (
            <li key={item.text} className="text-sm">
              <span className="font-semibold text-slate-700">{item.text}</span>
              <span className="text-slate-500"> — {item.gloss}</span>
              {item.note && <p className="mt-0.5 text-xs text-slate-400">{item.note}</p>}
            </li>
          ))}
        </ul>
      )}

      {/* Pronunciation tips */}
      <div className="mt-5 rounded-2xl bg-sage-50 p-4">
        <p className="text-xs font-bold uppercase tracking-wide text-sage-600">
          Pronunciation tips
        </p>
        <ul className="mt-2 space-y-1.5">
          {phrase.pronunciationTips.map((tip) => (
            <li key={tip} className="flex gap-2 text-sm text-slate-600">
              <span className="text-sage-500">•</span>
              {tip}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
