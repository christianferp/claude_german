import { useCallback, useEffect, useRef, useState } from 'react';
import { LANGUAGES } from '../lib/languages';
import type { PodcastEpisode } from '../lib/types';
import { tts } from '../services/tts';

export interface UsePodcastPlayer {
  /** Index of the sentence currently spoken (or cued up while paused). */
  index: number;
  playing: boolean;
  /** True once the last sentence has been spoken. */
  finished: boolean;
  play: () => void;
  pause: () => void;
  toggle: () => void;
  next: () => void;
  prev: () => void;
  seekTo: (index: number) => void;
  restart: () => void;
}

/**
 * Plays an episode one sentence at a time through the shared TTS service.
 *
 * Sentence-at-a-time is what keeps the transcript highlight genuinely in
 * sync: a single long audio file would give us no timing information. It
 * also means playback inherits the existing per-line fallback — if the AI
 * voice fails or hits quota mid-episode, that sentence (and the rest) is
 * spoken by the device voice instead of the episode stopping dead.
 */
export function usePodcastPlayer(episode: PodcastEpisode | null): UsePodcastPlayer {
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [finished, setFinished] = useState(false);

  /** Bumped by every pause/seek so a still-running loop knows it is stale. */
  const runRef = useRef(0);
  const indexRef = useRef(0);
  indexRef.current = index;

  const lang = episode ? LANGUAGES[episode.language].ttsLang : 'de-DE';

  const stopAudio = useCallback(() => {
    runRef.current += 1;
    tts.stop();
    setPlaying(false);
  }, []);

  // A different episode, or leaving the screen, must not keep talking.
  useEffect(() => {
    setIndex(0);
    setFinished(false);
    return stopAudio;
  }, [episode?.id, stopAudio]);

  const play = useCallback(() => {
    if (!episode || episode.lines.length === 0) return;
    runRef.current += 1;
    const run = runRef.current;
    setPlaying(true);
    setFinished(false);

    void (async () => {
      // If every sentence fails instantly (offline with no speech synthesis,
      // or autoplay blocked) the loop would silently race to the end. Bail
      // out instead and leave the play button for a deliberate retry.
      let instantFailures = 0;

      for (let i = indexRef.current; i < episode.lines.length; i++) {
        if (runRef.current !== run) return; // paused or seeked — abandon this loop
        setIndex(i);
        // Warm the next sentence while this one plays, so the gap is short.
        const upcoming = episode.lines[i + 1];
        if (upcoming) tts.prefetch(upcoming.de, { lang });

        const startedAt = Date.now();
        try {
          await tts.speak(episode.lines[i].de, { lang });
          instantFailures = 0;
        } catch {
          // One bad sentence shouldn't end the episode — but a burst of
          // immediate failures means no audio is reaching the speaker.
          if (Date.now() - startedAt < 150) instantFailures += 1;
          if (instantFailures >= 3) {
            setPlaying(false);
            return;
          }
        }
        if (runRef.current !== run) return;
      }
      setPlaying(false);
      setFinished(true);
    })();
  }, [episode, lang]);

  const pause = useCallback(() => {
    stopAudio();
  }, [stopAudio]);

  const toggle = useCallback(() => {
    if (playing) pause();
    else play();
  }, [playing, pause, play]);

  /** Jump to a sentence, keeping whatever play/pause state we were in. */
  const seekTo = useCallback(
    (target: number) => {
      if (!episode) return;
      const clamped = Math.max(0, Math.min(target, episode.lines.length - 1));
      const wasPlaying = playing;
      stopAudio();
      setIndex(clamped);
      indexRef.current = clamped;
      setFinished(false);
      if (wasPlaying) {
        // Let the abandoned loop unwind before starting the next one.
        setTimeout(play, 0);
      }
    },
    [episode, playing, stopAudio, play],
  );

  const next = useCallback(() => seekTo(indexRef.current + 1), [seekTo]);
  const prev = useCallback(() => seekTo(indexRef.current - 1), [seekTo]);
  const restart = useCallback(() => seekTo(0), [seekTo]);

  return { index, playing, finished, play, pause, toggle, next, prev, seekTo, restart };
}
