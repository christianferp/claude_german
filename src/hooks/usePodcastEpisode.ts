import { useCallback, useEffect, useRef, useState } from 'react';
import { localDateISO } from '../lib/dailyIndex';
import { topicForDate, type Topic } from '../lib/topics';
import type { PodcastEpisode } from '../lib/types';
import { getEpisode, hasCachedEpisode, PodcastError, type PodcastErrorKind } from '../services/podcast';
import { useAppStore } from '../store/useAppStore';

const ERROR_MESSAGES: Record<PodcastErrorKind, string> = {
  'no-key': 'Add your Gemini API key in Settings to generate episodes.',
  auth: 'Your Gemini API key was rejected — check it in Settings.',
  quota: "Gemini's free quota is used up for now — try again later.",
  network: 'You appear to be offline.',
  malformed: "The episode didn't come out right. Try again.",
  other: "Today's episode couldn't be written. Try again.",
};

export type EpisodeStatus = 'idle' | 'loading' | 'ready' | 'error';

export interface UsePodcastEpisode {
  status: EpisodeStatus;
  episode: PodcastEpisode | null;
  error: string | null;
  /** Today's topic — known before the episode exists, for the idle card. */
  topic: Topic | null;
  /** Already generated earlier today, so starting it costs nothing. */
  cached: boolean;
  /** Fetch from cache, or generate when there is nothing cached yet. */
  load: () => void;
}

/**
 * Today's episode. Nothing is fetched or generated until `load()` is called
 * — opening the tab shows the topic only, so a stray tap never spends a
 * generation. A cached episode loads instantly on the same call.
 */
export function usePodcastEpisode(): UsePodcastEpisode {
  const language = useAppStore((state) => state.language);
  const level = useAppStore((state) => (state.language ? state.levels[state.language] : undefined));

  const [status, setStatus] = useState<EpisodeStatus>('idle');
  const [episode, setEpisode] = useState<PodcastEpisode | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cached, setCached] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const topic = language && level ? topicForDate(localDateISO(), language, level) : null;

  // Switching language or level means a different episode entirely.
  useEffect(() => {
    abortRef.current?.abort();
    setStatus('idle');
    setEpisode(null);
    setError(null);
    return () => abortRef.current?.abort();
  }, [language, level]);

  // Knowing whether it's already cached lets the idle card say "Continue"
  // rather than implying a fresh generation.
  useEffect(() => {
    let active = true;
    if (!language || !level) return;
    void hasCachedEpisode(language, level)
      .then((has) => {
        if (active) setCached(has);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [language, level]);

  const load = useCallback(() => {
    if (!language || !level) return;
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setStatus('loading');
    setError(null);
    getEpisode(language, level, controller.signal)
      .then((result) => {
        if (controller.signal.aborted) return;
        setEpisode(result);
        setCached(true);
        setStatus('ready');
      })
      .catch((err: unknown) => {
        if (controller.signal.aborted) return;
        if (err instanceof DOMException && err.name === 'AbortError') return;
        // Show the underlying reason for the vague kinds — a bare "try
        // again" gives neither the user nor us anything to act on.
        const kind = err instanceof PodcastError ? err.kind : 'other';
        const detail =
          err instanceof PodcastError && (kind === 'other' || kind === 'malformed')
            ? ` (${err.message})`
            : '';
        setError(`${ERROR_MESSAGES[kind]}${detail}`);
        setStatus('error');
      });
  }, [language, level]);

  return { status, episode, error, topic, cached, load };
}
