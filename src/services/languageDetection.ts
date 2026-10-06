/**
 * Calcora AI - Multilingual Language Detection
 *
 * Deterministic, offline-safe detection for 40+ tutor languages using four
 * complementary signals, in decreasing order of certainty:
 *
 *   1. script      - Unicode block presence (e.g. Devanagari, Hangul, Cyrillic)
 *   2. diacritic   - language-diagnostic letters (e.g. Turkish "ı", Polish "ł")
 *   3. romanized   - Latin transliteration of non-Latin languages (Roman Urdu/Hindi)
 *   4. function-words - high-frequency function words for Latin-script languages
 *
 * The detector never makes network calls and is intentionally conservative:
 * when nothing matches it returns English, which mirrors the previous behaviour.
 */

export type DetectionMethod = 'script' | 'diacritic' | 'romanized' | 'function-words';

export interface LanguageSignal {
  code: string;
  method: DetectionMethod;
  /** 0..1 confidence used for ranking; the first signal wins ties. */
  weight: number;
}

export interface LanguageDetectionResult {
  /** Best candidate, or 'en' when no signal is present. */
  primary: string;
  /** Ranked language codes, de-duplicated, best first. */
  detected: string[];
  signals: LanguageSignal[];
  scripts: string[];
}

/** Unicode script probes. Latin is first so `scripts` stays backward compatible. */
export const SCRIPT_PATTERNS: ReadonlyArray<readonly [string, RegExp]> = [
  ['Latin', /[A-Za-z]/],
  ['Arabic', /[\u0600-\u06ff]/],
  ['Devanagari', /[\u0900-\u097f]/],
  ['Bengali', /[\u0980-\u09ff]/],
  ['Gurmukhi', /[\u0a00-\u0a7f]/],
  ['Gujarati', /[\u0a80-\u0aff]/],
  ['Tamil', /[\u0b80-\u0bff]/],
  ['Telugu', /[\u0c00-\u0c7f]/],
  ['Kannada', /[\u0c80-\u0cff]/],
  ['Malayalam', /[\u0d00-\u0d7f]/],
  ['Sinhala', /[\u0d80-\u0dff]/],
  ['Thai', /[\u0e00-\u0e7f]/],
  ['Lao', /[\u0e80-\u0eff]/],
  ['Tibetan', /[\u0f00-\u0fff]/],
  ['Myanmar', /[\u1000-\u109f]/],
  ['Georgian', /[\u10a0-\u10ff]/],
  ['Ethiopic', /[\u1200-\u137f]/],
  ['Armenian', /[\u0530-\u058f]/],
  ['Hebrew', /[\u0590-\u05ff]/],
  ['Cyrillic', /[\u0400-\u04ff]/],
  ['Greek', /[\u0370-\u03ff]/],
  ['CJK', /[\u3400-\u9fff]/],
  ['Hiragana/Katakana', /[\u3040-\u30ff]/],
  ['Hangul', /[\uac00-\ud7af]/],
];

/** Roman Urdu cue words (Romanized input is very common for Urdu/Hindi). */
export const ROMAN_URDU =
  /(?<![\p{L}\p{M}])(acha|achha|mujhe|mujhy|samjho|samjhao|batao|bataiye|karo|karna|kyun|kyunki|kaise|nahi|nahin|hain|hoga|thoda|yeh|bhi|aap|tum|aur|bhai|yar|wala|matlab)(?![\p{L}\p{M}])/iu;

/** Roman Hindi cue words. */
export const ROMAN_HINDI =
  /(?<![\p{L}\p{M}])(kya|mujhe|mujhko|tumhe|aapko|kaise|samjhao|samjho|batao|bataiye|chahiye|karna|hoga|nahi|nahin|bhai|karo|kyun|thoda)(?![\p{L}\p{M}])/iu;

/** High-precision English function words. */
export const COMMON_ENGLISH =
  /(?<![\p{L}\p{M}])(the|and|are|what|how|why|please|explain|calculate|solve|show|give|make|feature|language|grammar|simple|words|equation|this|that|with|you|your|does|find|help|from|about|between)(?![\p{L}\p{M}])/iu;

