import type { Language, Level, Phrase } from '../lib/types';

/**
 * ─────────────────────────────────────────────────────────────────────────
 * MOCK PHRASE DATABASE
 *
 * Hardcoded for the MVP. The shape of `Phrase` is the contract a future
 * backend / CMS should satisfy — swapping this file for an API call is the
 * only change needed. Ids are generated from position, so entries must only
 * ever be appended, never reordered or removed (ids are persistence keys).
 * ─────────────────────────────────────────────────────────────────────────
 */

type PhraseSeed = Omit<Phrase, 'id' | 'language' | 'level'>;

function definePool(language: Language, level: Level, seeds: PhraseSeed[]): Phrase[] {
  return seeds.map((seed, i) => ({
    id: `${language}-${level.toLowerCase()}-${String(i + 1).padStart(2, '0')}`,
    language,
    level,
    ...seed,
  }));
}

// ─── German ───────────────────────────────────────────────────────────────

const DE_A1: PhraseSeed[] = [
  {
    text: 'Guten Morgen! Wie geht es dir?',
    translation: 'Good morning! How are you?',
    breakdown: [
      { text: 'Guten Morgen', gloss: 'good morning', note: 'standard greeting until ~11 am' },
      { text: 'wie', gloss: 'how' },
      { text: 'geht es', gloss: 'goes it', note: 'literally "how goes it"' },
      { text: 'dir', gloss: 'to you', note: 'informal dative "you"' },
    ],
    pronunciationTips: [
      "The 'g' in \"geht\" is always hard, like in English \"go\".",
      "In everyday speech the final \"-en\" of \"Morgen\" relaxes to \"Morg'n\".",
      '"dir" rhymes with English "deer".',
    ],
  },
  {
    text: 'Ich hätte gern einen Kaffee, bitte.',
    translation: "I'd like a coffee, please.",
    breakdown: [
      { text: 'Ich hätte gern', gloss: 'I would like', note: 'the polite way to order anything' },
      { text: 'einen Kaffee', gloss: 'a coffee', note: 'accusative masculine: ein → einen' },
      { text: 'bitte', gloss: 'please' },
    ],
    pronunciationTips: [
      "The 'ch' in \"ich\" is soft — like a quiet cat hiss, never a 'k'.",
      "'ä' in \"hätte\" sounds like the 'e' in English \"bed\".",
      'Stress "Kaffee" on the first syllable: KAF-fay.',
    ],
  },
  {
    text: 'Wo ist die Toilette?',
    translation: 'Where is the toilet?',
    breakdown: [
      { text: 'wo', gloss: 'where' },
      { text: 'ist', gloss: 'is' },
      { text: 'die Toilette', gloss: 'the toilet', note: 'feminine noun' },
    ],
    pronunciationTips: [
      "German 'w' sounds like English 'v': \"vo\".",
      '"Toilette" keeps its French flavour: twa-LET-te.',
      'Pronounce the final "-e" — it never goes silent in German.',
    ],
  },
  {
    text: 'Ich heiße Anna und komme aus der Schweiz.',
    translation: 'My name is Anna and I come from Switzerland.',
    breakdown: [
      { text: 'ich heiße', gloss: 'I am called' },
      { text: 'und', gloss: 'and' },
      { text: 'komme aus', gloss: 'come from' },
      { text: 'der Schweiz', gloss: 'Switzerland', note: 'one of the few countries with an article: die Schweiz' },
    ],
    pronunciationTips: [
      "'ei' is always pronounced like English \"eye\": heiße = HIGH-sse.",
      "'ß' is just a sharp 's' sound.",
      '"Schw" = "shv" — start with "sh", glide into a "v".',
    ],
  },
  {
    text: 'Entschuldigung, sprechen Sie Englisch?',
    translation: 'Excuse me, do you speak English?',
    breakdown: [
      { text: 'Entschuldigung', gloss: 'excuse me / sorry' },
      { text: 'sprechen Sie', gloss: 'do you speak', note: 'formal "you" (Sie) with verb first = question' },
      { text: 'Englisch', gloss: 'English' },
    ],
    pronunciationTips: [
      'Stress the second syllable: ent-SCHUL-di-gung.',
      "'sp' at the start of a word becomes 'shp': \"shprechen\".",
      'Take it slowly — four clear syllables in "Entschuldigung".',
    ],
  },
  {
    text: 'Die Rechnung, bitte.',
    translation: 'The bill, please.',
    breakdown: [
      { text: 'die Rechnung', gloss: 'the bill / invoice' },
      { text: 'bitte', gloss: 'please' },
    ],
    pronunciationTips: [
      "The 'ch' in \"Rechnung\" is the soft kind — like a gentle cat hiss.",
      '"-ung" sounds like "oong", with a short u.',
      "The German 'r' at the start is gently gargled in the throat, not rolled on the tongue.",
    ],
  },
];

