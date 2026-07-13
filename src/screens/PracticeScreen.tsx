import { useEffect, useMemo, useReducer } from 'react';
import { Button } from '../components/Button';
import { RecordPanel } from '../components/RecordPanel';
import { TtsButton } from '../components/TtsButton';
import { CheckIcon, CloseIcon } from '../components/icons';
import { MaskedPhrase } from '../components/practice/MaskedPhrase';
import { getPhraseById } from '../data/phrases';
import { LANGUAGES } from '../lib/languages';
import { pickHiddenWordIndices } from '../lib/mask';
import type { Phrase } from '../lib/types';
import { useAppStore } from '../store/useAppStore';

const STAGES = ['chunks', 'full', 'cloze', 'letters', 'recall'] as const;

const STAGE_TITLES: Record<(typeof STAGES)[number], string> = {
  chunks: 'Piece by piece',
  full: 'Read it whole',
  cloze: 'Fill the gaps',
  letters: 'First letters',
  recall: 'From memory',
};

interface WizardState {
  stage: number;
  chunkIndex: number;
  revealedCloze: Set<number>;
  revealedLetters: Set<number>;
  recallHint: 'none' | 'letters' | 'full';
  completed: boolean;
}

type WizardAction =
  | { type: 'NEXT'; chunkCount: number }
  | { type: 'BACK'; chunkCount: number }
  | { type: 'SKIP_STAGE' }
  | { type: 'REVEAL'; mode: 'cloze' | 'letters'; index: number }
  | { type: 'REVEAL_ALL_CLOZE'; all: Set<number> }
  | { type: 'SET_HINT'; hint: WizardState['recallHint'] }
  | { type: 'COMPLETE' };

const INITIAL: WizardState = {
  stage: 0,
  chunkIndex: 0,
  revealedCloze: new Set(),
  revealedLetters: new Set(),
  recallHint: 'none',
  completed: false,
};

function reducer(state: WizardState, action: WizardAction): WizardState {
  switch (action.type) {
    case 'NEXT':
      if (state.stage === 0 && state.chunkIndex < action.chunkCount - 1) {
        return { ...state, chunkIndex: state.chunkIndex + 1 };
      }
      return { ...state, stage: Math.min(state.stage + 1, STAGES.length - 1) };
    case 'BACK':
      if (state.stage === 0) {
        return { ...state, chunkIndex: Math.max(0, state.chunkIndex - 1) };
      }
      if (state.stage === 1) {
        return { ...state, stage: 0, chunkIndex: action.chunkCount - 1 };
      }
      return { ...state, stage: state.stage - 1 };
    case 'SKIP_STAGE':
      return { ...state, stage: Math.min(state.stage + 1, STAGES.length - 1) };
    case 'REVEAL': {
      const key = action.mode === 'cloze' ? 'revealedCloze' : 'revealedLetters';
      return { ...state, [key]: new Set(state[key]).add(action.index) };
    }
    case 'REVEAL_ALL_CLOZE':
      return { ...state, revealedCloze: new Set([...state.revealedCloze, ...action.all]) };
    case 'SET_HINT':
      return { ...state, recallHint: action.hint };
    case 'COMPLETE':
      return { ...state, completed: true };
  }
}

export function PracticeScreen() {
  const phraseId = useAppStore((state) => state.practicePhraseId);
  const returnView = useAppStore((state) => state.practiceReturnView);
  const setView = useAppStore((state) => state.setView);
  const phrase = phraseId ? getPhraseById(phraseId) : undefined;

  // Defensive: entering without a phrase (or a stale id) just leaves.
  useEffect(() => {
    if (!phrase) setView(returnView);
  }, [phrase, returnView, setView]);

  if (!phrase) return null;
  return <PracticeWizard phrase={phrase} onExit={() => setView(returnView)} />;
}

