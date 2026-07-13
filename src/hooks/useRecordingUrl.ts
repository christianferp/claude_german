import { useEffect, useState } from 'react';
import { audioStorage } from '../services/audioStorage';
import { downloadRecording } from '../services/backend';

/**
 * Loads a saved recording from IndexedDB and exposes it as an object URL.
 * The URL is revoked on unmount and whenever the phrase or refreshKey
 * changes (pass a value that changes on re-record, e.g. masteredAt).
 */
export function useRecordingUrl(phraseId: string | null, refreshKey: number = 0): string | null {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!phraseId) {
      setUrl(null);
      return;
    }
    let objectUrl: string | null = null;
    let cancelled = false;

    void audioStorage
      .getRecording(phraseId)
      // Not on this device → try the cloud backup (no-op when signed out).
      .then((blob) => blob ?? downloadRecording(phraseId))
      .then((blob) => {
        if (cancelled || !blob) return;
        objectUrl = URL.createObjectURL(blob);
        setUrl(objectUrl);
      })
      .catch(() => {
        /* recording unavailable — button simply stays disabled */
      });

    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
      setUrl(null);
    };
  }, [phraseId, refreshKey]);

  return url;
}