const DE_A2: PhraseSeed[] = [
  {
    text: 'Wie komme ich zum Bahnhof?',
    translation: 'How do I get to the train station?',
    breakdown: [
      { text: 'wie komme ich', gloss: 'how do I get' },
      { text: 'zum', gloss: 'to the', note: 'contraction of zu + dem' },
      { text: 'Bahnhof', gloss: 'train station', note: 'Bahn (rail) + Hof (yard)' },
    ],
    pronunciationTips: [
      '"Bahnhof" has a long "a": BAAHN-hohf.',
      "The 'h' after a vowel isn't spoken — it just stretches the vowel.",
      "Remember 'w' = English 'v': \"vee komme ich\".",
    ],
  },
  {
    text: 'Ich hätte gern ein Zimmer für zwei Nächte.',
    translation: "I'd like a room for two nights.",
    breakdown: [
      { text: 'ein Zimmer', gloss: 'a room' },
      { text: 'für', gloss: 'for' },
      { text: 'zwei Nächte', gloss: 'two nights', note: 'Nacht → Nächte (umlaut plural)' },
    ],
    pronunciationTips: [
      "German 'z' is 'ts': \"TSimmer\", \"tsvai\".",
      "For 'ü' in \"für\": say \"ee\" and round your lips into a small 'o'.",
      "The 'ch' in \"Nächte\" is the soft hissing kind.",
    ],
  },
  {
    text: 'Was hast du am Wochenende gemacht?',
    translation: 'What did you do on the weekend?',
    breakdown: [
      { text: 'was hast du', gloss: 'what have you' },
      { text: 'am Wochenende', gloss: 'on the weekend' },
      { text: 'gemacht', gloss: 'done', note: 'past participle of machen; jumps to the end of the sentence' },
    ],
    pronunciationTips: [
      "The 'ch' in \"gemacht\" is the hard, back-of-the-throat kind — like Scottish \"loch\".",
      'Stress the compound on the first part: WO-chen-en-de.',
      'Keep "hast du" snappy — it often blends into "haste" in fast speech.',
    ],
  },
  {
    text: 'Es tut mir leid, ich habe mich verspätet.',
    translation: "I'm sorry, I'm running late.",
    breakdown: [
      { text: 'es tut mir leid', gloss: 'I am sorry', note: 'literally "it does me sorrow"' },
      { text: 'ich habe mich verspätet', gloss: 'I have been delayed', note: 'reflexive verb: sich verspäten' },
    ],
    pronunciationTips: [
      "'ei' in \"leid\" = English \"eye\": lite.",
      "'v' in \"verspätet\" is pronounced 'f': fer-SHPAY-tet.",
      "The long 'ä' sounds close to the 'ai' in English \"fair\".",
    ],
  },
  {
    text: 'Können Sie das bitte wiederholen?',
    translation: 'Could you please repeat that?',
    breakdown: [
      { text: 'können Sie', gloss: 'can you (formal)' },
      { text: 'das', gloss: 'that' },
      { text: 'wiederholen', gloss: 'to repeat', note: 'wieder (again) + holen (fetch)' },
    ],
    pronunciationTips: [
      "For 'ö' in \"können\": say \"eh\" with rounded lips.",
      "'ie' in \"wieder\" is a long \"ee\": VEE-der.",
      'The "h" in "wiederholen" IS spoken here: vee-der-HO-len.',
    ],
  },
  {
    text: 'Das Wetter ist heute wirklich schön, oder?',
    translation: 'The weather is really nice today, right?',
    breakdown: [
      { text: 'das Wetter', gloss: 'the weather' },
      { text: 'heute', gloss: 'today' },
      { text: 'wirklich schön', gloss: 'really nice' },
      { text: 'oder?', gloss: 'right?', note: 'universal tag question, like "isn\'t it?"' },
    ],
    pronunciationTips: [
      "'eu' in \"heute\" sounds like 'oy' in \"boy\": HOY-te.",
      '"schön" = "sh" + rounded-lip "eh": shöhn.',
      "Both 'w's are English 'v's: \"Vetter\", \"virklich\".",
    ],
  },
];

