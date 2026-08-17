import { useSpokenCheck } from '../../hooks/useSpokenCheck';
import type { Language } from '../../lib/types';
import { useAppStore } from '../../store/useAppStore';
import { MicIcon } from '../icons';
import { PronunciationResultCard } from '../PronunciationResult';
import { RecordingControls } from '../RecordingControls';

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
  const check = useSpokenCheck(text, language);

  if (!hasGeminiKey) return null;

  return (
    <div className="mt-3">
      {check.status === 'idle' && (
        <button
          onClick={check.start}
          className="flex items-center gap-1.5 rounded-full bg-cream-100 px-3 py-2 text-sm font-semibold text-slate-600 active:bg-cream-200"
        >
          <MicIcon className="h-4 w-4" />
          Test yourself
        </button>
      )}
      {check.status === 'recording' && (
        <RecordingControls
          analyser={check.recorder.analyser}
          onStop={check.stop}
          onRestart={check.restart}
          compact
        />
      )}
      {check.status === 'checking' && (
        <p className="flex items-center gap-2 text-sm font-semibold text-slate-400">
          <span className="h-2 w-2 animate-pulse rounded-full bg-sage-500" />
          Checking…
        </p>
      )}
      {(check.status === 'done' || check.status === 'error') && (
        <div className="space-y-2">
          {check.result && <PronunciationResultCard text={text} result={check.result} />}
          {check.error && <p className="text-sm text-blush-600">{check.error}</p>}
          <button
            onClick={check.reset}
            className="flex items-center gap-1.5 rounded-full bg-cream-100 px-3 py-2 text-sm font-semibold text-slate-600 active:bg-cream-200"
          >
            <MicIcon className="h-4 w-4" />
            Test again
          </button>
        </div>
      )}
    </div>
  );
}
