import { useEffect, useRef, useState } from 'react';
import { PauseIcon, PlayIcon } from './icons';

interface AudioPlayButtonProps {
  /** Object URL of the audio to play; null disables the button. */
  src: string | null;
  label: string;
  size?: 'lg' | 'sm';
}

/** Plays a recorded blob (via object URL) with play/pause toggling. */
export function AudioPlayButton({ src, label, size = 'lg' }: AudioPlayButtonProps) {
  const [playing, setPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // New source (e.g. after a re-record): discard the old element.
  useEffect(() => {
    audioRef.current?.pause();
    audioRef.current = null;
    setPlaying(false);
  }, [src]);

  useEffect(() => {
    return () => audioRef.current?.pause();
  }, []);

  const toggle = () => {
    if (!src) return;
    if (!audioRef.current) {
      const audio = new Audio(src);
      audio.onended = () => setPlaying(false);
      audio.onpause = () => setPlaying(false);
      audioRef.current = audio;
    }
    if (playing) {
      audioRef.current.pause();
    } else {
      setPlaying(true);
      void audioRef.current.play().catch(() => setPlaying(false));
    }
  };

  if (size === 'sm') {
    return (
      <button
        onClick={toggle}
        disabled={!src}
        className={`flex items-center gap-1.5 rounded-full px-3 py-2 text-sm font-semibold transition-colors ${
          playing
            ? 'bg-sage-500 text-white'
            : 'bg-cream-100 text-slate-600 active:bg-cream-200 disabled:text-slate-300'
        }`}
      >
        {playing ? <PauseIcon className="h-4 w-4" /> : <PlayIcon className="h-4 w-4" />}
        {label}
      </button>
    );
  }

  return (
    <button
      onClick={toggle}
      disabled={!src}
      className="flex w-full items-center justify-center gap-2 rounded-2xl bg-white px-5 py-3.5 text-base font-semibold text-slate-700 shadow-sm transition-all active:scale-[0.98] active:bg-cream-100 disabled:cursor-not-allowed disabled:text-slate-300"
    >
      {playing ? <PauseIcon /> : <PlayIcon />}
      {playing ? 'Playing…' : label}
    </button>
  );
}
