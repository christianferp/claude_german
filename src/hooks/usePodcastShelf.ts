import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { builtInEpisodes, levelDistance } from '../lib/episodeLibrary';
import type { PodcastEpisode } from '../lib/types';
import { episodeStorage } from '../services/episodeStorage';
import { PodcastError, writeEpisode, type PodcastErrorKind } from '../services/podcast';
import { useAppStore } from '../store/useAppStore';

const ERROR_MESSAGES: Record<PodcastErrorKind, string> = {
  'no-key': 'Add your Gemini API key in Settings to write new episodes.',
  auth: 'Your Gemini API key was rejected — check it in Settings.',
  quota: "Gemini's free quota is used up for now — try again later.",
  network: 'You appear to be offline.',
  malformed: "The episode didn't come out right. Try again.",
  other: "The episode couldn't be written. Try again.",
};

export interface UsePodcastShelf {
  /** Everything available to listen to, closest to the learner's level first. */
  episodes: PodcastEpisode[];
  /** True until the written episodes have been read back from the device. */
  loading: boolean;
  writing: boolean;
  error: string | null;
  /** Ask for one more episode on a topic the shelf doesn't cover yet. */
  write: () => void;
  /** Remove a written episode. Built-in ones are always there. */
  remove: (id: string) => void;
}

/**
 * The shelf of episodes for the current language: the ones that ship with
 * the app plus every one the learner has had written, newest first within
 * each group.
 *
 * Episodes deliberately aren't tied to the day any more. The shelf is
 * always full and always playable, so opening the tab is never a wait and
 * never spends quota — writing a new one is an explicit choice.
 */
export function usePodcastShelf(): UsePodcastShelf {
  const language = useAppStore((state) => state.language);
  const level = useAppStore((state) => (state.language ? state.levels[state.language] : undefined));

  const [written, setWritten] = useState<PodcastEpisode[]>([]);
  const [loading, setLoading] = useState(true);
  const [writing, setWriting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => () => abortRef.current?.abort(), []);

  // Read the written episodes back from the device once per language.
  useEffect(() => {
    if (!language) return;
    let active = true;
    setLoading(true);
    void episodeStorage
      .list()
      .then((all) => {
        if (!active) return;
        setWritten(all.filter((episode) => episode.language === language));
      })
      .catch(() => {
        /* an unreadable store just means the built-in shelf */
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [language]);

  const episodes = useMemo(() => {
    if (!language) return [];
    const all = [...written, ...builtInEpisodes(language)];
    if (!level) return all;
    // Their own level first, then whatever is nearest — a shelf sorted by
    // difficulty is more useful than one sorted by when it was made.
    return all.sort((a, b) => levelDistance(a.level, level) - levelDistance(b.level, level));
  }, [written, language, level]);

  const write = useCallback(() => {
    if (!language || !level) return;
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setWriting(true);
    setError(null);

    const covered = episodes.map((episode) => episode.topicEn);
    writeEpisode(language, level, covered, controller.signal)
      .then((episode) => {
        if (controller.signal.aborted) return;
        setWritten((current) => [episode, ...current]);
        setWriting(false);
      })
      .catch((err: unknown) => {
        if (controller.signal.aborted) return;
        if (err instanceof DOMException && err.name === 'AbortError') return;
        const kind = err instanceof PodcastError ? err.kind : 'other';
        // Show the underlying reason for the vague kinds — a bare "try
        // again" gives neither the learner nor us anything to act on.
        const detail =
          err instanceof PodcastError && (kind === 'other' || kind === 'malformed')
            ? ` (${err.message})`
            : '';
        setError(`${ERROR_MESSAGES[kind]}${detail}`);
        setWriting(false);
      });
  }, [language, level, episodes]);

  const remove = useCallback((id: string) => {
    setWritten((current) => current.filter((episode) => episode.id !== id));
    void episodeStorage.remove(id).catch(() => {});
  }, []);

  return { episodes, loading, writing, error, write, remove };
}
