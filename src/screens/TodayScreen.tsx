import { Button } from '../components/Button';
import { Header } from '../components/Header';
import { PhraseCard } from '../components/PhraseCard';
import { RecordPanel } from '../components/RecordPanel';
import { TtsButton } from '../components/TtsButton';
import { CheckIcon, LockIcon, ShuffleIcon, StepsIcon } from '../components/icons';
import { useChangePhrase, usePhraseOfTheDay } from '../hooks/usePhraseOfTheDay';
import { LANGUAGES } from '../lib/languages';
import { tts } from '../services/tts';
import { useAppStore } from '../store/useAppStore';

export function TodayScreen() {
  const phrase = usePhraseOfTheDay();
  const changePhrase = useChangePhrase();
  const startPractice = useAppStore((state) => state.startPractice);
  const isMastered = useAppStore((state) =>
    phrase ? Boolean(state.mastered[phrase.id]) : false,
  );
  const setView = useAppStore((state) => state.setView);

  if (!phrase) return null;
  const meta = LANGUAGES[phrase.language];

  const dateLine = new Date().toLocaleDateString('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });

  return (
    <div className="px-5">
      <Header title="Today's Phrase" />
      <div className="flex items-center gap-2 pb-4">
        <p className="text-sm text-slate-400">{dateLine}</p>
        {isMastered && (
          <span className="flex items-center gap-1 rounded-full bg-sage-100 px-2.5 py-0.5 text-xs font-semibold text-sage-700">
            <CheckIcon className="h-3.5 w-3.5" />
            Mastered
          </span>
        )}
      </div>

      <PhraseCard phrase={phrase} />

      <button
        onClick={changePhrase}
        className="mt-3 flex w-full items-center justify-center gap-2 rounded-2xl border border-sage-200 bg-white py-2.5 text-sm font-semibold text-sage-700 transition-all duration-150 active:scale-[0.98] active:bg-sage-50"
      >
        <ShuffleIcon className="h-4 w-4" />
        Change phrase
      </button>

      <Button
        variant="secondary"
        onClick={() => startPractice(phrase.id, 'today')}
        className="mt-3 w-full"
      >
        <StepsIcon />
        Memorize step by step
      </Button>

      <div className="mt-4">
        <TtsButton text={phrase.text} lang={meta.ttsLang} />
        {!tts.isAvailable(meta.ttsLang) && (
          <p className="mt-2 px-1 text-xs text-slate-400">
            No {meta.name} voice is installed in this browser — playback may use a fallback voice.
          </p>
        )}
      </div>

      <div className="mt-4">
        <RecordPanel phrase={phrase} />
      </div>

      <button
        onClick={() => setView('widget')}
        className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl py-3 text-sm font-semibold text-slate-400 active:text-slate-600"
      >
        <LockIcon />
        Preview the lockscreen widget →
      </button>
    </div>
  );
}
