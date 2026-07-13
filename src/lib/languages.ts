import type { Language } from './types';

export interface LanguageMeta {
  code: Language;
  name: string;
  nativeName: string;
  flag: string;
  /** BCP-47 tag handed to the TTS service. */
  ttsLang: string;
  /** Short greeting shown on the onboarding language card. */
  sample: string;
}

export const LANGUAGES: Record<Language, LanguageMeta> = {
  de: {
    code: 'de',
    name: 'German',
    nativeName: 'Deutsch',
    flag: '🇩🇪',
    ttsLang: 'de-DE',
    sample: 'Guten Tag!',
  },
  es: {
    code: 'es',
    name: 'Spanish',
    nativeName: 'Español',
    flag: '🇪🇸',
    ttsLang: 'es-ES',
    sample: '¡Buenos días!',
  },
};

export const LANGUAGE_LIST: LanguageMeta[] = Object.values(LANGUAGES);
