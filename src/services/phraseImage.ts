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
 * Image model names churn as Google ships new "Nano Banana" generations, so
 * hardcoded ids rot. Instead, ask the API which image-capable models this
 * key can use (a free ListModels call), rank them (newest flash first), and
 * remember what actually works. Static seeds remain as a last resort.
 */
const FALLBACK_IMAGE_MODELS = ['gemini-2.5-flash-image', 'gemini-2.5-flash-image-preview'];
let discoveredModels: Promise<string[]> | null = null;
let workingModel: string | null = null;

function rankImageModel(id: string): number {
  const version = /(\d+)\.(\d+)/.exec(id);
  return (
    (version ? Number(version[1]) * 10 + Number(version[2]) : 0) +
    (id.includes('flash') ? 5 : 0) +
    (id.includes('lite') ? 1 : 0) +
    (id.includes('preview') ? -0.5 : 0)
  );
}

async function listImageModels(apiKey: string): Promise<string[]> {
  if (!discoveredModels) {
    discoveredModels = (async () => {
      try {
        const response = await fetch(`${GEMINI_BASE_URL}/models?pageSize=1000`, {
          headers: { 'x-goog-api-key': apiKey },
        });
        if (!response.ok) return FALLBACK_IMAGE_MODELS;
        const payload = (await response.json()) as {
          models?: { name?: string; supportedGenerationMethods?: string[] }[];
        };
        const ids = (payload.models ?? [])
          .filter((model) => (model.supportedGenerationMethods ?? []).includes('generateContent'))
          .map((model) => (model.name ?? '').replace(/^models\//, ''))
          .filter((id) => id.includes('image') && !id.startsWith('imagen') && !id.includes('veo'))
          .sort((a, b) => rankImageModel(b) - rankImageModel(a));
        const merged = [...ids, ...FALLBACK_IMAGE_MODELS.filter((id) => !ids.includes(id))];
        return merged.length > 0 ? merged : FALLBACK_IMAGE_MODELS;
      } catch {
        discoveredModels = null; // allow a retry later
        return FALLBACK_IMAGE_MODELS;
      }
    })();
  }
  return discoveredModels;
}

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

interface GenerateContentImagePayload {
  candidates?: { content?: { parts?: { inlineData?: { mimeType?: string; data?: string } }[] } }[];
}

function extractImage(payload: GenerateContentImagePayload): Blob | null {
  const inline = payload.candidates?.[0]?.content?.parts?.find((part) =>
    part.inlineData?.mimeType?.startsWith('image/'),
  )?.inlineData;
  if (!inline?.data) return null;
  return new Blob([base64ToBytes(inline.data).buffer as ArrayBuffer], {
    type: inline.mimeType ?? 'image/png',
  });
}

/**
 * One model attempt. Some model generations require
 * `responseModalities: ["TEXT","IMAGE"]`, others reject unknown config —
 * try with it first, then bare. Returns 'next' when the model should be
 * skipped, 'abort' on key/quota problems where no model will do better.
 */
async function tryModel(
  model: string,
  prompt: string,
  apiKey: string,
): Promise<Blob | 'next' | 'abort'> {
  for (const withConfig of [true, false]) {
    const body: Record<string, unknown> = { contents: [{ parts: [{ text: prompt }] }] };
    if (withConfig) body.generationConfig = { responseModalities: ['TEXT', 'IMAGE'] };
    const response = await fetch(`${GEMINI_BASE_URL}/models/${model}:generateContent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
      body: JSON.stringify(body),
    });
    if (response.ok) {
      const image = extractImage((await response.json()) as GenerateContentImagePayload);
      if (image) return image;
      continue; // answered without an image — retry shape, then next model
    }
    if ([401, 403, 429].includes(response.status)) return 'abort';
    console.warn(`Phrase image: ${model} responded HTTP ${response.status}`);
    if (response.status === 404) return 'next';
    // 400 etc. → try the other request shape, then the next model.
  }
  return 'next';
}

async function generateImage(phrase: Phrase): Promise<Blob | null> {
  const apiKey = useAppStore.getState().geminiApiKey;
  if (!apiKey) return null;
  const prompt = buildPrompt(phrase);

  const models = workingModel ? [workingModel] : await listImageModels(apiKey);
  for (const model of models) {
    const result = await tryModel(model, prompt, apiKey);
    if (result === 'abort') return null;
    if (result === 'next') {
      if (workingModel === model) workingModel = null; // stopped working — rediscover
      continue;
    }
    workingModel = model;
    return result;
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
