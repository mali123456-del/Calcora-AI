import { getTutorLanguageCapability, isTutorLanguage } from '../ai/tutorLanguages';

export type InputStyle = 'native-script' | 'romanized' | 'mixed-script' | 'code-switched' | 'informal' | 'formal';

export interface MultilingualInputAnalysis {
  requestedLanguage: string;
  detectedLanguages: string[];
  scripts: string[];
  styles: InputStyle[];
  normalizedText: string;
  needsClarification: boolean;
}

const SCRIPT_PATTERNS: Array<[string, RegExp]> = [
  ['Arabic', /[\u0600-\u06ff]/], ['Devanagari', /[\u0900-\u097f]/], ['Bengali', /[\u0980-\u09ff]/],
  ['Gurmukhi', /[\u0a00-\u0a7f]/], ['Gujarati', /[\u0a80-\u0aff]/], ['Tamil', /[\u0b80-\u0bff]/],
  ['Telugu', /[\u0c00-\u0c7f]/], ['Kannada', /[\u0c80-\u0cff]/], ['Malayalam', /[\u0d00-\u0d7f]/],
  ['Thai', /[\u0e00-\u0e7f]/], ['Lao', /[\u0e80-\u0eff]/], ['Tibetan', /[\u0f00-\u0fff]/],
  ['Myanmar', /[\u1000-\u109f]/], ['Georgian', /[\u10a0-\u10ff]/], ['Armenian', /[\u0530-\u058f]/],
  ['Hebrew', /[\u0590-\u05ff]/], ['Cyrillic', /[\u0400-\u04ff]/], ['Greek', /[\u0370-\u03ff]/],
  ['CJK', /[\u3400-\u9fff]/], ['Hiragana/Katakana', /[\u3040-\u30ff]/], ['Hangul', /[\uac00-\ud7af]/],
];

const ROMAN_URDU = /\b(acha|achha|hai|hain|ho|hoga|karo|karna|mujhe|mujhy|tum|aap|ap|usko|isko|men|mein|kay|ke|ki|ko|se|par|yeh|yah|bhi|aur|agla|command|samjho|samjhao|batao|ker|karo|nahi|nahin)\b/i;
const ROMAN_HINDI = /\b(kya|mujhe|mujhko|tumhe|aapko|hai|hain|kaise|samjhao|batao|chahiye|karna|hoga|nahi)\b/i;
const COMMON_ENGLISH = /\b(the|and|is|are|what|how|why|please|explain|calculate|solve|show|give|make|add|feature|language|grammar|in|simple|words|equation|this|that|for|to|of|with|me|my|can|you)\b/i;

export function analyzeTutorInput(text: string, requestedLanguage?: string): MultilingualInputAnalysis {
  const input = text.trim().replace(/\s+/g, ' ');
  const scripts = SCRIPT_PATTERNS.filter(([, pattern]) => pattern.test(input)).map(([name]) => name);
  const detected = new Set<string>();
  if (/[پچژگھے]/.test(input)) detected.add('ur');
  if (/[ऀ-ॿ]/.test(input)) detected.add('hi');
  if (/[一-鿿]/.test(input)) detected.add('zh');
  if (/[぀-ヿ]/.test(input)) detected.add('ja');
  if (/[가-힯]/.test(input)) detected.add('ko');
  if (/[؀-ۿ]/.test(input) && !detected.has('ur')) detected.add('ar');
  if (/[Ѐ-ӿ]/.test(input)) detected.add('ru');
  if (ROMAN_URDU.test(input)) detected.add('ur');
  if (ROMAN_HINDI.test(input)) detected.add('hi');
  if (COMMON_ENGLISH.test(input)) detected.add('en');

  const styles: InputStyle[] = [];
  if (scripts.length) styles.push('native-script');
  if (ROMAN_URDU.test(input) || ROMAN_HINDI.test(input)) styles.push('romanized', 'informal');
  if (detected.size > 1) styles.push('code-switched');
  if (/[؀-ۿ]/.test(input) && /[A-Za-z]/.test(input)) styles.push('mixed-script');
  if (!styles.length) styles.push('formal');

  const requested = requestedLanguage && requestedLanguage !== 'auto' && isTutorLanguage(requestedLanguage)
    ? requestedLanguage
    : [...detected][0] || 'en';

  return {
    requestedLanguage: requested,
    detectedLanguages: [...detected],
    scripts,
    styles: [...new Set(styles)],
    normalizedText: input,
    needsClarification: input.length < 2,
  };
}

export function buildInputUnderstandingInstruction(analysis: MultilingualInputAnalysis): string {
  const languageNames = analysis.detectedLanguages.map(code => getTutorLanguageCapability(code).name).join(', ') || 'unknown';
  return [
    'MULTILINGUAL INPUT UNDERSTANDING:',
    `Detected language candidates: ${languageNames}`,
    `Scripts: ${analysis.scripts.join(', ') || 'Latin/unknown'}`,
    `Input styles: ${analysis.styles.join(', ')}`,
    `Preferred response language: ${getTutorLanguageCapability(analysis.requestedLanguage).name}`,
    'Interpret typos, missing punctuation, slang, abbreviations, transliteration, Roman Urdu/Roman Hindi, mixed-language sentences, code-switching, and informal phrasing from context.',
    'Do not force the user to rewrite a message merely because spelling, script, punctuation, or language is mixed.',
    'Infer intent from the complete conversation and mathematical context; ask a concise clarification only when two materially different interpretations remain.',
    'Preserve formulas, units, variables, code, URLs, identifiers, and mathematical symbols exactly unless the user asks to translate them.',
    'If the user switches language, switch naturally while preserving the active problem, learning objective, mode, and conversation state.',
  ].join('\n');
}
