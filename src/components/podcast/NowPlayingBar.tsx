import type { PodcastLine } from '../../lib/types';
import { PauseIcon, PlayIcon } from '../icons';

interface NowPlayingBarProps {
  line: PodcastLine;
  position: number;
  total: number;
  playing: boolean;
  onToggle: () => void;
  onPrev: () => void;
  onNext: () => void;
}

/**
 * Sticks to the top while the transcript scrolls, so the sentence being
 * spoken — and its translation — is always readable without hunting for
 * the highlight. Doubles as the transport controls.
 */
export function NowPlayingBar({
  line,
  position,
  total,
  playing,
  onToggle,
  onPrev,
  onNext,
}: NowPlayingBarProps) {
  return (
    <div className="sticky top-0 z-10 -mx-5 border-b border-cream-200 bg-cream-50/95 px-5 pb-3 pt-2 backdrop-blur">
      <div className="h-1 overflow-hidden rounded-full bg-sage-100">
        <div
          className="h-full rounded-full bg-sage-500 transition-all duration-300"
          style={{ width: `${((position + 1) / Math.max(total, 1)) * 100}%` }}
        />
      </div>

      <p className="mt-2 text-lg font-bold leading-snug text-slate-800">{line.de}</p>
      <p className="mt-0.5 text-sm text-slate-500">{line.en}</p>

      <div className="mt-2 flex items-center gap-3">
        <button
          onClick={onToggle}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-sage-500 text-white shadow-sm active:bg-sage-600"
          aria-label={playing ? 'Pause' : 'Play'}
        >
          {playing ? <PauseIcon /> : <PlayIcon />}
        </button>
        <button
          onClick={onPrev}
          disabled={position === 0}
          className="rounded-full px-3 py-2 text-sm font-semibold text-slate-500 active:bg-cream-100 disabled:text-slate-300"
        >
          ‹ Back
        </button>
        <button
          onClick={onNext}
          disabled={position >= total - 1}
          className="rounded-full px-3 py-2 text-sm font-semibold text-slate-500 active:bg-cream-100 disabled:text-slate-300"
        >
          Next ›
        </button>
        <span className="ml-auto font-mono text-xs text-slate-400">
          {position + 1}/{total}
        </span>
      </div>
    </div>
  );
}