function PracticeWizard({ phrase, onExit }: { phrase: Phrase; onExit: () => void }) {
  const [state, dispatch] = useReducer(reducer, INITIAL);
  const meta = LANGUAGES[phrase.language];
  const chunks = phrase.breakdown;
  const hiddenIndices = useMemo(
    () => pickHiddenWordIndices(phrase.text, phrase.id),
    [phrase.text, phrase.id],
  );

  const stageId = STAGES[state.stage];

  return (
    <div className="flex min-h-dvh flex-col px-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))]">
      {/* Header: exit + title + progress */}
      <div className="flex items-center gap-3 pt-5">
        <button
          onClick={onExit}
          className="rounded-full p-2 text-slate-400 active:bg-cream-100"
          aria-label="Exit practice"
        >
          <CloseIcon />
        </button>
        <h1 className="flex-1 text-center text-base font-bold text-slate-700">
          {state.completed ? 'Done!' : STAGE_TITLES[stageId]}
        </h1>
        <div className="w-9" aria-hidden="true" />
      </div>

      <div className="mt-3 flex gap-1.5" aria-label={`Step ${state.stage + 1} of ${STAGES.length}`}>
        {STAGES.map((id, i) => (
          <div key={id} className="h-1.5 flex-1 overflow-hidden rounded-full bg-sage-100">
            <div
              className="h-full rounded-full bg-sage-500 transition-all duration-300"
              style={{
                width:
                  i < state.stage || state.completed
                    ? '100%'
                    : i > state.stage
                      ? '0%'
                      : stageId === 'chunks'
                        ? `${((state.chunkIndex + 1) / chunks.length) * 100}%`
                        : '60%',
              }}
            />
          </div>
        ))}
      </div>

      {/* Stage body */}
      <div className="flex-1 pt-6">
        {state.completed ? (
          <div className="rounded-3xl bg-sage-100 p-8 text-center">
            <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-sage-500 text-white">
              <CheckIcon className="h-6 w-6" />
            </span>
            <p className="mt-4 text-lg font-bold text-slate-800">Phrase memorized</p>
            <p className="mt-1 text-sm text-slate-600">{phrase.text}</p>
            <Button onClick={onExit} className="mt-6 w-full">
              Done
            </Button>
          </div>
        ) : (
          <>
            {stageId === 'chunks' && (
              <div>
                <p className="text-sm text-slate-400">{phrase.translation}</p>
                {state.chunkIndex > 0 && (
                  <p className="mt-4 text-base font-semibold leading-relaxed text-sage-600">
                    {chunks.slice(0, state.chunkIndex).map((chunk) => chunk.text).join(' · ')}
                  </p>
                )}
                <div className="mt-4 rounded-3xl bg-white p-6 shadow-sm">
                  <p className="text-2xl font-bold text-slate-800">{chunks[state.chunkIndex].text}</p>
                  <p className="mt-1 text-base text-slate-500">{chunks[state.chunkIndex].gloss}</p>
                  {chunks[state.chunkIndex].note && (
                    <p className="mt-2 text-xs text-slate-400">{chunks[state.chunkIndex].note}</p>
                  )}
                  <div className="mt-4">
                    <TtsButton text={chunks[state.chunkIndex].text} lang={meta.ttsLang} size="sm" />
                  </div>
                </div>
                <p className="mt-4 px-1 text-sm text-slate-400">
                  Read each piece out loud, then move on.
                </p>
              </div>
            )}

            {stageId === 'full' && (
              <div>
                <div className="rounded-3xl bg-white p-6 shadow-sm">
                  <p className="text-[1.7rem] font-bold leading-snug text-slate-800">{phrase.text}</p>
                  <p className="mt-2 text-base text-slate-500">{phrase.translation}</p>
                  <div className="mt-4">
                    <TtsButton text={phrase.text} lang={meta.ttsLang} size="sm" />
                  </div>
                </div>
                <p className="mt-4 px-1 text-sm text-slate-400">
                  Read the whole phrase aloud two or three times.
                </p>
              </div>
            )}

            {stageId === 'cloze' && (
              <div>
                <div className="rounded-3xl bg-white p-6 shadow-sm">
                  <MaskedPhrase
                    text={phrase.text}
                    mode="cloze"
                    hiddenIndices={hiddenIndices}
                    revealed={state.revealedCloze}
                    onReveal={(index) => dispatch({ type: 'REVEAL', mode: 'cloze', index })}
                  />
                  <p className="mt-2 text-base text-slate-500">{phrase.translation}</p>
                  <div className="mt-4 flex items-center gap-3">
                    <TtsButton text={phrase.text} lang={meta.ttsLang} size="sm" />
                    <button
                      onClick={() => dispatch({ type: 'REVEAL_ALL_CLOZE', all: hiddenIndices })}
                      className="text-sm font-semibold text-slate-400 active:text-slate-600"
                    >
                      Reveal all
                    </button>
                  </div>
                </div>
                <p className="mt-4 px-1 text-sm text-slate-400">
                  Say the whole phrase — tap a blank if you're stuck.
                </p>
              </div>
            )}

            {stageId === 'letters' && (
              <div>
                <div className="rounded-3xl bg-white p-6 shadow-sm">
                  <MaskedPhrase
                    text={phrase.text}
                    mode="letters"
                    hiddenIndices={hiddenIndices}
                    revealed={state.revealedLetters}
                    onReveal={(index) => dispatch({ type: 'REVEAL', mode: 'letters', index })}
                  />
                  <p className="mt-2 text-base text-slate-500">{phrase.translation}</p>
                </div>
                <p className="mt-4 px-1 text-sm text-slate-400">
                  Only first letters now. Say it out loud — tap a word if you need it.
                </p>
              </div>
            )}

            {stageId === 'recall' && (
              <div>
                <div className="rounded-3xl bg-white p-6 text-center shadow-sm">
                  <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
                    Say it from memory
                  </p>
                  <p className="mt-3 text-xl font-bold text-slate-700">{phrase.translation}</p>
                  {state.recallHint === 'letters' && (
                    <div className="mt-4 text-left">
                      <MaskedPhrase
                        text={phrase.text}
                        mode="letters"
                        hiddenIndices={hiddenIndices}
                        revealed={new Set()}
                        onReveal={() => dispatch({ type: 'SET_HINT', hint: 'full' })}
                      />
                    </div>
                  )}
                  {state.recallHint === 'full' && (
                    <>
                      <p className="mt-4 text-[1.4rem] font-bold leading-snug text-slate-800">
                        {phrase.text}
                      </p>
                      <div className="mt-3 flex justify-center">
                        <TtsButton text={phrase.text} lang={meta.ttsLang} size="sm" />
                      </div>
                    </>
                  )}
                  {state.recallHint !== 'full' && (
                    <div className="mt-4 flex justify-center gap-4">
                      {state.recallHint === 'none' && (
                        <button
                          onClick={() => dispatch({ type: 'SET_HINT', hint: 'letters' })}
                          className="text-sm font-semibold text-sage-600 active:text-sage-700"
                        >
                          Show a hint
                        </button>
                      )}
                      <button
                        onClick={() => dispatch({ type: 'SET_HINT', hint: 'full' })}
                        className="text-sm font-semibold text-slate-400 active:text-slate-600"
                      >
                        Reveal phrase
                      </button>
                    </div>
                  )}
                </div>
                <div className="mt-4">
                  <RecordPanel phrase={phrase} onMastered={() => dispatch({ type: 'COMPLETE' })} />
                </div>
                <button
                  onClick={() => dispatch({ type: 'COMPLETE' })}
                  className="mt-3 w-full py-2 text-sm font-semibold text-slate-400 active:text-slate-600"
                >
                  Finish without recording
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Footer controls */}
      {!state.completed && stageId !== 'recall' && (
        <div className="pt-4">
          <div className="flex gap-2">
            {(state.stage > 0 || state.chunkIndex > 0) && (
              <Button
                variant="ghost"
                onClick={() => dispatch({ type: 'BACK', chunkCount: chunks.length })}
              >
                Back
              </Button>
            )}
            <Button
              onClick={() => dispatch({ type: 'NEXT', chunkCount: chunks.length })}
              className="flex-1"
            >
              Next
            </Button>
          </div>
          <button
            onClick={() => dispatch({ type: 'SKIP_STAGE' })}
            className="mt-2 w-full py-1.5 text-sm font-semibold text-slate-400 active:text-slate-600"
          >
            Skip this step
          </button>
        </div>
      )}
      {!state.completed && stageId === 'recall' && (
        <div className="pt-4">
          <Button
            variant="ghost"
            onClick={() => dispatch({ type: 'BACK', chunkCount: chunks.length })}
            className="w-full"
          >
            Back
          </Button>
        </div>
      )}
    </div>
  );
}