const URDU_MARKERS = /[\u0679\u0688\u0691\u06ba\u06be\u06d2]/; // ٹ ڈ ڑ ں ھ ے
const PERSIAN_MARKERS = /[\u067e\u0686\u0698\u06af]/; // پ چ ژ گ
const PERSIAN_WORDS = /(^|\s)(است|را|که|از|این|نیست|می|شما|چرا|چگونه)(\s|$)/;
const MARATHI_MARKERS = /\u0933/; // ळ
const NEPALI_WORDS = /(^|\s)(छ|छन्|गर्नु|किन|कसरी|हो|हुन्)(\s|$)/;
const ASSAMESE_MARKERS = /[\u09f0\u09f1]/; // ৰ ৱ
const UKRAINIAN_MARKERS = /[\u0456\u0457\u0454\u0491]/; // і ї є ґ
const SERBIAN_MARKERS = /[\u0452\u0458\u0459\u045a\u045b\u045f]/; // ђ ј љ њ ћ џ
const MACEDONIAN_MARKERS = /[\u0453\u045c\u0455]/; // ѓ ќ ѕ
const KAZAKH_MARKERS = /[\u04d9\u0493\u049b\u04a3\u04bb]/; // ә ғ қ ң һ
const KYRGYZ_MARKERS = /[\u04a3\u04a9\u04af\u04e9]/; // ң ө ү
const TAJIK_MARKERS = /[\u04e3\u04ef\u04b3\u04b7]/; // ӣ ӯ ҳ ҷ
const YIDDISH_MARKERS = /[\u05f0\u05f1\u05f2]/; // װ ױ ײ

const sig = (code: string, method: DetectionMethod, weight: number): LanguageSignal => ({ code, method, weight });

/** Script-driven candidates with lightweight disambiguation inside shared scripts. */
function scriptSignals(text: string, scripts: readonly string[]): LanguageSignal[] {
  const has = (name: string) => scripts.includes(name);
  const out: LanguageSignal[] = [];

  if (has('Hiragana/Katakana')) out.push(sig('ja', 'script', 1));
  if (has('Hangul')) out.push(sig('ko', 'script', 1));
  if (has('CJK') && !has('Hiragana/Katakana')) out.push(sig('zh', 'script', 1));

  if (has('Arabic')) {
    if (URDU_MARKERS.test(text)) out.push(sig('ur', 'script', 1));
    else if (PERSIAN_WORDS.test(text)) out.push(sig('fa', 'script', 0.9));
    else if (PERSIAN_MARKERS.test(text)) out.push(sig('fa', 'script', 0.55), sig('ur', 'script', 0.45));
    else if (/[\u0629\u0649\u0624\u0626]/.test(text)) out.push(sig('ar', 'script', 0.9));
    else out.push(sig('ar', 'script', 0.6), sig('ur', 'script', 0.3));
  }

  if (has('Devanagari')) {
    if (MARATHI_MARKERS.test(text)) out.push(sig('mr', 'script', 0.85), sig('hi', 'script', 0.4));
    else if (NEPALI_WORDS.test(text)) out.push(sig('ne', 'script', 0.75), sig('hi', 'script', 0.4));
    else out.push(sig('hi', 'script', 0.85), sig('mr', 'script', 0.2));
    if (has('Latin')) out.push(sig('en', 'script', 0.3));
  }

  if (has('Bengali')) {
    if (ASSAMESE_MARKERS.test(text)) out.push(sig('as', 'script', 0.85), sig('bn', 'script', 0.4));
    else out.push(sig('bn', 'script', 0.9));
  }

  if (has('Gurmukhi')) out.push(sig('pa', 'script', 1));
  if (has('Gujarati')) out.push(sig('gu', 'script', 1));
  if (has('Tamil')) out.push(sig('ta', 'script', 1));
  if (has('Telugu')) out.push(sig('te', 'script', 1));
  if (has('Kannada')) out.push(sig('kn', 'script', 1));
  if (has('Malayalam')) out.push(sig('ml', 'script', 1));
  if (has('Sinhala')) out.push(sig('si', 'script', 1));
  if (has('Thai')) out.push(sig('th', 'script', 1));
  if (has('Lao')) out.push(sig('lo', 'script', 1));
  if (has('Tibetan')) out.push(sig('bo', 'script', 1));
  if (has('Myanmar')) out.push(sig('my', 'script', 1));
  if (has('Georgian')) out.push(sig('ka', 'script', 1));
  if (has('Ethiopic')) out.push(sig('am', 'script', 1));
  if (has('Armenian')) out.push(sig('hy', 'script', 1));
  if (has('Greek')) out.push(sig('el', 'script', 1));
  if (has('Hebrew')) {
    if (YIDDISH_MARKERS.test(text)) out.push(sig('yi', 'script', 0.9), sig('he', 'script', 0.3));
    else out.push(sig('he', 'script', 0.9));
  }

  if (has('Cyrillic')) {
    if (UKRAINIAN_MARKERS.test(text)) out.push(sig('uk', 'script', 0.9), sig('ru', 'script', 0.3));
    else if (SERBIAN_MARKERS.test(text)) out.push(sig('sr', 'script', 0.9));
    else if (MACEDONIAN_MARKERS.test(text)) out.push(sig('mk', 'script', 0.85));
    else if (KAZAKH_MARKERS.test(text)) out.push(sig('kk', 'script', 0.85));
    else if (KYRGYZ_MARKERS.test(text)) out.push(sig('ky', 'script', 0.7), sig('kk', 'script', 0.4));
    else if (TAJIK_MARKERS.test(text)) out.push(sig('tg', 'script', 0.85));
    else if (/\u0449/.test(text) && !/[\u044b\u044d]/.test(text)) out.push(sig('bg', 'script', 0.75), sig('ru', 'script', 0.4));
    else out.push(sig('ru', 'script', 0.9));
    if (has('Latin')) out.push(sig('en', 'script', 0.3));
  }

  return out;
}

