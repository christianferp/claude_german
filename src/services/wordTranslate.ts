/**
 * A one-word (or short-phrase) translation for a word tapped in a podcast
 * transcript. This is the last resort behind the two free sources in
 * `PodcastScreen`'s `toggleWord`: an episode glossary match, then the
 * sentence's own translation. Only reached when neither has an answer.
 */

import { LANGUAGES } from '../lib/languages';
import type { Language } from '../lib/types';
import { callGeminiText, GeminiError } from './gemini';

/**
 * Best-effort meaning of `word` as used in `sentence`. Returns '' rather
 * than throwing on any failure — a saved word with no translation yet is a
 * fine outcome; a tap that hangs or errors is not.
 */
export async function translateWord(
  apiKey: string,
  word: string,
  sentence: string,
  language: Language,
  signal?: AbortSignal,
): Promise<string> {
  const languageName = LANGUAGES[language].name;
  const prompt = [
    `Give the short English meaning of the ${languageName} word or phrase "${word}"`,
    `as it is used in this sentence: "${sentence}".`,
    'Reply with only the translation — a single word or short phrase, no punctuation, no explanation.',
  ].join(' ');

  try {
    const text = await callGeminiText(apiKey, [{ text: prompt }], {
      temperature: 0,
      maxOutputTokens: 32,
      signal,
    });
    return text.trim().replace(/^["'.]+|["'.]+$/g, '');
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') throw err;
    if (err instanceof GeminiError) return '';
    return '';
  }
}
