import { useState } from 'react';
import { LANGUAGE_LIST } from '../lib/languages';
import { LEVELS } from '../lib/types';
import { useAppStore } from '../store/useAppStore';
import { LockIcon } from './icons';

/** Bottom-sheet modal: switch language / level, widget preview, reset. */
export function SettingsSheet() {
  const language = useAppStore((state) => state.language);
  const levels = useAppStore((state) => state.levels);
  const setLanguage = useAppStore((state) => state.setLanguage);
  const setLevel = useAppStore((state) => state.setLevel);
  const setView = useAppStore((state) => state.setView);
  const setSettingsOpen = useAppStore((state) => state.setSettingsOpen);
  const resetProgress = useAppStore((state) => state.resetProgress);
  const [confirmingReset, setConfirmingReset] = useState(false);

  const close = () => setSettingsOpen(false);

  return (
    <div className="fixed inset-0 z-30" role="dialog" aria-modal="true" aria-label="Settings">
      <button className="absolute inset-0 bg-black/30" onClick={close} aria-label="Close settings" />
      <div className="absolute inset-x-0 bottom-0 mx-auto w-full max-w-md rounded-t-3xl bg-white p-6 pb-[calc(1.5rem+env(safe-area-inset-bottom))]">
        <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-cream-200" />
        <h2 className="text-lg font-bold text-slate-800">Settings</h2>

        <p className="mt-4 text-xs font-bold uppercase tracking-wide text-slate-400">Language</p>
        <div className="mt-2 flex gap-2">
          {LANGUAGE_LIST.map((meta) => (
            <button
              key={meta.code}
              onClick={() => {
                setLanguage(meta.code);
                // No level chosen for this language yet → onboarding takes over.
                if (!levels[meta.code]) close();
              }}
              className={`flex-1 rounded-2xl border-2 px-4 py-3 text-sm font-semibold transition-colors ${
                language === meta.code
                  ? 'border-sage-500 bg-sage-50 text-sage-700'
                  : 'border-cream-200 text-slate-500 active:bg-cream-100'
              }`}
            >
              {meta.flag} {meta.name}
            </button>
          ))}
        </div>

        {language && (
          <>
            <p className="mt-4 text-xs font-bold uppercase tracking-wide text-slate-400">Level</p>
            <div className="mt-2 flex gap-2">
              {LEVELS.map((lvl) => (
                <button
                  key={lvl}
                  onClick={() => setLevel(language, lvl)}
                  className={`flex-1 rounded-2xl border-2 py-2.5 text-sm font-bold transition-colors ${
                    levels[language] === lvl
                      ? 'border-sage-500 bg-sage-50 text-sage-700'
                      : 'border-cream-200 text-slate-500 active:bg-cream-100'
                  }`}
                >
                  {lvl}
                </button>
              ))}
            </div>
          </>
        )}

        <button
          onClick={() => {
            setView('widget');
            close();
          }}
          className="mt-5 flex w-full items-center gap-2 rounded-2xl bg-cream-100 px-4 py-3.5 text-sm font-semibold text-slate-600 active:bg-cream-200"
        >
          <LockIcon />
          Lockscreen widget preview
        </button>

        {confirmingReset ? (
          <div className="mt-3 flex gap-2">
            <button
              onClick={() => setConfirmingReset(false)}
              className="flex-1 rounded-2xl bg-cream-100 px-4 py-3.5 text-sm font-semibold text-slate-600"
            >
              Keep my progress
            </button>
            <button
              onClick={() => {
                resetProgress();
                setConfirmingReset(false);
              }}
              className="flex-1 rounded-2xl bg-blush-500 px-4 py-3.5 text-sm font-semibold text-white active:bg-blush-600"
            >
              Yes, delete everything
            </button>
          </div>
        ) : (
          <button
            onClick={() => setConfirmingReset(true)}
            className="mt-3 w-full rounded-2xl px-4 py-3.5 text-sm font-semibold text-blush-600 active:bg-blush-100"
          >
            Reset progress…
          </button>
        )}
      </div>
    </div>
  );
}
