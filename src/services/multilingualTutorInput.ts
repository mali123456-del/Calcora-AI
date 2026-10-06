import { getTutorLanguageCapability, isTutorLanguage } from '../ai/tutorLanguages';
import { detectLanguages } from './languageDetection';

export type InputStyle = 'native-script' | 'romanized' | 'mixed-script' | 'code-switched' | 'informal' | 'formal';

export interface MultilingualInputAnalysis {
  requestedLanguage: string;
  detectedLanguages: string[];
  scripts: string[];
  styles: InputStyle[];
  normalizedText: string;
  needsClarification: boolean;
}

/**
 * Analyses a tutor message for language, script and style.
 *
 * Detection now covers scripts, diacritics, romanization and function words for
 * 40+ languages. An explicit `requestedLanguage` always wins over detection so a
 * learner can pin the response language from the UI.
 */
export function analyzeTutorInput(text: string, requestedLanguage?: string): MultilingualInputAnalysis {
  const input = text.trim().replace(/\s+/g, ' ');
  const detection = detectLanguages(input);
  const scripts = detection.scripts;
  const detected = detection.detected;

  const styles: InputStyle[] = [];
  if (scripts.length) styles.push('native-script');
  if (detection.signals.some(signal => signal.method === 'romanized')) styles.push('romanized', 'informal');
  if (detected.length > 1) styles.push('code-switched');
  if (scripts.includes('Latin') && scripts.some(script => script !== 'Latin')) styles.push('mixed-script');
  if (!styles.length) styles.push('formal');

  const requested = requestedLanguage && requestedLanguage !== 'auto' && isTutorLanguage(requestedLanguage)
    ? requestedLanguage
    : detection.primary;

  return {
    requestedLanguage: requested,
    detectedLanguages: detected,
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
