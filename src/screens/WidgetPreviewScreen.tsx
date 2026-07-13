import { BackIcon } from '../components/icons';
import { usePhraseOfTheDay } from '../hooks/usePhraseOfTheDay';
import { LANGUAGES } from '../lib/languages';
import { useAppStore } from '../store/useAppStore';

/**
 * Concept preview of the future iOS lockscreen widget.
 * Pure mockup — real widgets need the native app (WidgetKit) once the web
 * app is wrapped with Capacitor. The toggle only saves the user's intent.
 */
export function WidgetPreviewScreen() {
  const phrase = usePhraseOfTheDay();
  const setView = useAppStore((state) => state.setView);
  const widgetEnabled = useAppStore((state) => state.widgetEnabled);
  const setWidgetEnabled = useAppStore((state) => state.setWidgetEnabled);

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

      {/* Mock toggle */}
      <div className="mt-6 flex items-center justify-between rounded-3xl bg-white p-5 shadow-sm">
        <div>
          <p className="font-semibold text-slate-700">Add to Lockscreen</p>
          <p className="text-xs text-slate-400">Saved for when the iOS app ships</p>
        </div>
        <button
          role="switch"
          aria-checked={widgetEnabled}
          onClick={() => setWidgetEnabled(!widgetEnabled)}
          className={`relative h-8 w-14 shrink-0 rounded-full transition-colors ${
            widgetEnabled ? 'bg-sage-500' : 'bg-slate-300'
          }`}
        >
          <span
            className={`absolute left-1 top-1 h-6 w-6 rounded-full bg-white shadow transition-transform ${
              widgetEnabled ? 'translate-x-6' : ''
            }`}
          />
        </button>
      </div>

      <p className="mt-4 px-2 pb-8 text-xs leading-relaxed text-slate-400">
        This is a concept preview. Real lockscreen widgets require the native iOS app — planned as
        a Capacitor wrapper around this exact web app, with the widget built in WidgetKit showing
        the same phrase of the day. Your preference is stored locally and will carry over.
      </p>
    </div>
  );
}
