import { Header } from '../components/Header';
import { LibraryItem } from '../components/LibraryItem';
import { getPhraseById } from '../data/phrases';
import type { MasteredEntry, Phrase } from '../lib/types';
import { useAppStore } from '../store/useAppStore';

export function LibraryScreen() {
  const mastered = useAppStore((state) => state.mastered);

  const items = Object.values(mastered)
    .map((entry) => ({ entry, phrase: getPhraseById(entry.phraseId) }))
    .filter((item): item is { entry: MasteredEntry; phrase: Phrase } => Boolean(item.phrase))
    .sort((a, b) => b.entry.masteredAt - a.entry.masteredAt);

  return (
    <div className="px-5">
      <Header title="My Library" />
      <p className="pb-4 text-sm text-slate-400">
        {items.length === 0
          ? 'Your mastered phrases will live here.'
          : `${items.length} mastered ${items.length === 1 ? 'phrase' : 'phrases'}`}
      </p>

      {items.length === 0 ? (
        <div className="rounded-3xl bg-white p-8 text-center shadow-sm">
          <p className="text-3xl">🌱</p>
          <p className="mt-3 font-semibold text-slate-700">Nothing mastered yet</p>
          <p className="mt-1 text-sm text-slate-500">
            Head to the Today tab, record today's phrase and mark it as mastered — it will show up
            here with your recording.
          </p>
        </div>
      ) : (
        <ul className="space-y-3">
          {items.map(({ entry, phrase }) => (
            <LibraryItem key={phrase.id} phrase={phrase} entry={entry} />
          ))}
        </ul>
      )}
    </div>
  );
}
