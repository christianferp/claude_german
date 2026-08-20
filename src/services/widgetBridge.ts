/**
 * Publishes the current phrase selection to the iOS widget.
 *
 * A no-op everywhere except the native iOS app, so the web build carries it
 * without behaving differently — `registerPlugin`'s web implementation is what
 * runs in a browser.
 */

import { Capacitor, registerPlugin } from '@capacitor/core';
import type { DailyStreak } from '../lib/streak';
import type { Language, Level, Phrase } from '../lib/types';

interface WidgetBridgePlugin {
  setSnapshot(options: { json: string }): Promise<{ written: boolean }>;
}

const WidgetBridge = registerPlugin<WidgetBridgePlugin>('WidgetBridge', {
  // In the browser there is no widget to update.
  web: {
    setSnapshot: async () => ({ written: false }),
  },
});

/** Mirrors `PhraseSnapshot` in ios/App/Shared/DailyPhraseShared.swift. */
interface Snapshot {
  phraseId: string;
  text: string;
  translation: string;
  language: Language;
  level: Level;
  dateISO: string;
  streak: number;
}

/** Last payload sent, so repeated renders don't re-cross the bridge. */
let lastJson: string | null = null;

/**
 * Hand the widget today's phrase. Safe to call on every render — identical
 * payloads are dropped, and anything that goes wrong is swallowed: failing to
 * update a widget must never disturb the app.
 */
export function publishWidgetSnapshot(
  phrase: Phrase,
  level: Level,
  dateISO: string,
  streak: DailyStreak,
): void {
  if (Capacitor.getPlatform() !== 'ios') return;

  const snapshot: Snapshot = {
    phraseId: phrase.id,
    text: phrase.text,
    translation: phrase.translation,
    language: phrase.language,
    level,
    dateISO,
    streak: streak.current,
  };
  const json = JSON.stringify(snapshot);
  if (json === lastJson) return;
  lastJson = json;

  void WidgetBridge.setSnapshot({ json }).catch(() => {
    // Let the next change retry rather than caching a failed send.
    lastJson = null;
  });
}
