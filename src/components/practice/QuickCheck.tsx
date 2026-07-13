import { useEffect, useRef, useState } from 'react';
import { useRecorder } from '../../hooks/useRecorder';
import type { Language } from '../../lib/types';
import {
  checkPronunciation,
  PronunciationCheckError,
  type PronunciationResult,
} from '../../services/pronunciationCheck';
import { useAppStore } from '../../store/useAppStore';
import { MicIcon, StopIcon } from '../icons';
import { PronunciationResultCard } from '../PronunciationResult';

interface QuickCheckProps {
  /** What the user is supposed to say — a chunk or the whole phrase. */
  text: string;
  language: Language;
}

/**
 * Lightweight "test yourself" recorder for the wizard's practice stages:
 * record → automatic pronunciation check → per-word verdict. Nothing is
 * saved; it exists purely for feedback. Rendered only with a Gemini key.
 */
export function QuickCheck({ text, language }: QuickCheckProps) {
  const hasGeminiKey = useAppStore((state) => Boolean(state.geminiApiKey));
  const recorder = useRecorder();
  const [result, setResult] = useState<PronunciationResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const { reset } = recorder;
  // Different target text (next chunk / next stage) → start over.
  useEffect(() => {
    reset();
    setResult(null);
    setError(null);
    abortRef.current?.abort();
    return () => abortRef.current?.abort();
  }, [text, reset]);

  const { status, blob } = recorder;
  useEffect(() => {
    if (status !== 'reviewing' || !blob) return;
    const controller = new AbortController();
    abortRef.current = controller;
    setResult(null);
    setError(null);
    checkPronunciation(blob, { text, language }, controller.signal)
      .then((res) => {
        if (!controller.signal.aborted) setResult(res);
      })
      .catch((err: unknown) => {
        if (controller.signal.aborted) return;
        setError(
          err instanceof PronunciationCheckError && err.kind === 'quota'
            ? "Gemini's free quota is used up for now."
            : "The check didn't work — you can keep practicing anyway.",
        );
      });
  }, [status, blob, text, language]);

  if (!hasGeminiKey) return null;

  return (
    <div className="mt-3">
      {status === 'idle' && !result && !error && (
        <button
          onClick={() => void recorder.start()}
          className="flex items-center gap-1.5 rounded-full bg-cream-100 px-3 py-2 text-sm font-semibold text-slate-600 active:bg-cream-200"
        >
          <MicIcon className="h-4 w-4" />
          Test yourself
        </button>
      )}
      {status === 'requesting' && (
        <p className="text-sm font-semibold text-slate-400">Waiting for microphone…</p>
      )}
      {status === 'recording' && (
        <button
          onClick={recorder.stop}
          className="flex items-center gap-1.5 rounded-full bg-blush-100 px-3 py-2 text-sm font-semibold text-blush-600"
        >
          <StopIcon className="h-4 w-4" />
          <span className="h-2 w-2 animate-pulse rounded-full bg-blush-500" />
          Stop
        </button>
      )}
      {status === 'reviewing' && !result && !error && (
        <p className="flex items-center gap-2 text-sm font-semibold text-slate-400">
          <span className="h-2 w-2 animate-pulse rounded-full bg-sage-500" />
          Checking…
        </p>
      )}
      {(result || error) && (
        <div className="space-y-2">
          {result && <PronunciationResultCard text={text} result={result} />}
          {error && <p className="text-sm text-blush-600">{error}</p>}
          <button
            onClick={() => {
              recorder.reset();
              setResult(null);
              setError(null);
            }}
            className="flex items-center gap-1.5 rounded-full bg-cream-100 px-3 py-2 text-sm font-semibold text-slate-600 active:bg-cream-200"
          >
            <MicIcon className="h-4 w-4" />
            Test again
          </button>
        </div>
      )}
      {(status === 'denied' || status === 'unsupported' || status === 'error') && (
        <p className="text-sm text-slate-400">
          Recording isn't available right now — you can keep practicing without it.
        </p>
      )}
    </div>
  );
}
