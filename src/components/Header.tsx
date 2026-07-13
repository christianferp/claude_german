import { LANGUAGES } from '../lib/languages';
import { useAppStore } from '../store/useAppStore';
import { GearIcon } from './icons';

export function Header({ title }: { title: string }) {
  const language = useAppStore((state) => state.language);
  const level = useAppStore((state) =>
    state.language ? state.levels[state.language] : undefined,
  );
  const setSettingsOpen = useAppStore((state) => state.setSettingsOpen);

  return (
    <header className="flex items-center justify-between pb-2 pt-6">
      <h1 className="text-2xl font-bold text-slate-800">{title}</h1>
      <div className="flex items-center gap-2">
        {language && level && (
          <button
            onClick={() => setSettingsOpen(true)}
            className="rounded-full bg-sage-100 px-3 py-1.5 text-sm font-semibold text-sage-700 active:bg-sage-200"
            aria-label="Change language or level"
          >
            {LANGUAGES[language].flag} {level}
          </button>
        )}
        <button
          onClick={() => setSettingsOpen(true)}
          className="rounded-full p-2 text-slate-400 active:bg-cream-100"
          aria-label="Settings"
        >
          <GearIcon />
        </button>
      </div>
    </header>
  );
}
