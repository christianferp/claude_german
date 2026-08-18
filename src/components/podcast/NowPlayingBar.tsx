import type { PodcastLine } from '../../lib/types';
import { PauseIcon, PlayIcon } from '../icons';

interface NowPlayingBarProps {
  line: PodcastLine | undefined;
  currentTime: number;
  duration: number;
  playing: boolean;
  onToggle: () => void;
  onSeekTime: (seconds: number) => void;
  onSkip: (seconds: number) => void;
}

function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds)) return '0:00';
  const total = Math.max(0, Math.floor(seconds));
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
}

/**
 * Sticks to the top while the transcript scrolls, so the sentence being
 * spoken — and its translation — is always readable without chasing the
 * highlight. Also the transport: scrub anywhere, or skip 10s.
 */
export function NowPlayingBar({
  line,
  currentTime,
  duration,
  playing,
  onToggle,
  onSeekTime,
  onSkip,
}: NowPlayingBarProps) {
  return (
    <div className="sticky top-0 z-10 -mx-5 border-b border-cream-200 bg-cream-50/95 px-5 pb-3 pt-2 backdrop-blur">
      <p className="min-h-[3.5rem] text-lg font-bold leading-snug text-slate-800">{line?.de}</p>
      <p className="mt-0.5 text-sm text-slate-500">{line?.en}</p>

      <input
        type="range"
        min={0}
        max={Math.max(duration, 0.1)}
        step={0.1}
        value={Math.min(currentTime, duration || 0)}
        onChange={(event) => onSeekTime(Number(event.target.value))}
        aria-label="Seek"
        className="mt-3 h-1.5 w-full cursor-pointer appearance-none rounded-full bg-sage-100 accent-sage-500"
      />
      <div className="flex justify-between px-0.5 pt-1">
        <span className="font-mono text-xs text-slate-400">{formatTime(currentTime)}</span>
        <span className="font-mono text-xs text-slate-400">{formatTime(duration)}</span>
      </div>

      <div className="mt-1 flex items-center justify-center gap-5">
        <button
          onClick={() => onSkip(-10)}
          className="rounded-full px-2 py-1.5 text-sm font-semibold text-slate-500 active:bg-cream-100"
          aria-label="Back 10 seconds"
        >
          −10s
        </button>
        <button
          onClick={onToggle}
          className="flex h-12 w-12 items-center justify-center rounded-full bg-sage-500 text-white shadow-sm active:bg-sage-600"
          aria-label={playing ? 'Pause' : 'Play'}
        >
          {playing ? <PauseIcon /> : <PlayIcon />}
        </button>
        <button
          onClick={() => onSkip(10)}
          className="rounded-full px-2 py-1.5 text-sm font-semibold text-slate-500 active:bg-cream-100"
          aria-label="Forward 10 seconds"
        >
          +10s
        </button>
      </div>
    </div>
  );
}