const DE_B1: PhraseSeed[] = [
  {
    text: 'Meiner Meinung nach ist das eine gute Idee.',
    translation: 'In my opinion, that is a good idea.',
    breakdown: [
      { text: 'meiner Meinung nach', gloss: 'in my opinion', note: 'dative phrase; "nach" comes after the noun here' },
      { text: 'ist das', gloss: 'that is', note: 'verb stays in position 2, so subject flips' },
      { text: 'eine gute Idee', gloss: 'a good idea' },
    ],
    pronunciationTips: [
      'Both "ei" sounds are English "eye": MY-ner MY-noong.',
      '"Idee" is stressed on the last syllable: ee-DAY.',
      'Let the phrase flow as one unit — no pause before "nach".',
    ],
  },
  {
    text: 'Ich arbeite seit drei Jahren als Ingenieurin.',
    translation: 'I have been working as an engineer for three years.',
    breakdown: [
      { text: 'ich arbeite', gloss: 'I work', note: 'German uses present tense where English uses "have been working"' },
      { text: 'seit drei Jahren', gloss: 'for three years', note: 'seit + dative' },
      { text: 'als Ingenieurin', gloss: 'as an engineer (female)' },
    ],
    pronunciationTips: [
      "German 'j' is English 'y': \"YAH-ren\".",
      '"Ingenieurin" keeps a French touch: in-zhe-NYÖ-rin.',
      "'ei' in \"seit\" and \"drei\" = \"eye\".",
    ],
  },
  {
    text: 'Könnten wir den Termin auf nächste Woche verschieben?',
    translation: 'Could we move the appointment to next week?',
    breakdown: [
      { text: 'könnten wir', gloss: 'could we', note: 'Konjunktiv II of können = polite request' },
      { text: 'den Termin', gloss: 'the appointment' },
      { text: 'auf nächste Woche', gloss: 'to next week' },
      { text: 'verschieben', gloss: 'to postpone / move' },
    ],
    pronunciationTips: [
      'Stress "Termin" on the second syllable: ter-MEEN.',
      "'v' in \"verschieben\" = 'f'; 'ie' = long \"ee\": fer-SHEE-ben.",
      "Soft 'ch' in \"nächste\": NÄCH-ste, like a whispered hiss.",
    ],
  },
  {
    text: 'Einerseits stimme ich zu, andererseits habe ich Bedenken.',
    translation: 'On the one hand I agree, on the other hand I have concerns.',
    breakdown: [
      { text: 'einerseits … andererseits', gloss: 'on the one hand … on the other hand' },
      { text: 'stimme ich zu', gloss: 'I agree', note: 'separable verb: zustimmen' },
      { text: 'Bedenken', gloss: 'concerns / reservations' },
    ],
    pronunciationTips: [
      'Practice the rhythm: EIN-er-seits … AN-der-er-seits.',
      "'s' before a vowel is voiced, like English 'z': \"zeits\".",
      'Pause briefly at the comma — the contrast is the point.',
    ],
  },
  {
    text: 'Ich bin mir nicht sicher, ob das funktionieren wird.',
    translation: "I'm not sure whether that will work.",
    breakdown: [
      { text: 'ich bin mir nicht sicher', gloss: 'I am not sure', note: 'with reflexive dative "mir"' },
      { text: 'ob', gloss: 'whether', note: 'sends the verb to the end of the clause' },
      { text: 'funktionieren wird', gloss: 'will work' },
    ],
    pronunciationTips: [
      "Soft 'ch' in both \"nicht\" and \"sicher\".",
      '"funktionieren": the "-tion-" is "tsyon" — funk-tsyo-NEE-ren.',
      'Keep "ob das" short and unstressed; stress lands on funk-tsyo-NEE-ren.',
    ],
  },
  {
    text: 'Je mehr ich übe, desto besser wird mein Deutsch.',
    translation: 'The more I practice, the better my German gets.',
    breakdown: [
      { text: 'je mehr … desto besser', gloss: 'the more … the better', note: 'fixed comparative pattern' },
      { text: 'ich übe', gloss: 'I practice' },
      { text: 'wird', gloss: 'becomes' },
    ],
    pronunciationTips: [
      '"je" sounds like "yeh"; "übe" = rounded-lip "ee": ÜH-be.',
      "'eu' in \"Deutsch\" = 'oy': DOYTSH.",
      'Give "mehr" and "besser" the stress — they carry the comparison.',
    ],
  },
];

