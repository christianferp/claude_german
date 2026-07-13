import { useEffect, useRef, useState } from 'react';
import { useRecorder } from '../hooks/useRecorder';
import type { Phrase } from '../lib/types';
import { audioStorage } from '../services/audioStorage';
import { pushMastered } from '../services/backend';
import {
  checkPronunciation,
  PronunciationCheckError,
  type CheckErrorKind,
  type PronunciationResult,
} from '../services/pronunciationCheck';
import { useAppStore } from '../store/useAppStore';
import { AudioPlayButton } from './AudioPlayButton';
import { Button } from './Button';
import { LevelMeter } from './LevelMeter';
import { PronunciationResultCard } from './PronunciationResult';
import { CheckIcon, MicIcon, SpeakerIcon, StopIcon } from './icons';

const CHECK_ERROR_MESSAGES: Record<CheckErrorKind, string> = {
  quota: "Gemini's free quota is used up for now — try again later.",
  auth: 'Your Gemini API key was rejected — check it in Settings.',
  'no-speech': "We couldn't hear any speech — try again closer to the microphone.",
  network: 'You appear to be offline.',
  decode: "The check didn't work this time — you can still save your take.",
  other: "The check didn't work this time — you can still save your take.",
};

type CheckState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'done'; result: PronunciationResult }
  | { status: 'error'; message: string };

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
  const hasGeminiKey = useAppStore((state) => Boolean(state.geminiApiKey));
  const [check, setCheck] = useState<CheckState>({ status: 'idle' });
  const checkAbortRef = useRef<AbortController | null>(null);

  const { reset } = recorder;
  // A different phrase (new day, other library item) discards any take in flight.
  useEffect(() => {
    reset();
    checkAbortRef.current?.abort();
    setCheck({ status: 'idle' });
    return () => checkAbortRef.current?.abort();
  }, [phrase.id, reset]);

  // A new take invalidates the previous check result.
  useEffect(() => {
    if (recorder.status !== 'reviewing') setCheck({ status: 'idle' });
  }, [recorder.status]);

  const handleCheck = async () => {
    if (!recorder.blob) return;
    checkAbortRef.current?.abort();
    const controller = new AbortController();
    checkAbortRef.current = controller;
    setCheck({ status: 'loading' });
    try {
      const result = await checkPronunciation(recorder.blob, phrase, controller.signal);
      if (!controller.signal.aborted) setCheck({ status: 'done', result });
    } catch (err) {
      if (controller.signal.aborted) return;
      const message =
        err instanceof PronunciationCheckError
          ? CHECK_ERROR_MESSAGES[err.kind]
          : CHECK_ERROR_MESSAGES.other;
      setCheck({ status: 'error', message });
    }
  };

  const handleMarkMastered = async () => {
    if (!recorder.blob) return;
    setSaving(true);
    setSaveError(null);
    try {
      await audioStorage.saveRecording(phrase.id, recorder.blob);
      markMastered(phrase.id, recorder.blob.type);
      // Best-effort cloud sync — local save above is the source of truth.
      void pushMastered(
        { phraseId: phrase.id, masteredAt: Date.now(), recordingMime: recorder.blob.type },
        recorder.blob,
      ).catch(() => {});
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
          {hasGeminiKey && check.status !== 'done' && (
            <Button
              variant="secondary"
              onClick={() => void handleCheck()}
              disabled={check.status === 'loading'}
              className="w-full"
            >
              <SpeakerIcon />
              {check.status === 'loading' ? 'Checking…' : 'Check pronunciation'}
            </Button>
          )}
          {check.status === 'done' && <PronunciationResultCard phrase={phrase} result={check.result} />}
          {check.status === 'error' && <p className="text-sm text-blush-600">{check.message}</p>}
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
