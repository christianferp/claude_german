# Daily Phrase 🗣️

Mobile-first language-learning MVP for **German 🇩🇪 and Spanish 🇪🇸**: one phrase a day per CEFR
level (A1–B2), AI-audio "Listen" playback, microphone pronunciation practice, and a library of
mastered phrases with your own recordings.

## Stack

- **Vite + React + TypeScript** — pure client-side SPA, `base: './'` so the same build drops into
  a Capacitor iOS shell later without changes.
- **Tailwind CSS v4** — palette defined as CSS `@theme` tokens in [src/index.css](src/index.css).
- **Zustand + persist** — level/progress metadata in localStorage (`daily-phrase-v1`).
- **IndexedDB** — recording blobs (`daily-phrase-audio` DB), via the zero-dependency wrapper in
  [src/services/audioStorage.ts](src/services/audioStorage.ts).
- **MediaRecorder + Web Audio API** — pronunciation capture with a live level meter.
- **Web Speech API** — TTS placeholder behind the swappable `TtsService` interface in
  [src/services/tts.ts](src/services/tts.ts) (plug in ElevenLabs/OpenAI TTS there later).

## Run

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # type-check + production build
npm run preview  # serve the production build
```

> **Microphone note:** `getUserMedia` needs a secure context. It works on `localhost`; on a LAN IP
> it will silently be unavailable (the app shows its "unsupported" state) — use HTTPS or a tunnel
> for phone testing.

## Structure

```
src/
├── data/phrases.ts       # mock phrase DB (its shape = future API contract)
├── lib/                  # types, language metadata, deterministic daily index
├── services/             # tts (swappable), audioStorage (IndexedDB)
├── store/useAppStore.ts  # persisted app state + navigation
├── hooks/                # useRecorder (mic state machine), usePhraseOfTheDay, useRecordingUrl
├── components/           # buttons, phrase card, record panel, level meter, tab bar, sheets
└── screens/              # Onboarding (placement-test slot), Today, Library, WidgetPreview
```

## Roadmap hooks already in place

- **Placement test** — commented slot in [src/screens/OnboardingScreen.tsx](src/screens/OnboardingScreen.tsx).
- **Real TTS** — implement `createRemoteTts()` in [src/services/tts.ts](src/services/tts.ts).
- **iOS app + lockscreen widget** — wrap with Capacitor; the widget concept lives in
  [src/screens/WidgetPreviewScreen.tsx](src/screens/WidgetPreviewScreen.tsx).