const DE_B2: PhraseSeed[] = [
  {
    text: 'Das ist mir völlig über den Kopf gewachsen.',
    translation: "That's gotten completely on top of me. (lit. grown over my head)",
    breakdown: [
      { text: 'das ist mir … gewachsen', gloss: 'it has grown … on me', note: 'idiom: über den Kopf wachsen = to become too much' },
      { text: 'völlig', gloss: 'completely' },
      { text: 'über den Kopf', gloss: 'over the head' },
    ],
    pronunciationTips: [
      "'chs' in \"gewachsen\" is pronounced 'ks': ge-VAK-sen.",
      "\"völlig\": short rounded 'ö', 'v' spoken as 'f': FÖL-lich.",
      'Stress the idiom\'s image: ÜBER den KOPF gewachsen.',
    ],
  },
  {
    text: 'Ich drücke dir die Daumen!',
    translation: "I'll keep my fingers crossed for you! (lit. I press my thumbs for you)",
    breakdown: [
      { text: 'ich drücke', gloss: 'I press' },
      { text: 'dir', gloss: 'for you', note: 'dative of advantage' },
      { text: 'die Daumen', gloss: 'the thumbs', note: 'Germans squeeze thumbs instead of crossing fingers' },
    ],
    pronunciationTips: [
      "Short rounded 'ü' in \"drücke\": DRÜ-ke.",
      "'au' in \"Daumen\" = 'ow' in \"now\": DOW-men.",
      'Say it with energy — it\'s an encouragement!',
    ],
  },
  {
    text: 'Wir sollten das Problem an der Wurzel packen.',
    translation: 'We should tackle the problem at its root.',
    breakdown: [
      { text: 'wir sollten', gloss: 'we should' },
      { text: 'an der Wurzel', gloss: 'at the root' },
      { text: 'packen', gloss: 'to grab / tackle' },
    ],
    pronunciationTips: [
      "'z' in \"Wurzel\" = 'ts': VUR-tsel.",
      'Double consonants shorten the vowel before them: "packen" has a short "a".',
      "Both 'w's are 'v's: \"vir\", \"Vurtsel\".",
    ],
  },
  {
    text: 'Es steht außer Frage, dass sich die Mühe gelohnt hat.',
    translation: 'It is beyond question that the effort was worth it.',
    breakdown: [
      { text: 'es steht außer Frage', gloss: 'it is beyond question' },
      { text: 'dass', gloss: 'that', note: 'sends the verb to the end' },
      { text: 'sich die Mühe gelohnt hat', gloss: 'the effort has paid off', note: 'sich lohnen = to be worth it' },
    ],
    pronunciationTips: [
      "'st' at the start of a word or stem is 'sht': \"shteht\".",
      '"außer" = OW-ser.',
      '"Mühe" has two syllables with a long rounded ü: MÜ-he.',
    ],
  },
  {
    text: 'Er hat mal wieder den Nagel auf den Kopf getroffen.',
    translation: 'Once again, he hit the nail on the head.',
    breakdown: [
      { text: 'mal wieder', gloss: 'once again' },
      { text: 'den Nagel auf den Kopf treffen', gloss: 'to hit the nail on the head', note: 'same idiom as in English' },
      { text: 'getroffen', gloss: 'hit', note: 'past participle of treffen' },
    ],
    pronunciationTips: [
      '"Nagel" has a long "a": NAH-gel.',
      "'w' in \"wieder\" = 'v': VEE-der.",
      'Reduce the final "-en"s to keep the sentence flowing naturally.',
    ],
  },
  {
    text: 'Auf lange Sicht zahlt sich Geduld aus.',
    translation: 'In the long run, patience pays off.',
    breakdown: [
      { text: 'auf lange Sicht', gloss: 'in the long run', note: 'literally "on long sight"' },
      { text: 'zahlt sich … aus', gloss: 'pays off', note: 'separable reflexive verb: sich auszahlen' },
      { text: 'Geduld', gloss: 'patience' },
    ],
    pronunciationTips: [
      "'z' = 'ts': \"tsahlt\".",
      "Soft 'ch' in \"Sicht\" and \"sich\".",
      'Final "d" in "Geduld" hardens to a "t": ge-DULT.',
    ],
  },
];

