import { useCallback, useEffect, useRef, useState } from 'react';
import type { Language } from '../lib/types';
import {
  checkPronunciation,
  PronunciationCheckError,
  type PronunciationResult,
} from '../services/pronunciationCheck';
import { useRecorder, type UseRecorder } from './useRecorder';

/**
 * "Say this text and I'll tell you how it went": record → automatic
 * pronunciation check → per-word result. Shared by the wizard's per-stage
 * Test yourself chip and the daily recall challenge.
 *
 * Nothing is persisted — this is feedback only.
 */

export type SpokenCheckStatus = 'idle' | 'recording' | 'checking' | 'done' | 'error';

export interface UseSpokenCheck {
  recorder: UseRecorder;
  status: SpokenCheckStatus;
  result: PronunciationResult | null;
  error: string | null;
  start: () => void;
  stop: () => void;
  /** Discard the take and result, back to idle. */
  reset: () => void;
}

export function useSpokenCheck(text: string, language: Language): UseSpokenCheck {
  const recorder = useRecorder();
  const [result, setResult] = useState<PronunciationResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const { reset: resetRecorder, status: recorderStatus, blob } = recorder;

  const reset = useCallback(() => {
    abortRef.current?.abort();
    resetRecorder();
    setResult(null);
    setError(null);
  }, [resetRecorder]);

  // A different target text (next chunk, next challenge) starts over.
  useEffect(() => {
    reset();
    return () => abortRef.current?.abort();
  }, [text, reset]);

  // Check as soon as a take is ready — no extra tap.
  useEffect(() => {
    if (recorderStatus !== 'reviewing' || !blob) return;
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
            : "The check didn't work this time.",
        );
      });
  }, [recorderStatus, blob, text, language]);

  let status: SpokenCheckStatus = 'idle';
  if (error) status = 'error';
  else if (result) status = 'done';
  else if (recorderStatus === 'reviewing') status = 'checking';
  else if (recorderStatus === 'recording' || recorderStatus === 'requesting') status = 'recording';
  else if (recorderStatus === 'denied' || recorderStatus === 'unsupported' || recorderStatus === 'error') {
    status = 'error';
  }

  return {
    recorder,
    status,
    result,
    error:
      error ??
      (recorderStatus === 'denied'
        ? 'Microphone access was denied.'
        : recorderStatus === 'unsupported'
          ? "This browser can't record audio."
          : recorderStatus === 'error'
            ? (recorder.error ?? 'Recording failed.')
            : null),
    start: () => void recorder.start(),
    stop: recorder.stop,
    reset,
  };
}
