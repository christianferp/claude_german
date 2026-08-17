import { useEffect, useMemo, useState } from 'react';
import { Button } from '../components/Button';
import { Header } from '../components/Header';
import { PronunciationResultCard } from '../components/PronunciationResult';
import { RecordingControls } from '../components/RecordingControls';
import { StreakBanner } from '../components/StreakBanner';
import { CheckIcon, MicIcon } from '../components/icons';
import { TtsButton } from '../components/TtsButton';
import { useSpokenCheck } from '../hooks/useSpokenCheck';
import { LANGUAGES } from '../lib/languages';
import { buildPracticeQueue } from '../lib/recall';
import { pushRecall } from '../services/backend';
import { useAppStore } from '../store/useAppStore';

/** Word-level score above which a spoken answer counts as remembered. */
const PASS_SCORE = 0.75;

/**
 * Practice tab: drill every mastered phrase, not just the one daily pick.
 * English only, say it back in the target language, auto-corrected — repeat
 * for as long as you like. Answers feed the same SRS schedule as the daily
 * "Do you still remember?" card (via recordRecallAnswer), so practicing
 * here also reschedules that card, without ever suppressing it outright.
 */
export function PracticeScreen() {
  const language = useAppStore((state) => state.language);
  const mastered = useAppStore((state) => state.mastered);
  const recall = useAppStore((state) => state.recall);
  const hasGeminiKey = useAppStore((state) => Boolean(state.geminiApiKey));
  const recordRecallAnswer = useAppStore((state) => state.recordRecallAnswer);

  const queue = useMemo(
    () => (language ? buildPracticeQueue(mastered, recall, language, Date.now()) : []),
    [language, mastered, recall],
  );

  const [index, setIndex] = useState(0);
  const [session, setSession] = useState({ answered: 0, correct: 0 });
  const [revealed, setRevealed] = useState(false);

  // The queue can shrink (a phrase deleted mid-session) — keep the index sane.
  useEffect(() => {
    if (queue.length > 0 && index >= queue.length) setIndex(0);
  }, [queue.length, index]);

  const current = queue[index];
  const targetText = current?.phrase.text ?? '';
  const targetLanguage = current?.phrase.language ?? language ?? 'de';
  const check = useSpokenCheck(targetText, targetLanguage);

  // A new card starts with the answer hidden again.
  useEffect(() => {
    setRevealed(false);
  }, [targetText]);

  if (!language) return null;

  if (queue.length === 0) {
    return (
      <div className="px-5">
        <Header title="Practice" />
        <StreakBanner />
        <div className="rounded-3xl bg-white p-8 text-center shadow-sm">
          <p className="text-3xl">🎯</p>
          <p className="mt-3 font-semibold text-slate-700">Nothing to practice yet</p>
          <p className="mt-1 text-sm text-slate-500">
            Master a phrase on the Today tab, then come back here to drill it from memory,
            as often as you like.
          </p>
        </div>
      </div>
    );
  }

  const phrase = current.phrase;
  const meta = LANGUAGES[phrase.language];
  const passed = check.result ? check.result.score >= PASS_SCORE : false;
  const answerShown = revealed || check.status === 'done';

  const advance = () => {
    check.reset();
    setRevealed(false);
    setIndex((i) => (i + 1) % queue.length);
  };

  const grade = (correct: boolean) => {
    recordRecallAnswer(phrase.id, correct);
    void pushRecall(phrase.id).catch(() => {});
    setSession((s) => ({ answered: s.answered + 1, correct: s.correct + (correct ? 1 : 0) }));
    advance();
  };

  return (
    <div className="px-5">
      <Header title="Practice" />
      <StreakBanner />
      <p className="pb-4 text-sm text-slate-400">
        {session.answered === 0
          ? `${queue.length} mastered ${queue.length === 1 ? 'phrase' : 'phrases'} to drill`
          : `${session.answered} answered · ${session.correct} correct`}
      </p>

      <section className="rounded-3xl bg-white p-6 shadow-sm">
        <div className="flex items-start justify-between gap-3">
          <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
            Say it in {meta.name}
          </p>
          <span className="shrink-0 text-lg">{meta.flag}</span>
        </div>
        <p className="mt-2 text-xl font-bold leading-snug text-slate-800">{phrase.translation}</p>

        {check.status === 'done' && check.result ? (
          <div className="mt-4 space-y-3">
            <PronunciationResultCard text={phrase.text} result={check.result} />
            {passed ? (
              <Button onClick={advance} className="w-full">
                <CheckIcon />
                Correct — next phrase
              </Button>
            ) : (
              <div className="flex gap-2">
                <Button
                  variant="secondary"
                  onClick={() => {
                    check.reset();
                    setRevealed(false);
                  }}
                  className="flex-1"
                >
                  Try again
                </Button>
                <Button onClick={() => grade(true)} className="flex-1">
                  I knew it
                </Button>
              </div>
            )}
          </div>
        ) : (
          <>
            {answerShown && (
              <div className="mt-3">
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
                onDiscard={check.reset}
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
              <div className="mt-4">
                {hasGeminiKey ? (
                  <Button onClick={check.start} className="w-full">
                    <MicIcon />
                    {answerShown ? 'Try saying it' : `Say it in ${meta.name}`}
                  </Button>
                ) : answerShown ? (
                  <div className="flex gap-2">
                    <Button variant="secondary" onClick={() => grade(false)} className="flex-1">
                      Not yet
                    </Button>
                    <Button onClick={() => grade(true)} className="flex-1">
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
                    onClick={advance}
                    className="px-1 py-1 text-xs font-semibold text-slate-400 active:text-slate-600"
                  >
                    Skip
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </section>
    </div>
  );
}
