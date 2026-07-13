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
  /**
   * Manual "change phrase" offset for the phrase of the day. Keyed by
   * date + language + level so it resets automatically at midnight and
   * never bleeds into another language/level. Only today's entry is kept.
   */
  phraseShuffle: { key: string; offset: number } | null;

  // ── ephemeral (excluded from persistence) ──────────────────────────────
  view: AppView;
  settingsOpen: boolean;

  // ── actions ────────────────────────────────────────────────────────────
  setLanguage: (language: Language | null) => void;
  setLevel: (language: Language, level: Level) => void;
  setView: (view: AppView) => void;
  setSettingsOpen: (open: boolean) => void;
  markMastered: (phraseId: string, recordingMime: string) => void;
  /** Advance today's phrase to the next one in the pool for this key. */
  shufflePhrase: (key: string) => void;
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
      phraseShuffle: null,
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
      shufflePhrase: (key) =>
        set((state) => ({
          phraseShuffle: {
            key,
            offset: state.phraseShuffle?.key === key ? state.phraseShuffle.offset + 1 : 1,
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
        phraseShuffle: state.phraseShuffle,
      }),
    },
  ),
);
