import { useAppStore } from '../store/useAppStore';
import { BookIcon, SunIcon } from './icons';

export function TabBar() {
  const view = useAppStore((state) => state.view);
  const setView = useAppStore((state) => state.setView);

  const tabClass = (active: boolean) =>
    `flex flex-1 flex-col items-center gap-1 py-2.5 text-xs font-semibold transition-colors ${
      active ? 'text-sage-600' : 'text-slate-400'
    }`;

  return (
    <nav className="fixed inset-x-0 bottom-0 z-20 border-t border-cream-200 bg-white/90 pb-[env(safe-area-inset-bottom)] backdrop-blur">
      <div className="mx-auto flex w-full max-w-md">
        <button className={tabClass(view === 'today')} onClick={() => setView('today')}>
          <SunIcon />
          Today's Phrase
        </button>
        <button className={tabClass(view === 'library')} onClick={() => setView('library')}>
          <BookIcon />
          My Library
        </button>
      </div>
    </nav>
  );
}
