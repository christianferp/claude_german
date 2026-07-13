import { useEffect } from 'react';
import { SettingsSheet } from './components/SettingsSheet';
import { TabBar } from './components/TabBar';
import { LibraryScreen } from './screens/LibraryScreen';
import { OnboardingScreen } from './screens/OnboardingScreen';
import { PracticeScreen } from './screens/PracticeScreen';
import { TodayScreen } from './screens/TodayScreen';
import { WidgetPreviewScreen } from './screens/WidgetPreviewScreen';
import { initBackend } from './services/backend';
import { useAppStore } from './store/useAppStore';

export default function App() {
  // Auth listener + sign-in sync; inert while Supabase is unconfigured.
  useEffect(() => {
    initBackend();
  }, []);

  const language = useAppStore((state) => state.language);
  const level = useAppStore((state) =>
    state.language ? state.levels[state.language] : undefined,
  );
  const view = useAppStore((state) => state.view);
  const settingsOpen = useAppStore((state) => state.settingsOpen);

  // No language or no level for the active language → onboarding.
  const needsOnboarding = !language || !level;

  return (
    <div className="mx-auto min-h-dvh w-full max-w-md">
      {needsOnboarding ? (
        <OnboardingScreen />
      ) : (
        <>
          <main className="pb-28">
            {view === 'today' && <TodayScreen />}
            {view === 'library' && <LibraryScreen />}
            {view === 'widget' && <WidgetPreviewScreen />}
            {view === 'practice' && <PracticeScreen />}
          </main>
          {view !== 'widget' && view !== 'practice' && <TabBar />}
          {settingsOpen && <SettingsSheet />}
        </>
      )}
    </div>
  );
}
