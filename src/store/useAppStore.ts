import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { AppView, Language, Level, MasteredEntry } from '../lib/types';
import { audioStorage } from '../services/audioStorage';
import { DEFAULT_GEMINI_TTS_MODEL } from '../services/gemini';

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
  /**
   * User-supplied Google AI Studio key for Gemini TTS. Lives only in this
   * browser's localStorage — the app is a static site with no backend, so
   * shipping a shared key would publish it to the world.
   */
  geminiApiKey: string;
  /** Which Gemini TTS model speaks the phrases; ids in services/gemini.ts. */
  geminiTtsModel: string;
  /** Opt-in: also upload recordings to the user's Supabase storage. */
  backupRecordings: boolean;

  // ── ephemeral (excluded from persistence) ──────────────────────────────
  view: AppView;
  settingsOpen: boolean;
  /** Phrase being practiced in the memorization wizard. */
  practicePhraseId: string | null;
  /** Where the wizard's exit button returns to. */
  practiceReturnView: AppView;
  /** Signed-in Supabase user; null when logged out or backend unconfigured. */
  authUser: { id: string; email: string } | null;

  // ── actions ────────────────────────────────────────────────────────────
  setLanguage: (language: Language | null) => void;
  setLevel: (language: Language, level: Level) => void;
  setView: (view: AppView) => void;
  setSettingsOpen: (open: boolean) => void;
  markMastered: (phraseId: string, recordingMime: string) => void;
  /** Advance today's phrase to the next one in the pool for this key. */
  shufflePhrase: (key: string) => void;
  setGeminiApiKey: (key: string) => void;
  setGeminiTtsModel: (model: string) => void;
  startPractice: (phraseId: string, returnView: AppView) => void;
  setAuthUser: (user: { id: string; email: string } | null) => void;
  setBackupRecordings: (enabled: boolean) => void;
  /** Adopt rows pulled from the backend (newer-wins merge done by caller). */
  mergeMastered: (entries: MasteredEntry[]) => void;
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
      geminiApiKey: '',
      geminiTtsModel: DEFAULT_GEMINI_TTS_MODEL,
      backupRecordings: false,
      view: 'today',
      settingsOpen: false,
      practicePhraseId: null,
      practiceReturnView: 'today',
      authUser: null,

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
      setGeminiApiKey: (geminiApiKey) => set({ geminiApiKey: geminiApiKey.trim() }),
      setGeminiTtsModel: (geminiTtsModel) => set({ geminiTtsModel }),
      startPractice: (practicePhraseId, practiceReturnView) =>
        set({ practicePhraseId, practiceReturnView, view: 'practice' }),
      setAuthUser: (authUser) => set({ authUser }),
      setBackupRecordings: (backupRecordings) => set({ backupRecordings }),
      mergeMastered: (entries) =>
        set((state) => ({
          mastered: {
            ...state.mastered,
            ...Object.fromEntries(entries.map((entry) => [entry.phraseId, entry])),
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
        geminiApiKey: state.geminiApiKey,
        geminiTtsModel: state.geminiTtsModel,
        backupRecordings: state.backupRecordings,
      }),
    },
  ),
);
