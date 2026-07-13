import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { AppView, Language, Level, MasteredEntry } from '../lib/types';
import { audioStorage } from '../services/audioStorage';

interface AppState {
  // ── persisted ──────────────────────────────────────────────────────────
  /** Active target language; null until onboarding picks one. */
  language: Language | null;
  /** CEFR level per language (a user can be B1 German but A1 Spanish). */
  levels: Partial<Record<Language, Level>>;
  /** Mastered phrases keyed by phrase id; audio blobs live in IndexedDB. */
  mastered: Record<string, MasteredEntry>;
  /** Mock "Add to Lockscreen" preference from the widget concept screen. */
  widgetEnabled: boolean;

  // ── ephemeral (excluded from persistence) ──────────────────────────────
  view: AppView;
  settingsOpen: boolean;

  // ── actions ────────────────────────────────────────────────────────────
  setLanguage: (language: Language | null) => void;
  setLevel: (language: Language, level: Level) => void;
  setView: (view: AppView) => void;
  setSettingsOpen: (open: boolean) => void;
  markMastered: (phraseId: string, recordingMime: string) => void;
  setWidgetEnabled: (enabled: boolean) => void;
  resetProgress: () => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      language: null,
      levels: {},
      mastered: {},
      widgetEnabled: false,
      view: 'today',
      settingsOpen: false,

      setLanguage: (language) => set({ language, view: 'today' }),
      setLevel: (language, level) =>
        set((state) => ({ levels: { ...state.levels, [language]: level } })),
      setView: (view) => set({ view }),
      setSettingsOpen: (settingsOpen) => set({ settingsOpen }),
      markMastered: (phraseId, recordingMime) =>
        set((state) => ({
          mastered: {
            ...state.mastered,
            [phraseId]: { phraseId, masteredAt: Date.now(), recordingMime },
          },
        })),
      setWidgetEnabled: (widgetEnabled) => set({ widgetEnabled }),
      resetProgress: () => {
        void audioStorage.clear().catch(() => {
          /* storage may be unavailable; metadata reset still proceeds */
        });
        set({ mastered: {} });
      },
    }),
    {
      name: 'daily-phrase-v1',
      version: 1,
      partialize: (state) => ({
        language: state.language,
        levels: state.levels,
        mastered: state.mastered,
        widgetEnabled: state.widgetEnabled,
      }),
    },
  ),
);
