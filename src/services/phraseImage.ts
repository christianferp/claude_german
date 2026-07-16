/**
 * Funny cartoon illustration per phrase — a memory hook for the learner.
 *
 * Images are expensive (quota + latency), so they are generated exactly once
 * and then reused forever, in cascading order:
 *   1. this device's IndexedDB cache
 *   2. the shared public Supabase bucket (one image per phrase, any user's
 *      generation benefits everyone)
 *   3. fresh generation with the user's Gemini key (only when asked to) —
 *      then saved to 1 and, when signed in, uploaded to 2.
 */

import { isBackendConfigured, SUPABASE_URL } from '../config';
import { base64ToBytes } from '../lib/audio';
import { LANGUAGES } from '../lib/languages';
import type { Phrase } from '../lib/types';
import { useAppStore } from '../store/useAppStore';
import { getSupabase } from './backend';
import { GEMINI_BASE_URL } from './gemini';
import { imageStorage } from './imageStorage';

/**
 * Image model names churn as Google ships new "Nano Banana" generations;
 * walk the list on 404 and remember what worked (same pattern as STT).
 */
const IMAGE_MODEL_CANDIDATES = [
  'gemini-3.1-flash-lite-image',
  'gemini-3.1-flash-image',
  'gemini-2.5-flash-image',
  'gemini-2.5-flash-image-preview',
];
let imageModelIndex = 0;

const BUCKET = 'phrase-images';

/** One in-flight lookup/generation per phrase, shared between callers. */
const pending = new Map<string, Promise<Blob | null>>();

function buildPrompt(phrase: Phrase): string {
  const languageName = LANGUAGES[phrase.language].name;
  return (
    `Create one funny, memorable cartoon illustration for a language-learning app. ` +
    `It must depict, with humour and exaggeration, the meaning of the ${languageName} phrase: ` +
    `"${phrase.text}" (English: "${phrase.translation}"). ` +
    `Style: simple flat cartoon, bold outlines, bright friendly colours, landscape composition. ` +
    `Strictly NO text, letters, captions or speech bubbles anywhere in the image.`
  );
}

async function generateImage(phrase: Phrase): Promise<Blob | null> {
  const apiKey = useAppStore.getState().geminiApiKey;
  if (!apiKey) return null;

  while (imageModelIndex < IMAGE_MODEL_CANDIDATES.length) {
    const model = IMAGE_MODEL_CANDIDATES[imageModelIndex];
    const response = await fetch(`${GEMINI_BASE_URL}/models/${model}:generateContent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
      body: JSON.stringify({ contents: [{ parts: [{ text: buildPrompt(phrase) }] }] }),
    });
    if (response.status === 404) {
      imageModelIndex++;
      continue;
    }
    if (!response.ok) return null;

    const payload = (await response.json()) as {
      candidates?: { content?: { parts?: { inlineData?: { mimeType?: string; data?: string } }[] } }[];
    };
    const inline = payload.candidates?.[0]?.content?.parts?.find((part) =>
      part.inlineData?.mimeType?.startsWith('image/'),
    )?.inlineData;
    if (!inline?.data) return null;
    return new Blob([base64ToBytes(inline.data).buffer as ArrayBuffer], {
      type: inline.mimeType ?? 'image/png',
    });
  }
  return null;
}

async function fetchFromBucket(phraseId: string): Promise<Blob | null> {
  if (!isBackendConfigured) return null;
  try {
    const response = await fetch(
      `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${phraseId}.png`,
    );
    if (!response.ok) return null;
    return await response.blob();
  } catch {
    return null;
  }
}

async function uploadToBucket(phraseId: string, blob: Blob): Promise<void> {
  const supabase = getSupabase();
  if (!supabase) return;
  const { data } = await supabase.auth.getSession();
  if (!data.session) return; // bucket writes require a signed-in user
  await supabase.storage
    .from(BUCKET)
    .upload(`${phraseId}.png`, blob, { contentType: blob.type, upsert: false });
}

/**
 * The illustration for a phrase, or null if unavailable. With
 * `generate: false` only the caches are consulted (used by the Library so
 * scrolling never burns generation quota).
 */
export function getPhraseImage(phrase: Phrase, options: { generate: boolean }): Promise<Blob | null> {
  const key = `${phrase.id}:${options.generate ? 'gen' : 'cached'}`;
  let request = pending.get(key);
  if (!request) {
    request = (async () => {
      const local = await imageStorage.getImage(phrase.id).catch(() => null);
      if (local) return local;

      const shared = await fetchFromBucket(phrase.id);
      if (shared) {
        await imageStorage.saveImage(phrase.id, shared).catch(() => {});
        return shared;
      }

      if (!options.generate) return null;
      const generated = await generateImage(phrase).catch(() => null);
      if (generated) {
        await imageStorage.saveImage(phrase.id, generated).catch(() => {});
        void uploadToBucket(phrase.id, generated).catch(() => {});
      }
      return generated;
    })().finally(() => pending.delete(key));
    pending.set(key, request);
  }
  return request;
}