// ─── Spanish ──────────────────────────────────────────────────────────────

const ES_A1: PhraseSeed[] = [
  {
    text: '¡Buenos días! ¿Cómo estás?',
    translation: 'Good morning! How are you?',
    breakdown: [
      { text: 'buenos días', gloss: 'good morning', note: 'literally "good days" — always plural' },
      { text: 'cómo', gloss: 'how' },
      { text: 'estás', gloss: 'you are', note: 'informal "you" of estar' },
    ],
    pronunciationTips: [
      'Keep the vowels pure and short: BWE-nos DEE-as.',
      'The written accent marks the stress: es-TÁS.',
      "The 'd' in \"días\" is soft — tongue lightly touching the teeth.",
    ],
  },
  {
    text: 'Quisiera un café, por favor.',
    translation: 'I would like a coffee, please.',
    breakdown: [
      { text: 'quisiera', gloss: 'I would like', note: 'polite form of querer' },
      { text: 'un café', gloss: 'a coffee' },
      { text: 'por favor', gloss: 'please' },
    ],
    pronunciationTips: [
      "'qu' is just a 'k' sound: ki-SYE-ra.",
      '"café" is stressed on the last syllable: ca-FÉ.',
      "Tap the single 'r' in \"quisiera\" lightly with the tongue tip.",
    ],
  },
  {
    text: '¿Dónde está el baño?',
    translation: 'Where is the bathroom?',
    breakdown: [
      { text: 'dónde', gloss: 'where' },
      { text: 'está', gloss: 'is' },
      { text: 'el baño', gloss: 'the bathroom' },
    ],
    pronunciationTips: [
      "'ñ' is a 'ny' sound: BA-nyo, like in \"canyon\".",
      'Stress follows the accents: DÓN-de es-TÁ.',
      "The 'd' between vowels softens almost to a 'th'.",
    ],
  },
  {
    text: 'Me llamo Anna y soy de Suiza.',
    translation: 'My name is Anna and I am from Switzerland.',
    breakdown: [
      { text: 'me llamo', gloss: 'I am called', note: 'reflexive: llamarse' },
      { text: 'y', gloss: 'and' },
      { text: 'soy de', gloss: 'I am from' },
      { text: 'Suiza', gloss: 'Switzerland' },
    ],
    pronunciationTips: [
      "'ll' sounds like English 'y': YA-mo.",
      '"Suiza": in Latin America the "z" is an "s"; in Spain it\'s a soft "th".',
      '"y" (and) is just the vowel "ee".',
    ],
  },
  {
    text: 'Perdón, ¿habla usted inglés?',
    translation: 'Excuse me, do you speak English?',
    breakdown: [
      { text: 'perdón', gloss: 'excuse me / sorry' },
      { text: 'habla usted', gloss: 'do you speak', note: 'formal "you" (usted)' },
      { text: 'inglés', gloss: 'English' },
    ],
    pronunciationTips: [
      "The 'h' in \"habla\" is completely silent: AH-bla.",
      'Final-syllable stress on both accented words: per-DÓN, in-GLÉS.',
      "Tap the 'r' in \"perdón\" once, briskly.",
    ],
  },
  {
    text: 'La cuenta, por favor.',
    translation: 'The bill, please.',
    breakdown: [
      { text: 'la cuenta', gloss: 'the bill' },
      { text: 'por favor', gloss: 'please' },
    ],
    pronunciationTips: [
      "'cue' is 'kwe': KWEN-ta.",
      "Spanish 'v' in \"favor\" sounds like a soft 'b': fa-BOR.",
      'Give each syllable equal time — Spanish rhythm is even.',
    ],
  },
];

