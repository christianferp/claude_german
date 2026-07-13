import { useEffect, useRef, useState } from 'react';
import { tts } from '../services/tts';
import { Button } from './Button';
import { PauseIcon, SpeakerIcon } from './icons';

interface TtsButtonProps {
  text: string;
  lang: string;
  /** 'lg' = full-width labelled button; 'sm' = compact icon chip. */
  size?: 'lg' | 'sm';
}

/**
 * "Listen" button. Currently backed by browser speech synthesis via the
 * TtsService abstraction — swaps transparently to a real AI voice later.
 */
export function TtsButton({ text, lang, size = 'lg' }: TtsButtonProps) {
  const [speaking, setSpeaking] = useState(false);
  const speakingRef = useRef(false);

  useEffect(() => {
    return () => {
      // Stop speech if the user navigates away mid-playback.
      if (speakingRef.current) tts.stop();
    };
  }, []);

  const handleClick = () => {
    if (speaking) {
      tts.stop();
      speakingRef.current = false;
      setSpeaking(false);
      return;
    }
    speakingRef.current = true;
    setSpeaking(true);
    tts
      .speak(text, { lang })
      .catch(() => {})
      .finally(() => {
        speakingRef.current = false;
        setSpeaking(false);
      });
  };

  if (size === 'sm') {
    return (
      <button
        onClick={handleClick}
        className={`flex items-center gap-1.5 rounded-full px-3 py-2 text-sm font-semibold transition-colors ${
          speaking ? 'bg-sage-500 text-white' : 'bg-sage-100 text-sage-700 active:bg-sage-200'
        }`}
        aria-label={speaking ? 'Stop audio' : 'Listen'}
      >
        {speaking ? <PauseIcon className="h-4 w-4" /> : <SpeakerIcon className="h-4 w-4" />}
        Listen
      </button>
    );
  }

  return (
    <Button variant="secondary" onClick={handleClick} className="w-full">
      {speaking ? <PauseIcon /> : <SpeakerIcon />}
      {speaking ? 'Playing…' : 'Listen'}
    </Button>
  );
}
