import { useEffect, useState } from 'react';
import type { Phrase } from '../lib/types';
import { getPhraseImage } from '../services/phraseImage';
import { useAppStore } from '../store/useAppStore';

/**
 * Object URL of the phrase's cartoon illustration, or null while loading /
 * when none exists. `generate` allows creating a new image (Today screen);
 * without it only cached/shared images are shown (Library).
 */
export function usePhraseImage(phrase: Phrase | null, generate: boolean): string | null {
  const [url, setUrl] = useState<string | null>(null);
  const phraseId = phrase?.id;
  // Re-run when a Gemini key is saved so generation kicks in immediately.
  const hasGeminiKey = useAppStore((state) => Boolean(state.geminiApiKey));

  useEffect(() => {
    if (!phrase) {
      setUrl(null);
      return;
    }
    let objectUrl: string | null = null;
    let cancelled = false;
    void getPhraseImage(phrase, { generate })
      .then((blob) => {
        if (cancelled || !blob) return;
        objectUrl = URL.createObjectURL(blob);
        setUrl(objectUrl);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
      setUrl(null);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- phrase identity == id
  }, [phraseId, generate, hasGeminiKey]);

  return url;
}