const ES_A2: PhraseSeed[] = [
  {
    text: '¿Cómo llego a la estación de tren?',
    translation: 'How do I get to the train station?',
    breakdown: [
      { text: 'cómo llego', gloss: 'how do I arrive' },
      { text: 'a la estación', gloss: 'to the station' },
      { text: 'de tren', gloss: 'of train' },
    ],
    pronunciationTips: [
      "'ll' = 'y': YE-go.",
      '"-ción" is always "syon" with final stress: es-ta-SYÓN.',
      "In \"tren\", tap the 'r' right after the 't'.",
    ],
  },
  {
    text: 'Quisiera una habitación para dos noches.',
    translation: 'I would like a room for two nights.',
    breakdown: [
      { text: 'una habitación', gloss: 'a room' },
      { text: 'para', gloss: 'for' },
      { text: 'dos noches', gloss: 'two nights' },
    ],
    pronunciationTips: [
      'Silent "h": a-bi-ta-SYÓN.',
      "'ch' in \"noches\" is the same as English \"church\": NO-ches.",
      'Link the words smoothly: "una-habitación" flows as one.',
    ],
  },
  {
    text: '¿Qué hiciste el fin de semana?',
    translation: 'What did you do on the weekend?',
    breakdown: [
      { text: 'qué', gloss: 'what' },
      { text: 'hiciste', gloss: 'you did', note: 'preterite of hacer' },
      { text: 'el fin de semana', gloss: 'the weekend', note: 'literally "the end of week"' },
    ],
    pronunciationTips: [
      'Silent "h" in "hiciste": ee-SEES-te.',
      '"qué" is a crisp "keh".',
      'Run "el-fin-de-semana" together in one breath.',
    ],
  },
  {
    text: 'Lo siento, llego tarde.',
    translation: "I'm sorry, I'm running late.",
    breakdown: [
      { text: 'lo siento', gloss: 'I am sorry', note: 'literally "I feel it"' },
      { text: 'llego tarde', gloss: 'I arrive late' },
    ],
    pronunciationTips: [
      '"siento": "sien" is one syllable — SYEN-to.',
      "'ll' = 'y': YE-go.",
      "Tap the 'r' in \"tarde\" lightly: TAR-de.",
    ],
  },
  {
    text: '¿Puede repetirlo, por favor?',
    translation: 'Could you repeat that, please?',
    breakdown: [
      { text: 'puede', gloss: 'can you (formal)' },
      { text: 'repetirlo', gloss: 'repeat it', note: 'object pronoun "lo" attaches to the infinitive' },
      { text: 'por favor', gloss: 'please' },
    ],
    pronunciationTips: [
      "'ue' is 'we': PWE-de.",
      "Each single 'r' in \"repetirlo\" is one quick tap.",
      'Stress falls on "-tir-": re-pe-TIR-lo.',
    ],
  },
  {
    text: 'Hace muy buen tiempo hoy, ¿verdad?',
    translation: 'The weather is really nice today, right?',
    breakdown: [
      { text: 'hace buen tiempo', gloss: 'the weather is nice', note: 'literally "it makes good weather"' },
      { text: 'muy', gloss: 'very' },
      { text: 'hoy', gloss: 'today' },
      { text: '¿verdad?', gloss: 'right?', note: 'universal tag question' },
    ],
    pronunciationTips: [
      'Both "h"s are silent: "AH-se", "oy".',
      "'v' in \"verdad\" sounds like a soft 'b': ber-DAD.",
      'The final "d" of "verdad" is very soft — almost a whisper.',
    ],
  },
];

