import { useEffect, useState } from 'react';
import { useRecorder } from '../hooks/useRecorder';
import type { Phrase } from '../lib/types';
import { audioStorage } from '../services/audioStorage';
import { useAppStore } from '../store/useAppStore';
import { AudioPlayButton } from './AudioPlayButton';
import { Button } from './Button';
import { LevelMeter } from './LevelMeter';
import { CheckIcon, MicIcon, StopIcon } from './icons';

function formatMs(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

interface RecordPanelProps {
  phrase: Phrase;
  /** Called after a take was saved (used by Library to collapse re-record). */
  onMastered?: () => void;
}

/**
 * The full practice flow for one phrase:
 * record → stop & review → mark as mastered (saves the take to IndexedDB).
 */
export function RecordPanel({ phrase, onMastered }: RecordPanelProps) {
  const recorder = useRecorder();
  const markMastered = useAppStore((state) => state.markMastered);
  const alreadyMastered = useAppStore((state) => Boolean(state.mastered[phrase.id]));
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const { reset } = recorder;
  // A different phrase (new day, other library item) discards any take in flight.
  useEffect(() => {
    reset();
  }, [phrase.id, reset]);

  const handleMarkMastered = async () => {
    if (!recorder.blob) return;
    setSaving(true);
    setSaveError(null);
    try {
      await audioStorage.saveRecording(phrase.id, recorder.blob);
      markMastered(phrase.id, recorder.blob.type);
      recorder.reset();
      onMastered?.();
    } catch {
      setSaveError("The recording couldn't be saved — your browser may be blocking storage.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="rounded-3xl bg-white p-5 shadow-sm">
      <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Practice</p>

      {recorder.status === 'idle' && (
        <Button onClick={() => void recorder.start()} className="mt-3 w-full">
          <MicIcon />
          {alreadyMastered ? 'Re-record your pronunciation' : 'Record your pronunciation'}
        </Button>
      )}

      {recorder.status === 'requesting' && (
        <Button disabled className="mt-3 w-full">
          <MicIcon />
          Waiting for microphone…
        </Button>
      )}

      {recorder.status === 'recording' && (
        <div className="mt-3">
          <LevelMeter analyser={recorder.analyser} />
          <div className="mt-1 flex items-center justify-between px-1">
            <span className="flex items-center gap-1.5 text-sm font-semibold text-blush-600">
              <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-blush-500" />
              Recording
            </span>
            <span className="font-mono text-sm text-slate-500">{formatMs(recorder.elapsedMs)}</span>
          </div>
          <Button variant="danger" onClick={recorder.stop} className="mt-3 w-full">
            <StopIcon />
            Stop &amp; Review
          </Button>
        </div>
      )}

      {recorder.status === 'reviewing' && (
        <div className="mt-3 space-y-3">
          <AudioPlayButton src={recorder.blobUrl} label="Play your take" />
          <div className="flex gap-2">
            <Button variant="secondary" onClick={recorder.reset} className="flex-1">
              Try again
            </Button>
            <Button onClick={() => void handleMarkMastered()} disabled={saving} className="flex-1">
              <CheckIcon />
              {saving ? 'Saving…' : alreadyMastered ? 'Save new take' : 'Mark as Mastered'}
            </Button>
          </div>
          {saveError && <p className="text-sm text-blush-600">{saveError}</p>}
        </div>
      )}

      {recorder.status === 'denied' && (
        <div className="mt-3 rounded-2xl bg-blush-100 p-4">
          <p className="text-sm font-semibold text-slate-700">Microphone access was denied.</p>
          <p className="mt-1 text-sm text-slate-500">
            Allow the microphone for this site in your browser settings (usually the icon next to
            the address bar), then try again.
          </p>
          <Button variant="secondary" onClick={() => void recorder.start()} className="mt-3 w-full">
            Try again
          </Button>
        </div>
      )}

      {recorder.status === 'unsupported' && (
        <div className="mt-3 rounded-2xl bg-cream-100 p-4">
          <p className="text-sm text-slate-600">
            This browser doesn't support audio recording. Try a recent version of Chrome, Edge,
            Firefox or Safari — and note that recording requires a secure (HTTPS or localhost)
            connection.
          </p>
        </div>
      )}

      {recorder.status === 'error' && (
        <div className="mt-3 rounded-2xl bg-blush-100 p-4">
          <p className="text-sm text-slate-600">{recorder.error ?? 'Something went wrong.'}</p>
          <Button variant="secondary" onClick={() => void recorder.start()} className="mt-3 w-full">
            Try again
          </Button>
        </div>
      )}
    </section>
  );
}
