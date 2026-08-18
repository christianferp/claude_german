import { useCallback, useEffect, useRef, useState } from 'react';
import type { PodcastEpisode } from '../lib/types';
import {
  buildEpisodeAudio,
  chunkCountFor,
  EpisodeAudioError,
  loadEpisodeAudio,
  type BuildProgress,
  type EpisodeTimeline,
} from '../services/episodeAudio';
import type { TtsErrorKind } from '../services/tts';

const ERROR_MESSAGES: Record<TtsErrorKind, string> = {
  'no-key': 'Add your Gemini API key in Settings to build the audio.',
  auth: 'Your Gemini API key was rejected — check it in Settings.',
  quota: "Gemini's free quota is used up for now. What's already recorded is saved — come back later and it picks up where it stopped.",
  network: 'You appear to be offline.',
  other: 'The audio could not be recorded.',
};

export type AudioStatus = 'checking' | 'absent' | 'building' | 'ready' | 'error';

export interface UseEpisodeAudio {
  status: AudioStatus;
  /** Object URL of the finished continuous track. */
  url: string | null;
  timeline: EpisodeTimeline | null;
  progress: BuildProgress | null;
  error: string | null;
  /** Total TTS requests a full build needs, for the progress copy. */
  chunkTotal: number;
  build: () => void;
}

/**
 * The episode's single continuous audio track: loaded from the device when
 * it was built before, otherwise synthesized on request with progress.
 */
export function useEpisodeAudio(episode: PodcastEpisode | null): UseEpisodeAudio {
  const [status, setStatus] = useState<AudioStatus>('checking');
  const [url, setUrl] = useState<string | null>(null);
  const [timeline, setTimeline] = useState<EpisodeTimeline | null>(null);
  const [progress, setProgress] = useState<BuildProgress | null>(null);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const urlRef = useRef<string | null>(null);

  const chunkTotal = episode ? chunkCountFor(episode) : 0;

  const adopt = useCallback((blob: Blob, nextTimeline: EpisodeTimeline) => {
    if (urlRef.current) URL.revokeObjectURL(urlRef.current);
    const objectUrl = URL.createObjectURL(blob);
    urlRef.current = objectUrl;
    setUrl(objectUrl);
    setTimeline(nextTimeline);
    setStatus('ready');
  }, []);

  // Look for an already-built track whenever the episode changes.
  useEffect(() => {
    let active = true;
    abortRef.current?.abort();
    setStatus('checking');
    setError(null);
    setProgress(null);
    if (!episode) return;

    void loadEpisodeAudio(episode)
      .then((audio) => {
        if (!active) return;
        if (audio) adopt(audio.blob, audio.timeline);
        else setStatus('absent');
      })
      .catch(() => {
        if (active) setStatus('absent');
      });

    return () => {
      active = false;
    };
  }, [episode, adopt]);

  // Release the object URL when the screen goes away.
  useEffect(
    () => () => {
      abortRef.current?.abort();
      if (urlRef.current) URL.revokeObjectURL(urlRef.current);
      urlRef.current = null;
    },
    [],
  );

  const build = useCallback(() => {
    if (!episode) return;
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setStatus('building');
    setError(null);
    setProgress({ done: 0, total: chunkCountFor(episode) });

    void buildEpisodeAudio(
      episode,
      (next) => {
        if (!controller.signal.aborted) setProgress(next);
      },
      controller.signal,
    )
      .then((audio) => {
        if (controller.signal.aborted) return;
        adopt(audio.blob, audio.timeline);
      })
      .catch((err: unknown) => {
        if (controller.signal.aborted) return;
        if (err instanceof DOMException && err.name === 'AbortError') return;
        const kind = err instanceof EpisodeAudioError ? err.kind : 'other';
        const detail = err instanceof EpisodeAudioError && kind === 'other' ? ` (${err.message})` : '';
        setError(`${ERROR_MESSAGES[kind]}${detail}`);
        setStatus('error');
      });
  }, [episode, adopt]);

  return { status, url, timeline, progress, error, chunkTotal, build };
}
