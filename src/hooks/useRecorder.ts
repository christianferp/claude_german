import { useCallback, useEffect, useRef, useState } from 'react';
import type { RecorderStatus } from '../lib/types';

/**
 * Preferred container/codec per browser. Safari only supports audio/mp4
 * (AAC); Chromium and Firefox prefer webm/opus. The actual mime the
 * recorder settles on is persisted with each recording — never hardcode it.
 */
const MIME_CANDIDATES = [
  'audio/webm;codecs=opus',
  'audio/webm',
  'audio/mp4',
  'audio/ogg;codecs=opus',
];

function pickMimeType(): string | undefined {
  if (typeof MediaRecorder === 'undefined' || !MediaRecorder.isTypeSupported) return undefined;
  return MIME_CANDIDATES.find((candidate) => MediaRecorder.isTypeSupported(candidate));
}

export interface UseRecorder {
  status: RecorderStatus;
  /** Ask for the mic and start recording. */
  start: () => Promise<void>;
  /** Stop recording and move to the review state. */
  stop: () => void;
  /** Discard the current take and return to idle. */
  reset: () => void;
  /** The finished take, available in the 'reviewing' state. */
  blob: Blob | null;
  /** Object URL for the finished take (revoked automatically). */
  blobUrl: string | null;
  /** Live analyser while recording — feeds the level-meter visual. */
  analyser: AnalyserNode | null;
  elapsedMs: number;
  error: string | null;
}

export function useRecorder(): UseRecorder {
  const [status, setStatus] = useState<RecorderStatus>('idle');
  const [blob, setBlob] = useState<Blob | null>(null);
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [analyser, setAnalyser] = useState<AnalyserNode | null>(null);
  const [elapsedMs, setElapsedMs] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<number | null>(null);
  const urlRef = useRef<string | null>(null);

  /** Tear down mic capture: stream tracks (kills the browser's recording
      indicator), audio context, timer. Does not touch the reviewed blob. */
  const cleanupCapture = useCallback(() => {
    if (timerRef.current !== null) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    void audioCtxRef.current?.close().catch(() => {});
    audioCtxRef.current = null;
    recorderRef.current = null;
    setAnalyser(null);
  }, []);

  const revokeUrl = useCallback(() => {
    if (urlRef.current) {
      URL.revokeObjectURL(urlRef.current);
      urlRef.current = null;
    }
    setBlobUrl(null);
  }, []);

  const reset = useCallback(() => {
    cleanupCapture();
    revokeUrl();
    setBlob(null);
    setElapsedMs(0);
    setError(null);
    setStatus('idle');
  }, [cleanupCapture, revokeUrl]);

  const start = useCallback(async () => {
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
      setStatus('unsupported');
      return;
    }
    revokeUrl();
    setBlob(null);
    setError(null);
    setElapsedMs(0);
    setStatus('requesting');

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const mime = pickMimeType();
      const recorder = mime ? new MediaRecorder(stream, { mimeType: mime }) : new MediaRecorder(stream);
      chunksRef.current = [];
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunksRef.current.push(event.data);
      };
      recorder.onstop = () => {
        const type = recorder.mimeType || mime || 'audio/webm';
        const take = new Blob(chunksRef.current, { type });
        cleanupCapture();
        setBlob(take);
        const url = URL.createObjectURL(take);
        urlRef.current = url;
        setBlobUrl(url);
        setStatus('reviewing');
      };
      recorderRef.current = recorder;

      // Live level meter (best effort — recording works without it).
      const AudioCtx =
        window.AudioContext ??
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        const ctx = new AudioCtx();
        const source = ctx.createMediaStreamSource(stream);
        const node = ctx.createAnalyser();
        node.fftSize = 256;
        source.connect(node);
        audioCtxRef.current = ctx;
        setAnalyser(node);
      }

      recorder.start();
      const startedAt = Date.now();
      timerRef.current = window.setInterval(() => setElapsedMs(Date.now() - startedAt), 100);
      setStatus('recording');
    } catch (err) {
      cleanupCapture();
      if (err instanceof DOMException && err.name === 'NotAllowedError') {
        setStatus('denied');
      } else if (err instanceof DOMException && err.name === 'NotFoundError') {
        setError('No microphone was found on this device.');
        setStatus('error');
      } else {
        setError(err instanceof Error ? err.message : 'Could not start recording.');
        setStatus('error');
      }
    }
  }, [cleanupCapture, revokeUrl]);

  const stop = useCallback(() => {
    const recorder = recorderRef.current;
    if (recorder && recorder.state !== 'inactive') {
      recorder.stop(); // onstop handles the transition to 'reviewing'
    }
  }, []);

  // Release everything if the component unmounts mid-flow.
  useEffect(() => {
    return () => {
      cleanupCapture();
      if (urlRef.current) URL.revokeObjectURL(urlRef.current);
    };
  }, [cleanupCapture]);

  return { status, start, stop, reset, blob, blobUrl, analyser, elapsedMs, error };
}
