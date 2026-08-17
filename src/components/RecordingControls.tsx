import { useState } from 'react';
import { Button } from './Button';
import { LevelMeter } from './LevelMeter';
import { RestartIcon, StopIcon } from './icons';

interface RecordingControlsProps {
  /** Live analyser for the level meter (ignored in compact mode). */
  analyser: AnalyserNode | null;
  /** Elapsed recording time in ms; shown next to the "Recording" label when provided. */
  elapsedMs?: number;
  onStop: () => void;
  onRestart: () => void;
  /** Label on the Stop button (default "Stop"). */
  stopLabel?: string;
  /** Chip-style compact controls (used inline, e.g. the wizard's Test yourself chip). */
  compact?: boolean;
}

function formatMs(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

/**
 * Shared "actively recording" controls for every recording surface in the
 * app. Stop is always the big, one-tap primary action — never a mis-tap
 * risk. Restart is a small, quiet secondary action that asks for
 * confirmation before discarding anything: the recording keeps running the
 * whole time you're deciding, so Stop stays available and a stray tap can
 * never destroy a take mid-sentence.
 */
export function RecordingControls({
  analyser,
  elapsedMs,
  onStop,
  onRestart,
  stopLabel = 'Stop',
  compact = false,
}: RecordingControlsProps) {
  const [confirmingRestart, setConfirmingRestart] = useState(false);

  const restartControl = confirmingRestart ? (
    <div className={`flex items-center gap-2 ${compact ? '' : 'mt-2 justify-center'}`}>
      <span className={compact ? 'text-xs text-slate-500' : 'text-sm text-slate-500'}>
        Discard this take?
      </span>
      <button
        onClick={() => setConfirmingRestart(false)}
        className={`rounded-full bg-cream-100 font-semibold text-slate-600 active:bg-cream-200 ${
          compact ? 'px-2.5 py-1.5 text-xs' : 'px-3 py-1.5 text-sm'
        }`}
      >
        Keep recording
      </button>
      <button
        onClick={() => {
          setConfirmingRestart(false);
          onRestart();
        }}
        className={`flex items-center gap-1 rounded-full bg-blush-500 font-semibold text-white active:bg-blush-600 ${
          compact ? 'px-2.5 py-1.5 text-xs' : 'px-3 py-1.5 text-sm'
        }`}
      >
        <RestartIcon className="h-3.5 w-3.5" />
        Discard &amp; restart?
      </button>
    </div>
  ) : (
    <button
      onClick={() => setConfirmingRestart(true)}
      className={`flex items-center justify-center gap-1.5 font-semibold text-slate-400 active:text-slate-600 ${
        compact ? 'py-1.5 text-xs' : 'mt-2 w-full py-1.5 text-sm'
      }`}
    >
      <RestartIcon className={compact ? 'h-3.5 w-3.5' : 'h-4 w-4'} />
      Restart
    </button>
  );

  if (compact) {
    return (
      <div className="flex flex-col items-start gap-1.5">
        <button
          onClick={onStop}
          className="flex items-center gap-1.5 rounded-full bg-blush-100 px-3 py-2 text-sm font-semibold text-blush-600"
        >
          <StopIcon className="h-4 w-4" />
          <span className="h-2 w-2 animate-pulse rounded-full bg-blush-500" />
          {stopLabel}
        </button>
        {restartControl}
      </div>
    );
  }

  return (
    <div className="mt-3">
      <LevelMeter analyser={analyser} />
      <div className="mt-1 flex items-center justify-between px-1">
        <span className="flex items-center gap-1.5 text-sm font-semibold text-blush-600">
          <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-blush-500" />
          Recording
        </span>
        {elapsedMs !== undefined && (
          <span className="font-mono text-sm text-slate-500">{formatMs(elapsedMs)}</span>
        )}
      </div>
      <Button variant="danger" onClick={onStop} className="mt-3 w-full">
        <StopIcon />
        {stopLabel}
      </Button>
      {restartControl}
    </div>
  );
}
