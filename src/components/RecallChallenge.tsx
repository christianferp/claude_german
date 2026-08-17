import { useEffect, useState } from 'react';
import { useRecallChallenge } from '../hooks/useRecallChallenge';
import { useSpokenCheck } from '../hooks/useSpokenCheck';
import { LANGUAGES } from '../lib/languages';
import { pushRecall } from '../services/backend';
import { useAppStore } from '../store/useAppStore';
import { Button } from './Button';
import { PronunciationResultCard } from './PronunciationResult';
import { RecordingControls } from './RecordingControls';
import { TtsButton } from './TtsButton';
import { CheckIcon, MicIcon } from './icons';

/** Word-level score above which a spoken answer counts as remembered. */
const PASS_SCORE = 0.75;

/**
 * "Do you still remember?" — the daily spaced-repetition challenge for a
 * phrase learned earlier: only the English is shown and the learner says it
 * back in the target language. A correct answer (or an "I knew it") retires
 * the card for the day and pushes the phrase further out; a miss leaves it
 * on screen. Without a Gemini key it degrades to a self-graded flashcard.
 */
export function RecallChallenge() {
  const state = useRecallChallenge();
  const hasGeminiKey = useAppStore((state) => Boolean(state.geminiApiKey));
  const startMemorize = useAppStore((state) => state.startMemorize);
  const [revealed, setRevealed] = useState(false);

  const phrase = state?.challenge.phrase;
  const targetText = phrase?.text ?? '';
  const language = phrase?.language ?? 'de';
  const check = useSpokenCheck(targetText, language);

  // A new challenge (or a new day) starts hidden again.
  useEffect(() => {
    setRevealed(false);
  }, [targetText]);

  if (!state || !phrase) return null;
  const meta = LANGUAGES[phrase.language];
  const passed = check.result ? check.result.score >= PASS_SCORE : false;
  // The answer is on screen once it was revealed or the attempt is graded.
  const answerShown = revealed || check.status === 'done';

  const confirmPass = () => {
    state.pass();
    // Best-effort cloud sync of the new schedule; local state is authoritative.
    void pushRecall(phrase.id).catch(() => {});
    check.reset();
  };

  const tryAgain = () => {
    check.reset();
    setRevealed(false);
  };

  return (
    <section className="mb-4 rounded-3xl border-2 border-sage-200 bg-sage-50 p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-sage-600">
            Do you still remember?
          </p>
          <p className="mt-0.5 text-xs text-slate-400">
            Learned {state.learnedAgo}
            {state.streak >= 2 && ` · 🔥 ${state.streak} in a row`}
          </p>
        </div>
        <span className="shrink-0 text-lg">{meta.flag}</span>
      </div>

      {/* The prompt: English only until the answer is earned or revealed. */}
      <p className="mt-3 text-xl font-bold leading-snug text-slate-800">{phrase.translation}</p>

      {check.status === 'done' && check.result ? (
        <div className="mt-3 space-y-3">
          <PronunciationResultCard text={phrase.text} result={check.result} />
          {passed ? (
            <Button onClick={confirmPass} className="w-full">
              <CheckIcon />
              Nice! Back in {state.nextIntervalDays} day{state.nextIntervalDays === 1 ? '' : 's'}
            </Button>
          ) : (
            <>
              <div className="flex gap-2">
                <Button variant="secondary" onClick={tryAgain} className="flex-1">
                  Try again
                </Button>
                <Button onClick={confirmPass} className="flex-1">
                  I knew it
                </Button>
              </div>
              <button
                onClick={() => {
                  state.miss();
                  startMemorize(phrase.id, 'today');
                }}
                className="w-full py-1 text-sm font-semibold text-sage-700 active:text-sage-800"
              >
                Memorize it step by step →
              </button>
            </>
          )}
        </div>
      ) : (
        <>
          {answerShown && (
            <div className="mt-2">
              <p className="text-lg font-bold leading-snug text-sage-800">{phrase.text}</p>
              <div className="mt-2">
                <TtsButton text={phrase.text} lang={meta.ttsLang} size="sm" />
              </div>
            </div>
          )}

          {check.status === 'recording' && (
            <RecordingControls
              analyser={check.recorder.analyser}
              onStop={check.stop}
              onRestart={check.restart}
            />
          )}

          {check.status === 'checking' && (
            <p className="mt-3 flex items-center gap-2 text-sm font-semibold text-slate-400">
              <span className="h-2 w-2 animate-pulse rounded-full bg-sage-500" />
              Checking your answer…
            </p>
          )}

          {check.status === 'error' && check.error && (
            <p className="mt-3 text-sm text-blush-600">{check.error}</p>
          )}

          {(check.status === 'idle' || check.status === 'error') && (
            <div className="mt-3">
              {hasGeminiKey ? (
                <Button onClick={check.start} className="w-full">
                  <MicIcon />
                  {answerShown ? 'Try saying it' : `Say it in ${meta.name}`}
                </Button>
              ) : answerShown ? (
                <div className="flex gap-2">
                  <Button variant="secondary" onClick={state.dismissToday} className="flex-1">
                    Not yet
                  </Button>
                  <Button onClick={confirmPass} className="flex-1">
                    <CheckIcon />
                    Got it
                  </Button>
                </div>
              ) : (
                <Button onClick={() => setRevealed(true)} className="w-full">
                  Show me the answer
                </Button>
              )}

              <div className="mt-2 flex justify-between">
                {!answerShown && hasGeminiKey ? (
                  <button
                    onClick={() => setRevealed(true)}
                    className="px-1 py-1 text-xs font-semibold text-slate-400 active:text-slate-600"
                  >
                    Show me
                  </button>
                ) : (
                  <span />
                )}
                <button
                  onClick={state.dismissToday}
                  className="px-1 py-1 text-xs font-semibold text-slate-400 active:text-slate-600"
                >
                  {answerShown ? 'Show me again tomorrow' : 'Not now'}
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </section>
  );
}