const ES_B1: PhraseSeed[] = [
  {
    text: 'En mi opinión, es una buena idea.',
    translation: 'In my opinion, it is a good idea.',
    breakdown: [
      { text: 'en mi opinión', gloss: 'in my opinion' },
      { text: 'es', gloss: 'it is' },
      { text: 'una buena idea', gloss: 'a good idea' },
    ],
    pronunciationTips: [
      'Final stress on "-nión": o-pi-NYÓN.',
      'Link the vowels: "buena-idea" glides together.',
      'Keep every vowel pure — no English "uh" sounds.',
    ],
  },
  {
    text: 'Trabajo como ingeniera desde hace tres años.',
    translation: 'I have been working as an engineer for three years.',
    breakdown: [
      { text: 'trabajo', gloss: 'I work', note: 'Spanish uses present tense here' },
      { text: 'como ingeniera', gloss: 'as an engineer (female)' },
      { text: 'desde hace tres años', gloss: 'for three years', note: 'fixed pattern: desde hace + duration' },
    ],
    pronunciationTips: [
      "'j' is a breathy 'h' from the throat: tra-BA-ho.",
      "'ñ' in \"años\" = 'ny': A-nyos.",
      'Silent "h" in "hace".',
    ],
  },
  {
    text: '¿Podríamos aplazar la reunión hasta la próxima semana?',
    translation: 'Could we postpone the meeting until next week?',
    breakdown: [
      { text: 'podríamos', gloss: 'could we', note: 'conditional of poder = polite request' },
      { text: 'aplazar', gloss: 'to postpone' },
      { text: 'la reunión', gloss: 'the meeting' },
      { text: 'hasta la próxima semana', gloss: 'until next week' },
    ],
    pronunciationTips: [
      'Stress the accented "í": po-DRÍ-a-mos.',
      "'x' in \"próxima\" = 'ks': PROK-si-ma.",
      'Silent "h" in "hasta": AS-ta.',
    ],
  },
  {
    text: 'Por un lado estoy de acuerdo, por otro tengo mis dudas.',
    translation: 'On the one hand I agree, on the other I have my doubts.',
    breakdown: [
      { text: 'por un lado … por otro', gloss: 'on the one hand … on the other' },
      { text: 'estoy de acuerdo', gloss: 'I agree', note: 'literally "I am of accord"' },
      { text: 'tengo mis dudas', gloss: 'I have my doubts' },
    ],
    pronunciationTips: [
      "'cue' in \"acuerdo\" = 'kwe': a-KWER-do.",
      "The 'd's between vowels are soft, close to 'th' in \"this\".",
      'Balance the two halves evenly — the contrast is the message.',
    ],
  },
  {
    text: 'No estoy seguro de que esto vaya a funcionar.',
    translation: "I'm not sure this is going to work.",
    breakdown: [
      { text: 'no estoy seguro', gloss: 'I am not sure' },
      { text: 'de que', gloss: 'that' },
      { text: 'vaya a funcionar', gloss: 'is going to work', note: 'subjunctive "vaya" after doubt' },
    ],
    pronunciationTips: [
      "'v' in \"vaya\" is a soft 'b': BA-ya.",
      'Link "vaya a" into one long "a" sound.',
      'Even, rolling rhythm: no big stresses until fun-syo-NAR.',
    ],
  },
  {
    text: 'Cuanto más practico, mejor es mi español.',
    translation: 'The more I practice, the better my Spanish is.',
    breakdown: [
      { text: 'cuanto más … mejor', gloss: 'the more … the better', note: 'fixed comparative pattern' },
      { text: 'practico', gloss: 'I practice' },
      { text: 'mi español', gloss: 'my Spanish' },
    ],
    pronunciationTips: [
      "'j' in \"mejor\" is the breathy 'h': me-HOR.",
      '"practico" (I practice) stresses the "i": prac-TI-co.',
      "'ñ' in \"español\" = 'ny': es-pa-NYOL.",
    ],
  },
];

