import { useState } from 'react';
import { Button } from './Button';
import { LevelMeter } from './LevelMeter';
import { StopIcon, TrashIcon } from './icons';

interface RecordingControlsProps {
  /** Live analyser for the level meter (ignored in compact mode). */
  analyser: AnalyserNode | null;
  /** Elapsed recording time in ms; shown next to the "Recording" label when provided. */
  elapsedMs?: number;
  onStop: () => void;
  /** Discard the current take and return to idle — the user starts the next take themselves. */
  onDiscard: () => void;
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
 * risk. Discard is a small, quiet secondary action that asks for
 * confirmation before doing anything: the recording keeps running the whole
 * time you're deciding, so Stop stays available and a stray tap can never
 * destroy a take mid-sentence. Confirming lands back on the idle "Record"
 * button — it never restarts recording automatically.
 */
export function RecordingControls({
  analyser,
  elapsedMs,
  onStop,
  onDiscard,
  stopLabel = 'Stop',
  compact = false,
}: RecordingControlsProps) {
  const [confirming, setConfirming] = useState(false);

  const discardControl = confirming ? (
    <div className={`flex items-center gap-2 ${compact ? '' : 'mt-2 justify-center'}`}>
      <span className={compact ? 'text-xs text-slate-500' : 'text-sm text-slate-500'}>
        Discard this take?
      </span>
      <button
        onClick={() => setConfirming(false)}
        className={`rounded-full bg-cream-100 font-semibold text-slate-600 active:bg-cream-200 ${
          compact ? 'px-2.5 py-1.5 text-xs' : 'px-3 py-1.5 text-sm'
        }`}
      >
        Keep recording
      </button>
      <button
        onClick={() => {
          setConfirming(false);
          onDiscard();
        }}
        className={`flex items-center gap-1 rounded-full bg-blush-500 font-semibold text-white active:bg-blush-600 ${
          compact ? 'px-2.5 py-1.5 text-xs' : 'px-3 py-1.5 text-sm'
        }`}
      >
        <TrashIcon className="h-3.5 w-3.5" />
        Discard
      </button>
    </div>
  ) : (
    <button
      onClick={() => setConfirming(true)}
      className={`flex items-center justify-center gap-1.5 font-semibold text-slate-400 active:text-slate-600 ${
        compact ? 'py-1.5 text-xs' : 'mt-2 w-full py-1.5 text-sm'
      }`}
    >
      <TrashIcon className={compact ? 'h-3.5 w-3.5' : 'h-4 w-4'} />
      Discard
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
        {discardControl}
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
      {discardControl}
    </div>
  );
}
