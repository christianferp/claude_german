import { useState } from 'react';
import { usePhraseImage } from '../hooks/usePhraseImage';
import { useRecordingUrl } from '../hooks/useRecordingUrl';
import { LANGUAGES } from '../lib/languages';
import type { MasteredEntry, Phrase } from '../lib/types';
import { deleteMasteredRemote } from '../services/backend';
import { useAppStore } from '../store/useAppStore';
import { AudioPlayButton } from './AudioPlayButton';
import { MicIcon, StepsIcon, TrashIcon } from './icons';
import { RecordPanel } from './RecordPanel';
import { TtsButton } from './TtsButton';

interface LibraryItemProps {
  phrase: Phrase;
  entry: MasteredEntry;
}

export function LibraryItem({ phrase, entry }: LibraryItemProps) {
  const [rerecording, setRerecording] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const startPractice = useAppStore((state) => state.startPractice);
  const deleteMastered = useAppStore((state) => state.deleteMastered);

  const handleDelete = () => {
    deleteMastered(phrase.id);
    // Best-effort server cleanup; the local removal above is authoritative.
    void deleteMasteredRemote(phrase.id).catch(() => {});
  };
  // masteredAt changes on every re-record, which refreshes the object URL.
  const recordingUrl = useRecordingUrl(phrase.id, entry.masteredAt);
  const meta = LANGUAGES[phrase.language];
  // Cached/shared cartoon only — scrolling the library never generates.
  const imageUrl = usePhraseImage(phrase, false);

  return (
    <li className="rounded-3xl bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          {imageUrl && (
            <img
              src={imageUrl}
              alt=""
              className="mt-0.5 h-14 w-14 shrink-0 rounded-xl object-cover"
            />
          )}
          <div>
            <p className="text-lg font-bold leading-snug text-slate-800">{phrase.text}</p>
            <p className="mt-1 text-sm text-slate-500">{phrase.translation}</p>
          </div>
        </div>
        <span className="shrink-0 rounded-full bg-sage-50 px-2.5 py-1 text-xs font-semibold text-sage-600">
          {meta.flag} {phrase.level}
        </span>
      </div>

      <p className="mt-2 text-xs text-slate-400">
        Mastered {new Date(entry.masteredAt).toLocaleDateString()}
      </p>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <TtsButton text={phrase.text} lang={meta.ttsLang} size="sm" />
        <AudioPlayButton src={recordingUrl} label="Your take" size="sm" />
        <button
          onClick={() => setRerecording((open) => !open)}
          className={`flex items-center gap-1.5 rounded-full px-3 py-2 text-sm font-semibold transition-colors ${
            rerecording
              ? 'bg-blush-100 text-blush-600'
              : 'bg-cream-100 text-slate-600 active:bg-cream-200'
          }`}
        >
          <MicIcon className="h-4 w-4" />
          {rerecording ? 'Cancel' : 'Re-record'}
        </button>
        <button
          onClick={() => startPractice(phrase.id, 'library')}
          className="flex items-center gap-1.5 rounded-full bg-cream-100 px-3 py-2 text-sm font-semibold text-slate-600 active:bg-cream-200"
        >
          <StepsIcon className="h-4 w-4" />
          Practice
        </button>
        {confirmingDelete ? (
          <span className="flex items-center gap-1.5">
            <button
              onClick={handleDelete}
              className="flex items-center gap-1.5 rounded-full bg-blush-500 px-3 py-2 text-sm font-semibold text-white active:bg-blush-600"
            >
              <TrashIcon className="h-4 w-4" />
              Delete?
            </button>
            <button
              onClick={() => setConfirmingDelete(false)}
              className="rounded-full bg-cream-100 px-3 py-2 text-sm font-semibold text-slate-600 active:bg-cream-200"
            >
              Keep
            </button>
          </span>
        ) : (
          <button
            onClick={() => setConfirmingDelete(true)}
            className="flex items-center gap-1.5 rounded-full bg-cream-100 px-3 py-2 text-sm font-semibold text-slate-400 active:bg-cream-200"
            aria-label={`Delete "${phrase.text}" from mastered`}
          >
            <TrashIcon className="h-4 w-4" />
          </button>
        )}
      </div>
      {confirmingDelete && (
        <p className="mt-2 text-xs text-slate-400">
          Removes it from your library (and your account) — the phrase returns to the daily
          rotation.
        </p>
      )}

      {rerecording && (
        <div className="mt-3">
          <RecordPanel phrase={phrase} onMastered={() => setRerecording(false)} />
        </div>
      )}
    </li>
  );
}