/** Letters that are close to diagnostic for a specific Latin-script language. */
const DIACRITIC_SIGNALS: ReadonlyArray<readonly [string, RegExp]> = [
  ['tr', /[\u0131\u011f\u015f]/], // ı ğ ş
  ['vi', /[\u0103\u0111\u01a1\u01b0\u1ea1\u1ebf\u1ec7]/], // ă đ ơ ư ạ ế ệ
  ['pl', /[\u0142\u0105\u0119\u015b\u017c\u017a\u0107\u0144]/], // ł ą ę ś ż ź ć ń
  ['cs', /[\u0159\u011b\u016f\u0165\u010f\u0148]/], // ř ě ů ť ď ň
  ['sk', /[\u013e\u013a\u0155]/], // ľ ĺ ŕ
  ['ro', /[\u0219\u021b]/], // ș ț
  ['hu', /[\u0151\u0171]/], // ő ű
  ['is', /[\u00fe\u00f0]/], // þ ð
  // German owns ä/ü/ö/ß; treating them as Swedish made "erklären" detect as Swedish.
  ['de', /[\u00e4\u00f6\u00fc\u00df]/], // ä ö ü ß
  ['es', /[\u00f1\u00bf\u00a1]/], // ñ ¿ ¡
  ['pt', /[\u00e3\u00f5]/], // ã õ
  ['fr', /[\u0153]/], // œ
  ['da', /[\u00e6\u00f8\u00e5]/], // æ ø å
  ['sv', /[\u00e5\u00f6]/], // å ö (ä and ü are shared with German and excluded here)
];

/** Function words for Latin-script languages, matched token-wise. */
const LATIN_FUNCTION_WORDS: ReadonlyArray<readonly [string, readonly string[]]> = [
  ['es', ['el', 'la', 'los', 'las', 'que', 'por', 'para', 'con', 'una', 'un', 'como', 'qué', 'cómo', 'explica', 'resuelve', 'gracias', 'hola', 'favor', 'son', 'está', 'puedes', 'derivada', 'ecuación']],
  ['pt', ['os', 'as', 'que', 'para', 'com', 'uma', 'um', 'como', 'obrigado', 'você', 'não', 'está', 'pode', 'resolva', 'explique', 'equação']],
  ['fr', ['le', 'la', 'les', 'des', 'que', 'pour', 'avec', 'une', 'un', 'comment', 'pourquoi', 'vous', 'merci', 'est', 'sont', 'peut', 'explique', 'résoudre', 'équation']],
  ['it', ['il', 'lo', 'gli', 'le', 'di', 'che', 'per', 'con', 'una', 'un', 'come', 'perché', 'grazie', 'sono', 'puoi', 'spiega', 'equazione']],
  ['de', ['der', 'die', 'das', 'und', 'ist', 'mit', 'für', 'wie', 'warum', 'bitte', 'danke', 'eine', 'ein', 'nicht', 'ich', 'sind', 'kann', 'erkläre', 'erklären', 'erklärt', 'löse', 'lösen', 'gleichung', 'vom', 'mir', 'was', 'sag', 'zeig', 'grund', 'kannst', 'helfen', 'lösung', 'variable', 'beispiel']],
  ['nl', ['het', 'een', 'van', 'en', 'zijn', 'met', 'voor', 'hoe', 'waarom', 'alstublieft', 'dank', 'ik', 'je', 'niet', 'kun', 'leg', 'vergelijking']],
  ['pl', ['się', 'nie', 'jest', 'jak', 'dlaczego', 'dziękuję', 'proszę', 'że', 'to', 'oraz', 'możesz', 'wyjaśnij', 'równanie']],
  ['cs', ['se', 'není', 'jak', 'proč', 'děkuji', 'prosím', 'že', 'to', 'ale', 'můžeš', 'vysvětli', 'rovnice']],
  ['sk', ['sa', 'nie', 'ako', 'prečo', 'ďakujem', 'prosím', 'že', 'to', 'ale', 'môžeš', 'vysvetli', 'rovnica']],
  ['ro', ['și', 'în', 'este', 'cum', 'mulțumesc', 'nu', 'sunt', 'poți', 'explică', 'ecuație']],
  ['hu', ['és', 'hogy', 'nem', 'van', 'mit', 'hogyan', 'miért', 'kérem', 'köszönöm', 'tudsz', 'egyenlet']],
  ['tr', ['ve', 'bir', 'bu', 'nasıl', 'neden', 'lütfen', 'teşekkür', 'için', 'değil', 'çöz', 'açıkla', 'denklem', 'ne', 'nedir', 'ile', 'çok', 'şey', 'matematik', 'değişken', 'denklemi', 'bana']],
  ['id', ['dan', 'yang', 'dari', 'adalah', 'apa', 'bagaimana', 'mengapa', 'tolong', 'tidak', 'bisa', 'jelaskan', 'persamaan', 'terima', 'kasih']],
  ['ms', ['dan', 'yang', 'ialah', 'apa', 'bagaimana', 'mengapa', 'tolong', 'tidak', 'boleh', 'jelaskan', 'persamaan', 'terima', 'kasih']],
  ['sw', ['na', 'ya', 'wa', 'ni', 'kwa', 'katika', 'nini', 'jinsi', 'tafadhali', 'asante', 'unaweza', 'eleza']],
  ['vi', ['và', 'của', 'là', 'không', 'gì', 'như', 'sao', 'xin', 'cảm', 'ơn', 'một', 'bạn', 'giải']],
  ['af', ['die', 'van', 'nie', 'hoe', 'hoekom', 'asseblief', 'dankie', 'ek', 'kan', 'verduidelik']],
  ['da', ['og', 'det', 'en', 'ikke', 'hvordan', 'hvorfor', 'tak', 'venligst', 'forklar']],
  ['no', ['og', 'det', 'en', 'ikke', 'hvordan', 'hvorfor', 'takk', 'vennligst', 'forklar']],
  ['sv', ['och', 'det', 'att', 'inte', 'hur', 'varför', 'tack', 'snälla', 'förklara']],
  ['fi', ['ja', 'on', 'ei', 'että', 'miten', 'miksi', 'kiitos', 'voit', 'selitä']],
];