const ES_B2: PhraseSeed[] = [
  {
    text: 'Se me ha ido de las manos.',
    translation: "It has gotten out of hand. (lit. it has gone from my hands)",
    breakdown: [
      { text: 'se me ha ido', gloss: 'it has gone (on me)', note: 'the "me" marks who is affected' },
      { text: 'de las manos', gloss: 'from the hands' },
    ],
    pronunciationTips: [
      'Silent "h": "a-ido" flows as one word.',
      'Link the whole start: se-me-a-Í-do.',
      "Soft 'd' in \"ido\" — barely touch the teeth.",
    ],
  },
  {
    text: 'Cruzo los dedos por ti.',
    translation: "I'm crossing my fingers for you.",
    breakdown: [
      { text: 'cruzo', gloss: 'I cross' },
      { text: 'los dedos', gloss: 'the fingers' },
      { text: 'por ti', gloss: 'for you' },
    ],
    pronunciationTips: [
      "Tap the 'r' in \"cruzo\" right after the 'c': KRU-so.",
      '"z": an "s" in Latin America, a soft "th" in Spain.',
      "Both 'd's in \"dedos\" are gentle: DE-dos.",
    ],
  },
  {
    text: 'Deberíamos atajar el problema de raíz.',
    translation: 'We should tackle the problem at its root.',
    breakdown: [
      { text: 'deberíamos', gloss: 'we should' },
      { text: 'atajar', gloss: 'to cut off / tackle' },
      { text: 'de raíz', gloss: 'at the root', note: 'idiom: cortar/atajar de raíz' },
    ],
    pronunciationTips: [
      "'j' in \"atajar\" is the breathy 'h': a-ta-HAR.",
      '"raíz" has two syllables, stress on the "í": ra-ÍS.',
      "Word-initial 'r' in \"raíz\" is fully trilled: rrr.",
    ],
  },
  {
    text: 'No cabe duda de que el esfuerzo ha valido la pena.',
    translation: 'There is no doubt that the effort was worth it.',
    breakdown: [
      { text: 'no cabe duda', gloss: 'there is no doubt', note: 'literally "no doubt fits"' },
      { text: 'el esfuerzo', gloss: 'the effort' },
      { text: 'ha valido la pena', gloss: 'has been worth it', note: 'valer la pena = to be worth it' },
    ],
    pronunciationTips: [
      "'ue' in \"esfuerzo\" = 'we': es-FWER-so.",
      "'v' in \"valido\" is a soft 'b'.",
      'Link "de-que-el" into one smooth run.',
    ],
  },
  {
    text: 'Has dado en el clavo.',
    translation: 'You hit the nail on the head.',
    breakdown: [
      { text: 'has dado', gloss: 'you have hit', note: 'dar en = to hit (a target)' },
      { text: 'en el clavo', gloss: 'on the nail' },
    ],
    pronunciationTips: [
      'Silent "h" in "has": as-DA-do.',
      "The second 'd' in \"dado\" softens to almost a 'th'.",
      "'v' in \"clavo\" is a relaxed 'b': KLA-bo.",
    ],
  },
  {
    text: 'A la larga, la paciencia da sus frutos.',
    translation: 'In the long run, patience bears fruit.',
    breakdown: [
      { text: 'a la larga', gloss: 'in the long run' },
      { text: 'la paciencia', gloss: 'patience' },
      { text: 'da sus frutos', gloss: 'gives its fruits' },
    ],
    pronunciationTips: [
      '"paciencia": the "c" before "i" is an "s" (or "th" in Spain): pa-SYEN-sya.',
      "Tap the 'r' in \"larga\" once.",
      'Keep "frutos" pure: FRU-tos, no "oo-uh" glide.',
    ],
  },
];

export const PHRASES: Record<Language, Record<Level, Phrase[]>> = {
  de: {
    A1: definePool('de', 'A1', DE_A1),
    A2: definePool('de', 'A2', DE_A2),
    B1: definePool('de', 'B1', DE_B1),
    B2: definePool('de', 'B2', DE_B2),
  },
  es: {
    A1: definePool('es', 'A1', ES_A1),
    A2: definePool('es', 'A2', ES_A2),
    B1: definePool('es', 'B1', ES_B1),
    B2: definePool('es', 'B2', ES_B2),
  },
};

const BY_ID = new Map<string, Phrase>();
for (const byLevel of Object.values(PHRASES)) {
  for (const pool of Object.values(byLevel)) {
    for (const phrase of pool) BY_ID.set(phrase.id, phrase);
  }
}

export function getPhraseById(id: string): Phrase | undefined {
  return BY_ID.get(id);
}
