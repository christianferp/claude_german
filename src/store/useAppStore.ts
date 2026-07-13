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
   * Shuffled phrase picks, keyed by `${language}:${level}:${dateISO}`.
   * When the user doesn't like today's phrase they can shuffle; the pick is
   * stored so it survives refreshes but naturally expires with the day.
   */
  phraseOverrides: Record<string, string>;

  // ── ephemeral (excluded from persistence) ──────────────────────────────
  view: AppView;
  settingsOpen: boolean;

  // ── actions ────────────────────────────────────────────────────────────
  setLanguage: (language: Language | null) => void;
  setLevel: (language: Language, level: Level) => void;
  setView: (view: AppView) => void;
  setSettingsOpen: (open: boolean) => void;
  markMastered: (phraseId: string, recordingMime: string) => void;
  setPhraseOverride: (key: string, phraseId: string) => void;
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
      phraseOverrides: {},
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
      setPhraseOverride: (key, phraseId) =>
        set((state) => {
          // Drop stale entries from previous days so the map never grows.
          const dateISO = key.slice(key.lastIndexOf(':') + 1);
          const kept = Object.fromEntries(
            Object.entries(state.phraseOverrides).filter(([k]) => k.endsWith(`:${dateISO}`)),
          );
          return { phraseOverrides: { ...kept, [key]: phraseId } };
        }),
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
        phraseOverrides: state.phraseOverrides,
      }),
    },
  ),
);
