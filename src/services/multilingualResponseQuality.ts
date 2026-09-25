import type { MultilingualInputAnalysis } from './multilingualTutorInput';

export function buildMultilingualResponseQualityInstruction(
  analysis: MultilingualInputAnalysis,
  responseLanguage: string,
): string {
  return [
    'MULTILINGUAL RESPONSE QUALITY GATE:',
    `Target response language code: ${responseLanguage}`,
    `Detected input languages: ${analysis.detectedLanguages.join(', ') || 'unknown'}`,
    `Detected styles: ${analysis.styles.join(', ')}`,
    'Before responding, silently self-check language, meaning, grammar, register, and mathematical notation.',
    'Answer in the target language unless the user explicitly asks for another language or a bilingual answer.',
    'Do not translate variable names, equations, code, URLs, units, identifiers, or standard mathematical notation unless explicitly requested.',
    'For Romanized or mixed-script input, understand the meaning first and answer in the selected target language using natural native phrasing.',
    'Preserve conversational state when the user changes language, script, tone, or formality.',
    'Do not invent dialect-specific grammar. If a language or variety is uncertain, use clear standard language and state uncertainty only when it materially affects the answer.',
    'If the user message is understandable despite typos or slang, answer directly instead of asking them to rewrite it.',
    'If the request is genuinely ambiguous, ask one concise clarification in the target language.',
  ].join('\n');
}
