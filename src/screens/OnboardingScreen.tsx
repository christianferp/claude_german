import { LANGUAGE_LIST, LANGUAGES } from '../lib/languages';
import type { Level } from '../lib/types';
import { PHRASES } from '../data/phrases';
import { useAppStore } from '../store/useAppStore';
import { BackIcon } from '../components/icons';

const LEVEL_DESCRIPTIONS: Record<Level, string> = {
  A1: 'Beginner · first words & everyday basics',
  A2: 'Elementary · simple conversations',
  B1: 'Intermediate · opinions & real life',
  B2: 'Upper intermediate · nuance & idioms',
};

/**
 * Two-step onboarding: pick a language, then a CEFR level.
 * Shown whenever the active language has no level yet.
 */
export function OnboardingScreen() {
  const language = useAppStore((state) => state.language);
  const setLanguage = useAppStore((state) => state.setLanguage);
  const setLevel = useAppStore((state) => state.setLevel);

  if (language === null) {
    return (
      <div className="flex min-h-dvh flex-col justify-center px-6 py-10">
        <p className="text-4xl">🗣️</p>
        <h1 className="mt-4 text-3xl font-bold text-slate-800">Daily Phrase</h1>
        <p className="mt-2 text-slate-500">
          One phrase a day — listen, speak it out loud, master it.
        </p>

        <p className="mt-8 text-xs font-bold uppercase tracking-wide text-slate-400">
          I want to learn…
        </p>
        <div className="mt-3 space-y-3">
          {LANGUAGE_LIST.map((meta) => (
            <button
              key={meta.code}
              onClick={() => setLanguage(meta.code)}
              className="flex w-full items-center gap-4 rounded-3xl bg-white p-5 text-left shadow-sm transition-all active:scale-[0.98] active:bg-sage-50"
            >
              <span className="text-3xl">{meta.flag}</span>
              <span>
                <span className="block text-lg font-bold text-slate-800">{meta.name}</span>
                <span className="block text-sm text-slate-500">
                  {meta.nativeName} · “{meta.sample}”
                </span>
              </span>
            </button>
          ))}
        </div>
      </div>
    );
  }

  const meta = LANGUAGES[language];

  return (
    <div className="flex min-h-dvh flex-col justify-center px-6 py-10">
      <button
        onClick={() => setLanguage(null)}
        className="flex items-center gap-1 self-start rounded-full py-1 pr-3 text-sm font-semibold text-slate-400 active:text-slate-600"
      >
        <BackIcon className="h-5 w-5" />
        Language
      </button>
      <h1 className="mt-4 text-3xl font-bold text-slate-800">
        Your {meta.name} level {meta.flag}
      </h1>
      <p className="mt-2 text-slate-500">Pick the CEFR level that fits you best right now.</p>

      <div className="mt-6 space-y-3">
        {(Object.keys(LEVEL_DESCRIPTIONS) as Level[]).map((lvl) => (
          <button
            key={lvl}
            onClick={() => setLevel(language, lvl)}
            className="flex w-full items-center gap-4 rounded-3xl bg-white p-5 text-left shadow-sm transition-all active:scale-[0.98] active:bg-sage-50"
          >
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-sage-100 text-lg font-bold text-sage-700">
              {lvl}
            </span>
            <span>
              <span className="block text-sm font-semibold text-slate-700">
                {LEVEL_DESCRIPTIONS[lvl]}
              </span>
              <span className="mt-0.5 block text-xs italic text-slate-400">
                “{PHRASES[language][lvl][0]?.text}”
              </span>
            </span>
          </button>
        ))}
      </div>

      {/* ─────────────────────────────────────────────────────────────────
          PLACEMENT TEST — future component slot.
          Replace the disabled button below with:
            <PlacementTest language={language} onComplete={(lvl) => setLevel(language, lvl)} />
          A short adaptive quiz that recommends a CEFR level instead of
          manual selection, feeding its result through the same setLevel().
         ───────────────────────────────────────────────────────────────── */}
      <button
        disabled
        className="mt-6 w-full rounded-2xl border-2 border-dashed border-cream-200 px-4 py-3.5 text-sm font-semibold text-slate-300"
      >
        Not sure? Take a placement test (coming soon)
      </button>
    </div>
  );
}
