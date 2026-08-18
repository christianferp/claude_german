/**
 * Daily listening episodes: a short podcast script generated for the
 * learner's language and CEFR level on the day's topic.
 *
 * The pedagogical core is repetition — a small set of new words is woven
 * through the script several times each, so they stick from context rather
 * than from a list. Episodes are generated once and cached forever.
 */

import { localDateISO } from '../lib/dailyIndex';
import { LANGUAGES } from '../lib/languages';
import { topicForDate, type Topic } from '../lib/topics';
import type { Language, Level, PodcastEpisode } from '../lib/types';
import { useAppStore } from '../store/useAppStore';
import { episodeStorage } from './episodeStorage';
import { callGeminiText, GeminiError } from './gemini';

/**
 * Short sentences keep it listenable; this lands around 4–6 minutes. Kept
 * well under the 10-minute ceiling on purpose: the whole script plus its
 * translations has to come back in one response, and asking for more made
 * the model run out of output budget before finishing.
 */
const TARGET_SENTENCES = '55 to 75';
const TARGET_VOCAB = '8 to 12';
/** Each new word must recur at least this often to actually sink in. */
const MIN_REPEATS = 3;

export type PodcastErrorKind = 'no-key' | 'auth' | 'quota' | 'network' | 'malformed' | 'other';

export class PodcastError extends Error {
  kind: PodcastErrorKind;
  constructor(kind: PodcastErrorKind, message: string) {
    super(message);
    this.kind = kind;
  }
}

export function episodeId(language: Language, level: Level, dateISO: string): string {
  return `${language}-${level}-${dateISO}`;
}

function buildPrompt(languageName: string, level: Level, topic: Topic): string {
  return [
    `Write an original short podcast episode in ${languageName} for a language learner at CEFR level ${level}.`,
    `Topic: ${topic.en} — cover ${topic.angle}.`,
    '',
    'Requirements:',
    `- ${TARGET_SENTENCES} sentences. Every sentence must be SHORT (at most about 12 words) and easy to follow when heard rather than read.`,
    `- Warm, spoken, first-person presenter voice. Address the listener directly now and then, and ask them a question once or twice.`,
    `- Choose ${TARGET_VOCAB} useful new words or expressions for this level. Each one MUST appear at least ${MIN_REPEATS} times across the script, spread out and always in a natural sentence. This repetition is the point of the episode.`,
    `- Keep grammar and vocabulary strictly appropriate for ${level}. Explain a new word in simple ${languageName} the first time it appears.`,
    '- Give every sentence a natural English translation — convey the meaning, do not translate word for word.',
    '- Write entirely original content. Do not reproduce any existing podcast, article or book.',
    '',
    'Reply with JSON only, in exactly this shape:',
    '{"title": "...", "topicEn": "...", "lines": [{"de": "<sentence>", "en": "<translation>"}], "vocab": [{"term": "...", "en": "..."}]}',
    `"title" is the episode title in ${languageName}. "topicEn" is the topic in English.`,
    '"de" holds the sentence in the target language even when that language is not German.',
  ].join('\n');
}

interface RawEpisode {
  title?: string;
  topicEn?: string;
  lines?: { de?: string; en?: string }[];
  vocab?: { term?: string; en?: string }[];
}

/** Models sometimes wrap JSON in a ```json fence despite being asked not to. */
function parseEpisodeJson(text: string): RawEpisode {
  const cleaned = text
    .replace(/^\s*```(?:json)?/i, '')
    .replace(/```\s*$/, '')
    .trim();
  try {
    return JSON.parse(cleaned) as RawEpisode;
  } catch {
    // Last resort: take the outermost object if there is stray prose around it.
    const start = cleaned.indexOf('{');
    const end = cleaned.lastIndexOf('}');
    if (start === -1 || end <= start) {
      throw new PodcastError('malformed', 'The episode came back in an unreadable format.');
    }
    try {
      return JSON.parse(cleaned.slice(start, end + 1)) as RawEpisode;
    } catch {
      throw new PodcastError('malformed', 'The episode came back in an unreadable format.');
    }
  }
}

/** Generate today's episode. Callers should prefer `getEpisode`, which caches. */
async function generateEpisode(
  language: Language,
  level: Level,
  dateISO: string,
  signal?: AbortSignal,
): Promise<PodcastEpisode> {
  const apiKey = useAppStore.getState().geminiApiKey;
  if (!apiKey) throw new PodcastError('no-key', 'A Gemini API key is required.');

  const topic = topicForDate(dateISO, language, level);
  const languageName = LANGUAGES[language].name;

  let text: string;
  try {
    text = await callGeminiText(apiKey, [{ text: buildPrompt(languageName, level, topic) }], {
      json: true,
      temperature: 1,
      // The full script plus translations is a long reply, and on thinking
      // models the reasoning shares this budget — leave plenty of room.
      maxOutputTokens: 16384,
      signal,
    });
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') throw err;
    // Keep the underlying message: the UI shows it, so a failure is
    // diagnosable instead of a dead end.
    if (err instanceof GeminiError) throw new PodcastError(err.kind, err.message);
    throw new PodcastError('other', err instanceof Error ? err.message : 'Unknown error.');
  }

  const raw = parseEpisodeJson(text);
  const lines = (raw.lines ?? [])
    .map((line) => ({ de: (line.de ?? '').trim(), en: (line.en ?? '').trim() }))
    .filter((line) => line.de.length > 0);
  if (lines.length < 5) {
    throw new PodcastError('malformed', 'The episode came back too short.');
  }
  const vocab = (raw.vocab ?? [])
    .map((item) => ({ term: (item.term ?? '').trim(), en: (item.en ?? '').trim() }))
    .filter((item) => item.term.length > 0);

  // The repetition is the whole point, so surface it when the model skimps —
  // but never block an otherwise usable episode on it.
  const body = lines.map((line) => line.de).join(' ').toLowerCase();
  const thin = vocab.filter(
    (item) => body.split(item.term.toLowerCase()).length - 1 < MIN_REPEATS,
  );
  if (thin.length > 0) {
    console.warn(
      `Podcast: ${thin.length} of ${vocab.length} new words repeat fewer than ${MIN_REPEATS} times`,
      thin.map((item) => item.term),
    );
  }

  return {
    id: episodeId(language, level, dateISO),
    title: (raw.title ?? topic.en).trim(),
    topicEn: (raw.topicEn ?? topic.en).trim(),
    language,
    level,
    dateISO,
    lines,
    vocab,
  };
}

/**
 * Today's episode: from the local cache when it exists, otherwise generated
 * and cached. Only called on an explicit tap, so merely opening the tab
 * never spends generation quota.
 */
export async function getEpisode(
  language: Language,
  level: Level,
  signal?: AbortSignal,
): Promise<PodcastEpisode> {
  const dateISO = localDateISO();
  const id = episodeId(language, level, dateISO);

  const cached = await episodeStorage.get(id).catch(() => null);
  if (cached) return cached;

  const episode = await generateEpisode(language, level, dateISO, signal);
  await episodeStorage.save(episode).catch(() => {
    /* cache is best-effort — a fresh episode still plays */
  });
  return episode;
}

/** Whether today's episode is already cached (no generation needed to play). */
export async function hasCachedEpisode(language: Language, level: Level): Promise<boolean> {
  const id = episodeId(language, level, localDateISO());
  const cached = await episodeStorage.get(id).catch(() => null);
  return cached !== null;
}
