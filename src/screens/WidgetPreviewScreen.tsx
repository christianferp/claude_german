import { Capacitor } from '@capacitor/core';
import { BackIcon } from '../components/icons';
import { usePhraseOfTheDay } from '../hooks/usePhraseOfTheDay';
import { LANGUAGES } from '../lib/languages';
import { useAppStore } from '../store/useAppStore';

/**
 * The lockscreen widget: a preview of what it shows, plus how to add it.
 *
 * In the browser this is still a mockup — a real widget only exists in the
 * native iOS app (WidgetKit), which is why the instructions below only appear
 * when running there.
 */
export function WidgetPreviewScreen() {
  const phrase = usePhraseOfTheDay();
  const setView = useAppStore((state) => state.setView);
  const native = Capacitor.getPlatform() === 'ios';

  if (!phrase) return null;
  const meta = LANGUAGES[phrase.language];

  const dateLine = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });

  return (
    <div className="px-5">
      <header className="flex items-center gap-2 pb-4 pt-6">
        <button
          onClick={() => setView('today')}
          className="rounded-full p-2 text-slate-500 active:bg-cream-100"
          aria-label="Back to Today"
        >
          <BackIcon />
        </button>
        <h1 className="text-2xl font-bold text-slate-800">Lockscreen Widget</h1>
      </header>

      {/* iPhone lockscreen mockup */}
      <div className="mx-auto max-w-[300px] rounded-[2.5rem] border-[6px] border-slate-800 bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 px-6 pb-16 pt-10 text-white shadow-xl">
        <p className="text-center text-sm font-medium text-white/70">{dateLine}</p>
        <p className="text-center text-6xl font-extralight tracking-tight">9:41</p>

        {/* The widget itself */}
        <div className="mt-6 rounded-2xl border border-white/10 bg-white/15 p-4 backdrop-blur">
          <p className="text-[10px] font-bold uppercase tracking-widest text-white/60">
            {meta.flag} Phrase of the day
          </p>
          <p className="mt-1.5 text-base font-semibold leading-snug">{phrase.text}</p>
          <p className="mt-1 text-xs text-white/60">{phrase.translation}</p>
        </div>

        <div className="mt-14 flex justify-center">
          <div className="h-1 w-28 rounded-full bg-white/80" />
        </div>
      </div>

      {native ? (
        <section className="mt-6 rounded-3xl bg-white p-5 shadow-sm">
          <p className="font-semibold text-slate-700">Add it to your lockscreen</p>
          <ol className="mt-3 space-y-2 text-sm text-slate-500">
            <li>1. Press and hold the lockscreen, then tap Customise.</li>
            <li>2. Tap the area under the clock, then find Daily Phrase.</li>
            <li>3. Pick the wide widget and close the editor.</li>
          </ol>
          <p className="mt-3 text-xs text-slate-400">
            It also works on the home screen — press and hold the wallpaper, tap +, then search for
            Daily Phrase. The phrase changes at midnight, and straight away whenever you change it
            here.
          </p>
        </section>
      ) : (
        <p className="mt-6 px-2 pb-8 text-xs leading-relaxed text-slate-400">
          This is a preview of the widget. The real one lives in the iOS app, which wraps this same
          web app — open this screen there to add it to your lockscreen or home screen.
        </p>
      )}
    </div>
  );
}