const WORD_RE = /[\p{L}\p{M}]+/gu;

function functionWordSignals(text: string): LanguageSignal[] {
  const tokens = new Set((text.toLowerCase().match(WORD_RE) ?? []));
  if (!tokens.size) return [];
  const out: LanguageSignal[] = [];
  for (const [code, words] of LATIN_FUNCTION_WORDS) {
    let matches = 0;
    for (const word of words) if (tokens.has(word)) matches += 1;
    if (matches > 0) out.push(sig(code, 'function-words', Math.min(matches / 2, 1) * 0.95));
  }
  // Best-supported language first so the highest-confidence candidate wins.
  return out.sort((a, b) => b.weight - a.weight);
}

/**
 * Detects the most likely language(s) for a piece of text.
 * Always returns at least one candidate; defaults to English.
 */
export function detectLanguages(text: string): LanguageDetectionResult {
  const input = (text ?? '').trim();
  const scripts = SCRIPT_PATTERNS.filter(([, pattern]) => pattern.test(input)).map(([name]) => name);
  const signals: LanguageSignal[] = [];
  const add = (signal: LanguageSignal) => {
    const existingIndex = signals.findIndex(existing => existing.code === signal.code);
    if (existingIndex < 0) {
      signals.push(signal);
    } else if (signal.weight > signals[existingIndex].weight) {
      signals[existingIndex] = signal;
    }
  };

  for (const s of scriptSignals(input, scripts)) add(s);

  if (scripts.includes('Latin')) {
    if (ROMAN_URDU.test(input)) add(sig('ur', 'romanized', 0.7));
    if (ROMAN_HINDI.test(input)) add(sig('hi', 'romanized', 0.65));
    for (const [code, pattern] of DIACRITIC_SIGNALS) if (pattern.test(input)) add(sig(code, 'diacritic', 0.6));
    // A single diacritic is weak evidence; several matching function words are stronger,
    // so function words are ranked above bare diacritics below.
    for (const s of functionWordSignals(input)) add(s);
    if (COMMON_ENGLISH.test(input)) add(sig('en', 'function-words', 0.5));
  }

  signals.sort((a, b) => b.weight - a.weight);
  const detected = signals.map(s => s.code);
  return { primary: detected[0] ?? 'en', detected, signals, scripts };
}

/**
 * Convenience helper for callers that only need the single best language code.
 */
export function detectLanguage(text: string): string {
  return detectLanguages(text).primary;
}
