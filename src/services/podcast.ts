/**
 * Writing a new listening episode: a short podcast script for the learner's
 * language and CEFR level on a topic they have not had yet.
 *
 * The pedagogical core is repetition — a small set of new words is woven
 * through the script several times each, so they stick from context rather
 * than from a list. Nothing here runs on its own: the shelf already has the
 * built-in episodes, so a generation only happens when the learner asks for
 * one. What comes back is stored and stays on the shelf for good.
 */

import { LANGUAGES } from '../lib/languages';
import { TOPICS, type Topic } from '../lib/topics';
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

/**
 * Unique per episode rather than per day: the shelf holds as many as the
 * learner cares to write, and each keeps its own stored audio.
 */
function newEpisodeId(language: Language, level: Level, createdISO: string): string {
  return `written-${language}-${level}-${createdISO.replace(/[^0-9A-Za-z]/g, '')}`;
}

/**
 * A topic the shelf does not already cover, so a new episode is actually
 * new. Falls back to a random one once every topic has been used.
 */
export function nextTopic(covered: string[]): Topic {
  const used = new Set(covered.map((name) => name.trim().toLowerCase()));
  const fresh = TOPICS.filter((topic) => !used.has(topic.en.toLowerCase()));
  const pool = fresh.length > 0 ? fresh : TOPICS;
  return pool[Math.floor(Math.random() * pool.length)];
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

/**
 * Write a brand new episode and keep it. `covered` is the topics already on
 * the learner's shelf, so each new episode brings a subject they have not
 * heard yet.
 */
export async function writeEpisode(
  language: Language,
  level: Level,
  covered: string[],
  signal?: AbortSignal,
): Promise<PodcastEpisode> {
  const apiKey = useAppStore.getState().geminiApiKey;
  if (!apiKey) throw new PodcastError('no-key', 'A Gemini API key is required.');

  const topic = nextTopic(covered);
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

  const createdISO = new Date().toISOString();
  const episode: PodcastEpisode = {
    id: newEpisodeId(language, level, createdISO),
    title: (raw.title ?? topic.en).trim(),
    topicEn: (raw.topicEn ?? topic.en).trim(),
    language,
    level,
    lines,
    vocab,
    createdISO,
  };

  await episodeStorage.save(episode).catch(() => {
    /* storing is best effort — the episode still plays this session */
  });
  return episode;
}
