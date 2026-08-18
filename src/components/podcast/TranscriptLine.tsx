import { useEffect, useRef } from 'react';
import { normalizeWord, tokenize } from '../../lib/textTokens';
import type { PodcastLine } from '../../lib/types';
import { PlayIcon } from '../icons';

interface TranscriptLineProps {
  line: PodcastLine;
  index: number;
  active: boolean;
  /** Normalized words already saved — rendered as such wherever they appear. */
  savedWords: Set<string>;
  onWordTap: (display: string, context: string, contextEn: string) => void;
  /** Absent until the audio is built — there is nowhere to seek to yet. */
  onSeek?: (index: number) => void;
}

/**
 * One sentence of the transcript: the target language large, its English
 * translation smaller underneath. Every word is its own button so a tap
 * saves it to "My words"; the play affordance on the left seeks playback
 * here, kept separate so word taps and seek taps never fight.
 */
export function TranscriptLine({
  line,
  index,
  active,
  savedWords,
  onWordTap,
  onSeek,
}: TranscriptLineProps) {
  const ref = useRef<HTMLLIElement>(null);

  // Follow the audio: keep whatever is being spoken in view.
  useEffect(() => {
    if (active) ref.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [active]);

  return (
    <li
      ref={ref}
      className={`flex gap-2 rounded-2xl px-2 py-2 transition-colors ${
        active ? 'bg-sage-100' : ''
      }`}
    >
      {onSeek ? (
        <button
          onClick={() => onSeek(index)}
          className={`mt-1 h-6 w-6 shrink-0 rounded-full p-1 transition-colors ${
            active ? 'text-sage-700' : 'text-slate-300 active:text-sage-600'
          }`}
          aria-label={`Play from sentence ${index + 1}`}
        >
          <PlayIcon className="h-4 w-4" />
        </button>
      ) : (
        <span className="mt-1 h-6 w-6 shrink-0" aria-hidden="true" />
      )}

      <div className="min-w-0 flex-1">
        <p className={`leading-snug ${active ? 'font-bold text-slate-800' : 'text-slate-700'}`}>
          {tokenize(line.de).map((token, i) => {
            if (!token.isWord) return <span key={i}>{token.raw}</span>;
            const saved = savedWords.has(normalizeWord(token.raw));
            return (
              <button
                key={i}
                onClick={() => onWordTap(token.raw, line.de, line.en)}
                className={`rounded transition-colors ${
                  saved
                    ? 'bg-sage-200/70 font-semibold text-sage-800 underline decoration-sage-500 decoration-2 underline-offset-2'
                    : 'active:bg-sage-200'
                }`}
              >
                {token.raw}
              </button>
            );
          })}
        </p>
        <p className="mt-0.5 text-sm text-slate-400">{line.en}</p>
      </div>
    </li>
  );
}
