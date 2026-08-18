import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { PodcastEpisode } from '../lib/types';
import type { EpisodeTimeline } from '../services/episodeAudio';
import { tts } from '../services/tts';

export interface UsePodcastPlayer {
  /** Transcript line matching the current playback position. */
  index: number;
  playing: boolean;
  currentTime: number;
  duration: number;
  finished: boolean;
  toggle: () => void;
  /** Jump to the start of a transcript line. */
  seekToLine: (index: number) => void;
  seekToTime: (seconds: number) => void;
  skip: (seconds: number) => void;
  restart: () => void;
}

/** Last line whose start is at or before `time`. */
function lineAt(startSec: number[], time: number): number {
  let low = 0;
  let high = startSec.length - 1;
  let found = 0;
  while (low <= high) {
    const mid = (low + high) >> 1;
    if (startSec[mid] <= time) {
      found = mid;
      low = mid + 1;
    } else {
      high = mid - 1;
    }
  }
  return found;
}

/**
 * Plays an episode's single continuous track through one audio element.
 *
 * One element (rather than a sentence at a time) is what makes this behave
 * like a real podcast: gapless, scrubbable, and able to keep playing when
 * the screen locks — with the lockscreen controls wired up through the Media
 * Session API. Sentence highlighting is derived from the pre-computed
 * timeline as playback moves, so nothing has to be re-synthesized to follow
 * along.
 */
export function usePodcastPlayer(
  episode: PodcastEpisode | null,
  url: string | null,
  timeline: EpisodeTimeline | null,
): UsePodcastPlayer {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [finished, setFinished] = useState(false);

  const startSec = useMemo(() => timeline?.startSec ?? [], [timeline]);

  // One element for the life of the screen; only its source changes.
  useEffect(() => {
    const audio = new Audio();
    audio.preload = 'auto';
    audioRef.current = audio;
    return () => {
      audio.pause();
      audio.src = '';
      audioRef.current = null;
    };
  }, []);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !url) return;
    // Never talk over the episode with the phrase-level TTS voice.
    tts.stop();
    audio.src = url;
    audio.currentTime = 0;
    setCurrentTime(0);
    setFinished(false);
    setPlaying(false);
  }, [url]);

  // Playback events drive every piece of derived state.
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const onTime = () => setCurrentTime(audio.currentTime);
    const onDuration = () => {
      // A WAV built in the browser sometimes reports Infinity until it seeks.
      if (Number.isFinite(audio.duration)) setDuration(audio.duration);
    };
    const onPlay = () => {
      setPlaying(true);
      setFinished(false);
    };
    const onPause = () => setPlaying(false);
    const onEnded = () => {
      setPlaying(false);
      setFinished(true);
    };
    audio.addEventListener('timeupdate', onTime);
    audio.addEventListener('loadedmetadata', onDuration);
    audio.addEventListener('durationchange', onDuration);
    audio.addEventListener('play', onPlay);
    audio.addEventListener('pause', onPause);
    audio.addEventListener('ended', onEnded);
    return () => {
      audio.removeEventListener('timeupdate', onTime);
      audio.removeEventListener('loadedmetadata', onDuration);
      audio.removeEventListener('durationchange', onDuration);
      audio.removeEventListener('play', onPlay);
      audio.removeEventListener('pause', onPause);
      audio.removeEventListener('ended', onEnded);
    };
  }, [url]);

  const toggle = useCallback(() => {
    const audio = audioRef.current;
    if (!audio || !audio.src) return;
    if (audio.paused) void audio.play().catch(() => setPlaying(false));
    else audio.pause();
  }, []);

  const seekToTime = useCallback((seconds: number) => {
    const audio = audioRef.current;
    if (!audio || !audio.src) return;
    const limit = Number.isFinite(audio.duration) ? audio.duration : seconds;
    audio.currentTime = Math.max(0, Math.min(seconds, limit));
    setCurrentTime(audio.currentTime);
    setFinished(false);
  }, []);

  const seekToLine = useCallback(
    (line: number) => {
      const target = startSec[Math.max(0, Math.min(line, startSec.length - 1))] ?? 0;
      // Nudge just past the boundary so the intended line is the active one.
      seekToTime(target + 0.01);
    },
    [startSec, seekToTime],
  );

  const skip = useCallback(
    (seconds: number) => {
      const audio = audioRef.current;
      if (!audio) return;
      seekToTime(audio.currentTime + seconds);
    },
    [seekToTime],
  );

  const restart = useCallback(() => {
    seekToTime(0);
    const audio = audioRef.current;
    if (audio && audio.src) void audio.play().catch(() => {});
  }, [seekToTime]);

  // Lockscreen / notification controls, so this behaves like a podcast app
  // when the phone is locked or the tab is in the background.
  useEffect(() => {
    if (!('mediaSession' in navigator) || !episode || !url) return;
    const session = navigator.mediaSession;
    session.metadata = new MediaMetadata({
      title: episode.title,
      artist: 'Daily Phrase',
      album: `${episode.topicEn} · ${episode.level}`,
    });
    const handlers: [MediaSessionAction, MediaSessionActionHandler][] = [
      ['play', () => audioRef.current?.play().catch(() => {})],
      ['pause', () => audioRef.current?.pause()],
      ['seekbackward', () => skip(-10)],
      ['seekforward', () => skip(10)],
      ['previoustrack', () => skip(-10)],
      ['nexttrack', () => skip(10)],
      [
        'seekto',
        (details) => {
          if (details.seekTime !== undefined) seekToTime(details.seekTime);
        },
      ],
    ];
    for (const [action, handler] of handlers) {
      try {
        session.setActionHandler(action, handler);
      } catch {
        /* older browsers reject unknown actions */
      }
    }
    return () => {
      for (const [action] of handlers) {
        try {
          session.setActionHandler(action, null);
        } catch {
          /* ignore */
        }
      }
    };
  }, [episode, url, skip, seekToTime]);

  // Keep the lockscreen scrubber and play/pause state in step.
  useEffect(() => {
    if (!('mediaSession' in navigator)) return;
    navigator.mediaSession.playbackState = playing ? 'playing' : 'paused';
    if ('setPositionState' in navigator.mediaSession && duration > 0) {
      try {
        navigator.mediaSession.setPositionState({
          duration,
          position: Math.min(currentTime, duration),
          playbackRate: 1,
        });
      } catch {
        /* position state is best effort */
      }
    }
  }, [playing, currentTime, duration]);

  const index = startSec.length > 0 ? lineAt(startSec, currentTime) : 0;

  return {
    index,
    playing,
    currentTime,
    duration: duration || timeline?.durationSec || 0,
    finished,
    toggle,
    seekToLine,
    seekToTime,
    skip,
    restart,
  };
}
