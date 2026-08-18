import { useState } from 'react';
import type { VocabEntry } from '../lib/types';
import { useAppStore } from '../store/useAppStore';
import { CloseIcon } from './icons';

/**
 * Words the learner tapped in a podcast transcript. Collapsed to a chip
 * grid so a long list never buries the mastered phrases below it; tapping a
 * chip expands its translation and the sentence it came from.
 */
export function SavedWords() {
  const savedVocab = useAppStore((state) => state.savedVocab);
  const removeVocab = useAppStore((state) => state.removeVocab);
  const [expanded, setExpanded] = useState<string | null>(null);

  const words: VocabEntry[] = Object.values(savedVocab).sort((a, b) => b.savedAt - a.savedAt);
  if (words.length === 0) return null;

  return (
    <section className="mb-5">
      <p className="pb-2 text-xs font-bold uppercase tracking-wide text-slate-400">
        My words · {words.length}
      </p>
      <div className="rounded-3xl bg-white p-4 shadow-sm">
        <ul className="flex flex-wrap gap-2">
          {words.map((entry) => (
            <li key={entry.word}>
              <button
                onClick={() => setExpanded((open) => (open === entry.word ? null : entry.word))}
                className={`flex items-center gap-1.5 rounded-full px-3 py-2 text-sm font-semibold transition-colors ${
                  expanded === entry.word
                    ? 'bg-sage-500 text-white'
                    : 'bg-sage-50 text-sage-700 active:bg-sage-100'
                }`}
                aria-expanded={expanded === entry.word}
              >
                {entry.display}
              </button>
            </li>
          ))}
        </ul>

        {expanded && savedVocab[expanded] && (
          <div className="mt-3 rounded-2xl bg-cream-100 p-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-bold text-slate-800">{savedVocab[expanded].display}</p>
                {savedVocab[expanded].translation ? (
                  <p className="mt-0.5 text-sm text-slate-600">
                    {savedVocab[expanded].translation}
                  </p>
                ) : (
                  <p className="mt-0.5 text-sm italic text-slate-400">
                    No translation saved — you tapped this one in the transcript.
                  </p>
                )}
              </div>
              <button
                onClick={() => {
                  removeVocab(expanded);
                  setExpanded(null);
                }}
                className="shrink-0 rounded-full p-1.5 text-slate-400 active:bg-cream-200"
                aria-label={`Remove "${savedVocab[expanded].display}" from my words`}
              >
                <CloseIcon className="h-4 w-4" />
              </button>
            </div>
            {savedVocab[expanded].context && (
              <p className="mt-2 border-l-2 border-sage-200 pl-2 text-xs italic text-slate-500">
                {savedVocab[expanded].context}
              </p>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
