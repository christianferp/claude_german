import type { CapacitorConfig } from '@capacitor/cli';

/**
 * Native shell config. The web app is the app — `webDir` is the same `dist/`
 * that GitHub Pages serves, which works unchanged because `vite.config.ts`
 * sets `base: './'` (relative asset paths load fine from both an https origin
 * and `capacitor://localhost`).
 *
 * Nothing here affects `npm run dev`; the browser workflow is untouched.
 */
const config: CapacitorConfig = {
  appId: 'com.christianferp.dailyphrase',
  appName: 'Daily Phrase',
  webDir: 'dist',
  ios: {
    // The app draws its own safe-area padding (see TabBar's
    // `env(safe-area-inset-bottom)`), so let the web view own the full screen.
    contentInset: 'never',
  },
};

export default config;
